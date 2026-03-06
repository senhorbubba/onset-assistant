import { google } from 'googleapis';

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set');
  }
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

export interface SheetRow {
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
  link?: string;
}

export async function fetchSheetData(spreadsheetId: string, sheetName?: string): Promise<SheetRow[]> {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h: string) => h.toLowerCase().trim());

  const topicIdx = headers.findIndex((h: string) => h.includes('topic'));
  const questionIdx = headers.findIndex((h: string) => h.includes('subtopic') || h.includes('question'));
  const answerIdx = headers.findIndex((h: string) => h.includes('key takeaway') || h.includes('answer'));
  const contextIdx = headers.findIndex((h: string) => h.includes('search context') || h.includes('transcription'));
  const keywordsIdx = headers.findIndex((h: string) => h.includes('keyword') || h.includes('tag'));
  const linkIdx = headers.findIndex((h: string) => h.includes('final timestamp link') || h.includes('link') || h.includes('url'));
  const expertIdx = headers.findIndex((h: string) => h.includes('expert') || h.includes('source'));

  if (topicIdx === -1) {
    console.error('Sheet headers found:', headers);
    throw new Error('Sheet must have a Topic column. Found: ' + headers.join(', '));
  }
  if (questionIdx === -1) {
    console.error('Sheet headers found:', headers);
    throw new Error('Sheet must have a Subtopic/Question column. Found: ' + headers.join(', '));
  }

  const data: SheetRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const topic = row[topicIdx]?.trim();
    const question = row[questionIdx]?.trim();

    if (!topic || !question) continue;

    let answer = '';
    if (answerIdx !== -1 && row[answerIdx]?.trim()) {
      answer = row[answerIdx].trim();
    } else if (contextIdx !== -1 && row[contextIdx]?.trim()) {
      answer = row[contextIdx].trim();
    }

    if (!answer) continue;

    if (expertIdx !== -1 && row[expertIdx]?.trim()) {
      answer += `\n\nSource: ${row[expertIdx].trim()}`;
    }

    const keywords = keywordsIdx !== -1 && row[keywordsIdx]
      ? row[keywordsIdx].split(',').map((k: string) => k.trim()).filter(Boolean)
      : [];

    const link = linkIdx !== -1 ? row[linkIdx]?.trim() : undefined;

    data.push({ topic, question, answer, keywords, link });
  }

  return data;
}

export async function syncFromSheet(): Promise<SheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }
  const sheetName = (process.env.GOOGLE_SHEET_NAME || 'Learning_units').trim();
  return fetchSheetData(spreadsheetId, sheetName);
}
