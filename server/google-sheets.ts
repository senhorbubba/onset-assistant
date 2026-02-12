import { google } from 'googleapis';

// Google Sheets connector integration
let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function findSpreadsheetByName(name: string): Promise<string | null> {
  const drive = await getDriveClient();
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet'`,
    fields: 'files(id, name)',
  });
  const files = res.data.files;
  if (files && files.length > 0) {
    return files[0].id!;
  }
  return null;
}

export interface SheetRow {
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
  link?: string;
}

export async function fetchSheetData(spreadsheetId: string, sheetName?: string): Promise<SheetRow[]> {
  const sheets = await getUncachableGoogleSheetClient();
  
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

const SPREADSHEET_ID = '1jcYao1JlaWnaejoPYKiXK3YnBLqxGbQzH41HTdS5_8g';

export async function syncFromSheet(): Promise<SheetRow[]> {
  return fetchSheetData(SPREADSHEET_ID);
}
