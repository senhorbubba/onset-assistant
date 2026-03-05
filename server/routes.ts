import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import nodemailer from "nodemailer";
import type { Content, UserProfile, TopicExperience } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "onset.devs@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmailNotification(email: string, question: string, response: string, topic: string): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log(`[Email Notification] Skipped (no GMAIL_APP_PASSWORD configured) | To: ${email}`);
    return;
  }

  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  const productionDomain = domains.find(d => d.endsWith(".replit.app") || !d.includes(".replit.dev"));
  const appUrl = productionDomain
    ? `https://${productionDomain}`
    : domains[0]
      ? `https://${domains[0]}`
      : "https://onset-assistant.replit.app";

  await emailTransporter.sendMail({
    from: '"onset. Assistant" <onset.devs@gmail.com>',
    to: email,
    subject: `Your question about ${topic} has been answered`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">onset. Assistant</h2>
        <p style="color: #555;">Your question has been answered by our team:</p>
        <div style="background: #f5f5f5; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #333;">Your question (${topic}):</p>
          <p style="margin: 8px 0 0; color: #555;">${question}</p>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #333;">Response:</p>
          <p style="margin: 8px 0 0; color: #555;">${response}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Open onset. Assistant</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">You received this email because you asked a question on onset. Assistant. You can disable email notifications in your profile settings.</p>
      </div>
    `,
  });

  console.log(`[Email Notification] Sent to: ${email} | Topic: ${topic}`);
}

const profileLabels: Record<string, Record<string, string>> = {
  role: { manager: "Manager / Team Lead", executive: "Executive / Director", entrepreneur: "Entrepreneur / Founder", consultant: "Consultant / Advisor", specialist: "Specialist / Analyst", creative: "Creative Professional", educator: "Educator / Trainer", student: "Student / Learner", other: "Other" },
  industry: { technology: "Technology / IT", healthcare: "Healthcare / Pharma", finance: "Finance / Banking", education: "Education / Training", marketing: "Marketing / Advertising", retail: "Retail / E-commerce", manufacturing: "Manufacturing / Engineering", media: "Media / Entertainment", consulting: "Consulting / Professional Services", nonprofit: "Non-profit / Government", other: "Other" },
  goal: { ai_basics: "Understand AI fundamentals", ai_productivity: "Use AI to boost productivity", communication: "Improve communication skills", leadership: "Develop leadership abilities", career_growth: "Accelerate career growth", team_management: "Better team management", innovation: "Drive innovation", stay_current: "Stay current with trends" },
  challenge: { time: "Finding time to learn", overwhelm: "Too much information", practical: "Turning knowledge into practice", keeping_up: "Keeping up with rapid changes", confidence: "Building confidence in new skills", team_adoption: "Getting team to adopt new approaches", measuring: "Measuring progress and impact", starting: "Not sure where to start" },
};

function getProfileLabel(field: string, key: string): string {
  return profileLabels[field]?.[key] || key || "Not specified";
}

const jsonItemSchema = z.object({
  Unit_ID: z.string().optional(),
  Topic: z.string(),
  Subtopic: z.string(),
  Search_Context: z.string().optional(),
  Keywords: z.string().optional(),
  Key_Takeaway: z.string().optional(),
  Difficulty: z.string().optional(),
  Use_Case: z.string().optional(),
  Timestamp_Link: z.string().optional(),
});

interface ConversationMessage {
  role: "user" | "bot";
  content: string;
}

async function findBestAnswer(
  topic: string,
  question: string,
  language: string = "en",
  profile?: UserProfile | null,
  topicExp?: TopicExperience | null,
  history?: ConversationMessage[]
): Promise<{ answer: string; found: boolean; link?: string }> {
  const contentItems = await storage.getContentByTopic(topic);

  const isPt = language === "pt-BR";
  if (contentItems.length === 0) {
    return { answer: isPt 
      ? "Ainda não há conteúdo disponível para este tópico. Por favor, tente novamente mais tarde." 
      : "There is no content available for this topic yet. Please try again later.", found: false };
  }

  const contentContext = contentItems.map((item, i) => {
    let entry = `[${i}] Subtopic: ${item.subtopic}`;
    if (item.keywords) entry += `\nKeywords: ${item.keywords}`;
    if (item.searchContext) entry += `\nContext: ${item.searchContext}`;
    if (item.keyTakeaway) entry += `\nKey Takeaway: ${item.keyTakeaway}`;
    if (item.difficulty) entry += `\nDifficulty: ${item.difficulty}`;
    if (item.useCase) entry += `\nUse Case: ${item.useCase}`;
    return entry;
  }).join('\n\n');

  const subtopicList = contentItems.map((item) =>
    `• ${item.subtopic}${item.difficulty ? ` (${item.difficulty})` : ''}`
  ).join('\n');

  try {
    const profileContext = profile && profile.completedOnboarding ? `
User: ${getProfileLabel('role', profile.role || '')} in ${getProfileLabel('industry', profile.industry || '')}. Experience: ${topicExp?.experience || 'unknown'}. Preference: ${profile.learningPreference === 'quick_tips' ? 'brief tips' : profile.learningPreference === 'step_by_step' ? 'step-by-step' : profile.learningPreference === 'examples' ? 'real-world examples' : 'general'}.` : '';

    // PHASE 1: Classify intent and find matching entry using lightweight prompt
    const classifyPrompt = `You are a learning coach for "${topic}". You have ${contentItems.length} learning entries available.

Given the user's message and conversation history, respond with ONE of these:
- MATCH:[number] — if the question specifically relates to one of the entries below. Use the entry number.
- OVERVIEW — if the user asks what content is available, what you know, what's in the knowledge base, what topics/categories you cover, or wants to see everything (e.g. "what do you know?", "what do you have?", "show me what's available", "what can you teach me?", "what topics do you cover?").
- EXPLORE — if the question is general, broad, or the user is exploring a direction (e.g. "help me improve", "I want to be better at...", "tell me about feedback"). Also use EXPLORE for greetings ("hi", "hello", "hey"), social messages ("thank you", "thanks", "ok"), or short follow-ups ("yes", "tell me more", "go on", "sure") — these are conversational and should be handled warmly.
- PLAN — if the user explicitly asks for a learning plan, a structured path, or a full overview of learning steps with links.
- OFF_TOPIC — if the message is about a completely different subject unrelated to "${topic}" (e.g. cooking, sports, math), OR if it's a navigation command (e.g. "exit", "quit", "stop", "close", "leave"), OR if it's nonsense, jokes, random words, insults, or inappropriate language.
- NOT_FOUND — if it's specifically about "${topic}" but no entry in the knowledge base covers it.

CRITICAL — CONTEXT AWARENESS:
- ALWAYS read the conversation history carefully. The user's message is a REPLY to the previous bot message.
- If the bot previously listed topics/options (e.g. "1. Feedback, 2. Active Listening, 3. Conflict Resolution") and the user says "let's start with the first one", "tell me about number 2", "the second one", "yes, that one", or similar — look at what the bot suggested and resolve the reference. Then classify as MATCH if it maps to a specific entry, or EXPLORE if it maps to a broad area.
- References like "first", "second", "that one", "this", "it", "the one you mentioned" ALWAYS refer to something in the conversation history. NEVER classify these as NOT_FOUND or OFF_TOPIC.
- When in doubt between EXPLORE and OFF_TOPIC, choose EXPLORE. Greetings, thank-yous, and conversational follow-ups are NEVER off-topic.
- When in doubt between MATCH and EXPLORE for a contextual reference, choose EXPLORE (the EXPLORE handler has full conversation history to resolve it).
- The entries may be in a different language than the user's question. Match by MEANING, not literal text. For example, "active listening" matches "escuta ativa", "feedback" matches "feedback", "assertive communication" matches "comunicação assertiva".
- If the user asks about a broad area that maps to MULTIPLE entries (e.g. "What is active listening?" maps to several listening entries), use EXPLORE rather than MATCH.

Respond with ONLY the classification tag, nothing else.
${isPt ? 'The user may write in Portuguese.' : ''}

ENTRIES:
${contentItems.map((item, i) => `[${i}] ${item.subtopic} | Keywords: ${item.keywords || 'none'} | Context: ${item.searchContext || 'none'}`).join('\n')}`;

    const classifyMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: classifyPrompt }
    ];

    if (history && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        classifyMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }
    classifyMessages.push({ role: "user", content: question });

    const classifyResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: classifyMessages,
      max_completion_tokens: 50,
    });

    const classification = classifyResponse.choices[0]?.message?.content?.trim() || "";

    // PHASE 2: Generate response based on classification
    const matchResult = classification.match(/MATCH:\[?(\d+)\]?/);

    const userLang = isPt ? "Brazilian Portuguese" : "English";

    if (matchResult) {
      const matchedIdx = parseInt(matchResult[1], 10);
      if (matchedIdx >= 0 && matchedIdx < contentItems.length) {
        const entry = contentItems[matchedIdx];
        const entryLooksPortuguese = /[àáâãéêíóôõúç]/i.test(entry.subtopic || '') || /[àáâãéêíóôõúç]/i.test(entry.searchContext || '');
        const entryLang = entryLooksPortuguese ? "Portuguese" : "English";
        const langMismatch = (isPt && !entryLooksPortuguese) || (!isPt && entryLooksPortuguese);
        const linkLangNote = langMismatch && entry.timestampLink
          ? `\nIMPORTANT: The linked video/resource is in ${entryLang}. Mention this to the user naturally (e.g., "The video for this topic is in ${entryLang}").`
          : '';

        const relatedSubtopics = contentItems
          .filter((_, i) => i !== matchedIdx)
          .filter(item => {
            const entryKeywords = (entry.keywords || '').toLowerCase().split(',').map(k => k.trim());
            const itemKeywords = (item.keywords || '').toLowerCase().split(',').map(k => k.trim());
            return entryKeywords.some(k => k && itemKeywords.includes(k));
          })
          .slice(0, 5)
          .map(item => `• ${item.subtopic} (${item.difficulty || 'General'})`)
          .join('\n');

        const fallbackRelated = relatedSubtopics || contentItems
          .filter((_, i) => i !== matchedIdx)
          .slice(0, 3)
          .map(item => `• ${item.subtopic} (${item.difficulty || 'General'})`)
          .join('\n');

        const answerPrompt = `You are "onset. Assistant", a friendly learning coach. Answer the user's question using the information from this knowledge base entry. Be concise and natural. One key insight.

CONTEXT AWARENESS (CRITICAL): Read the conversation history carefully. The user's current message is a continuation of an ongoing conversation. Connect your answer to what was discussed before — reference previous topics, acknowledge the user's learning journey, and make the response feel like a natural progression of the conversation. If the user asked about a topic that was previously suggested by you, acknowledge that.

LANGUAGE RULE (MANDATORY): Your ENTIRE response MUST be in ${userLang}. Every single word, including topic names, subtopic suggestions, section headers, and follow-up questions. If the knowledge base data below is in a different language, translate EVERYTHING — never leave any word in the original language. This applies to the answer, the suggested topics, and any other text you produce.

RESPONSE STYLE (CRITICAL):
- Do NOT repeat, copy, or paraphrase the "Source Notes" text below. It is internal reference material ONLY.
- NEVER use pipe characters (|) to separate ideas. Write in natural flowing sentences and paragraphs.
- NEVER bold the subtopic title and dump notes below it. That is NOT a valid response format.
- Instead, write as a coach would speak: address the user's question directly, weave in ONE key insight from the source notes, and connect it to the conversation context.
- Keep it concise (3-5 sentences for the main answer) and conversational.${linkLangNote}
After your answer, add a brief "Want to keep learning?" section suggesting 2-3 related topics from the list below. You MUST translate every topic name to ${userLang}. Keep suggestions short — just the translated topic names, not full explanations.
${profileContext}

Topic area: ${entry.subtopic}
Context: ${entry.searchContext || ''}
Source Notes (INTERNAL ONLY — do not copy or expose this text to the user): ${entry.keyTakeaway || ''}
Difficulty: ${entry.difficulty || ''}
Use Case: ${entry.useCase || ''}

Related topics to suggest:
${fallbackRelated}`;

        const answerMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: answerPrompt }
        ];
        if (history && history.length > 0) {
          for (const msg of history.slice(-6)) {
            answerMessages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
          }
        }
        answerMessages.push({ role: "user", content: question });

        const answerResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: answerMessages,
          max_completion_tokens: 800,
        });

        const rawAnswer = answerResponse.choices[0]?.message?.content?.trim() || "";
        const answer = rawAnswer || `I found information about "${entry.subtopic}" in our knowledge base. Would you like me to explain this topic in more detail?`;
        return { answer, found: true, link: entry.timestampLink || undefined };
      }
    }

    if (classification.startsWith("OVERVIEW")) {
      const subtopicListForOverview = contentItems.map((item) => {
        return `• ${item.subtopic} (${item.difficulty || 'General'}) | Keywords: ${item.keywords || 'none'}`;
      }).join('\n');

      const entryLooksPortuguese = contentItems.length > 0 && /[àáâãéêíóôõúç]/i.test(contentItems[0].subtopic || '');
      const contentLang = entryLooksPortuguese ? "Portuguese" : "English";
      const langMismatch = (isPt && !entryLooksPortuguese) || (!isPt && entryLooksPortuguese);
      const linkLangNote = langMismatch ? `\nNote: The content was originally created in ${contentLang}.` : '';

      const overviewPrompt = `You are "onset. Assistant", a warm learning coach for "${topic}".
The user wants to know what content is available. Present an organized overview of the knowledge base grouped into logical categories/themes (e.g., "Giving Feedback", "Listening Skills", "Conflict Resolution", etc.). Group related subtopics together under clear category headings.
For each category, list the subtopics briefly. After the overview, invite the user to pick a category or ask about any specific subtopic.

LANGUAGE RULE (MANDATORY): Your ENTIRE response MUST be in ${userLang}. Every single word, including category headings, subtopic names, bullet points, and follow-up questions. If the knowledge base entries below are in a different language, translate EVERYTHING — never leave any word in the original language.${linkLangNote}
Keep it concise and scannable — use short bullet points, not long descriptions.
${profileContext}

ALL ENTRIES IN THE KNOWLEDGE BASE (${contentItems.length} total):
${subtopicListForOverview}`;

      const overviewMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: overviewPrompt }
      ];
      if (history && history.length > 0) {
        for (const msg of history.slice(-6)) {
          overviewMessages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
        }
      }
      overviewMessages.push({ role: "user", content: question });

      const overviewResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: overviewMessages,
        max_completion_tokens: 800,
      });

      const overviewAnswer = overviewResponse.choices[0]?.message?.content?.trim() || "";
      if (overviewAnswer) {
        return { answer: overviewAnswer, found: true };
      }
    }

    if (classification.startsWith("EXPLORE") || classification.startsWith("PLAN")) {
      const isplan = classification.startsWith("PLAN");

      const subtopicListWithLinks = contentItems.map((item) => {
        const link = item.timestampLink ? ` | Link: ${item.timestampLink}` : '';
        const takeaway = item.keyTakeaway ? ` | Takeaway: ${item.keyTakeaway.split('|')[0].trim()}` : '';
        return `• ${item.subtopic} (${item.difficulty || 'General'})${takeaway}${link}`;
      }).join('\n');

      const entryLooksPortuguese = contentItems.length > 0 && /[àáâãéêíóôõúç]/i.test(contentItems[0].subtopic || '');
      const contentLang = entryLooksPortuguese ? "Portuguese" : "English";
      const langMismatch = (isPt && !entryLooksPortuguese) || (!isPt && entryLooksPortuguese);
      const linkLangNote = langMismatch ? `\nThe linked videos are in ${contentLang}. Mention this once to the user.` : '';

      const guidePrompt = isplan
        ? `You are "onset. Assistant", a warm learning coach for "${topic}".
The user wants a learning plan. Create a structured plan using ONLY the entries below. For EACH entry in the plan, you MUST include its link so the user can access the content directly. Format links as markdown: [title](url).

LANGUAGE RULE (MANDATORY): Your ENTIRE response MUST be in ${userLang}. Every single word, including subtopic names, plan titles, section headers, and descriptions. If the entries below are in a different language, translate EVERYTHING — never leave any word in the original language.${linkLangNote}
Organize by difficulty: Beginner → Intermediate → Advanced. Be practical and brief.
${profileContext}

KNOWLEDGE BASE ENTRIES (use these — include the links!):
${subtopicListWithLinks}`
        : `You are "onset. Assistant", a warm learning coach for "${topic}".

CONTEXT AWARENESS (CRITICAL): The user's message is a REPLY to your previous message. ALWAYS read the conversation history to understand what was discussed. If you previously listed topics, options, or suggestions (e.g. "1. Feedback Training, 2. Active Listening"), and the user says "the first one", "tell me about that", "yes", "let's do it", or any reference — you MUST look at what you previously suggested and respond about THAT specific topic. Never say you don't have information about something you just suggested.

Engage conversationally based on what the user said:
- If it's a greeting ("hi", "hello", "olá") AND there is no conversation history: welcome them warmly to the "${topic}" learning space. Do NOT list specific subtopics yet. Instead, ask an open-ended question to understand what they want to learn or what challenge they're facing related to "${topic}". For example: "What area of ${topic} would you like to explore?" or "Is there a specific situation you're dealing with that I can help with?". Keep it to 2-3 sentences max.
- If it's a greeting AND there IS conversation history: welcome them back, briefly recall what was discussed before, and ask if they want to continue or explore something new.
- If it's a social message ("thank you", "thanks", "ok"): acknowledge warmly. If conversation history shows you were discussing something, ask if they'd like to continue or explore something else.
- If it's a short follow-up ("yes", "sure", "tell me more", "the first one", "let's start"): look at the conversation history to understand what they want, resolve any references to previously suggested topics, and continue from there with relevant content from the knowledge base.
- If it's a general question or the user describes a situation/challenge: acknowledge their interest, relate to their situation, and suggest 2-3 relevant subtopics that could help.

When providing information about a subtopic, use the knowledge base data below as source material but deliver it conversationally — relate it to the user's situation and previous questions. Do NOT just list key takeaways verbatim.

LANGUAGE RULE (MANDATORY): Your ENTIRE response MUST be in ${userLang}. Every single word, including subtopic names, suggestions, greetings, and follow-up questions. If the subtopic names below are in a different language, translate EVERY one of them — never leave any word in the original language.

Use ONLY these subtopics (do not invent others — but translate them to ${userLang}):
${subtopicList}

Knowledge base entries (INTERNAL reference only — use as source material but NEVER copy or expose this text directly. NEVER use pipe characters "|" in your response. Write in natural sentences):
${contentItems.map(item => `• ${item.subtopic}: ${(item.keyTakeaway || '').split('|')[0].trim()}`).join('\n')}

Be warm, encouraging, and concise. Don't list everything — suggest 2-3 relevant options.
${profileContext}`;

      const guideMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: guidePrompt }
      ];
      if (history && history.length > 0) {
        for (const msg of history.slice(-6)) {
          guideMessages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
        }
      }
      guideMessages.push({ role: "user", content: question });

      const guideResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: guideMessages,
        max_completion_tokens: 1200,
      });

      const guideAnswer = guideResponse.choices[0]?.message?.content?.trim() || "";
      if (guideAnswer) {
        return { answer: guideAnswer, found: true };
      }
    }

    if (classification.startsWith("OFF_TOPIC")) {
      const subtopicList = contentItems
        .slice(0, 5)
        .map(item => item.subtopic)
        .join(', ');

      const offTopicPrompt = `You are "onset. Assistant", a friendly and professional learning coach focused exclusively on "${topic}".

The user just sent a message that is off-topic. It could be:
- A navigation command like "exit", "quit", "stop"
- An unrelated subject (cooking, sports, etc.)
- Nonsense, random words, or jokes
- Inappropriate language or insults

Respond warmly but clearly. Show that you understand what they said, then gently redirect them. Let them know this chat is specifically designed to help them learn about "${topic}". Mention 2-3 specific subtopics you can help with from this list: ${subtopicList}.

LANGUAGE RULE (MANDATORY): Your ENTIRE response MUST be in ${userLang}. Every single word, including subtopic names you mention. If the subtopic names in the list above are in a different language, translate them — never leave any word in the original language.

Keep it brief (2-3 sentences). Be understanding, not robotic. If they said "exit" or similar, let them know they can simply close the chat or pick a different topic, and offer to help with something before they go.
${profileContext}`;

      const offTopicResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: offTopicPrompt },
          { role: "user", content: question },
        ],
        max_completion_tokens: 200,
      });

      const offTopicMsg = offTopicResponse.choices[0]?.message?.content?.trim() ||
        (isPt
          ? `Essa pergunta está fora do escopo da nossa base sobre "${topic}". Posso te ajudar com algo sobre ${subtopicList}?`
          : `That's outside our "${topic}" knowledge base. I can help with topics like ${subtopicList}. What interests you?`);

      return { answer: offTopicMsg, found: true };
    }

    if (classification.startsWith("NOT_FOUND")) {
      return { answer: "", found: false };
    }

    // Fallback: if classification didn't match any pattern, try keyword match
    return fallbackKeywordMatch(contentItems, question);
  } catch (error) {
    console.error("OpenAI error, falling back to keyword matching:", error);
    return fallbackKeywordMatch(contentItems, question);
  }
}

function fallbackKeywordMatch(contentItems: Content[], query: string): { answer: string; found: boolean; link?: string } {
  const lowerQuery = query.toLowerCase().replace(/[?!.,]/g, '').trim();
  const stopWords = new Set(['how', 'to', 'the', 'a', 'an', 'is', 'in', 'of', 'for', 'and', 'or', 'what', 'can', 'do', 'i', 'my', 'use', 'using', 'with', 'about', 'should', 'como', 'que', 'para', 'um', 'uma', 'de', 'da', 'do', 'no', 'na', 'se', 'por', 'com', 'eu', 'meu', 'minha']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  let bestMatch: Content | undefined;
  let maxScore = 0;

  for (const item of contentItems) {
    let score = 0;
    const lowerSubtopic = item.subtopic.toLowerCase();
    const subtopicWords = lowerSubtopic.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    const significantMatches = queryWords.filter(qw =>
      subtopicWords.some(sw => qw === sw || (qw.length > 4 && (sw.includes(qw) || qw.includes(sw))))
    );

    if (significantMatches.length >= 2 || (significantMatches.length === 1 && significantMatches[0].length > 5)) {
      score += significantMatches.length * 5;
    }

    if (item.keywords) {
      const keywordList = item.keywords.split(',').map(k => k.trim().toLowerCase());
      let keywordHits = 0;
      for (const keyword of keywordList) {
        if (keyword.length > 3 && lowerQuery.includes(keyword)) {
          keywordHits++;
        }
      }
      if (keywordHits >= 2) {
        score += keywordHits * 5;
      }
    }

    if (item.searchContext) {
      const contextWords = item.searchContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const contextHits = queryWords.filter(qw => contextWords.some(cw => cw.includes(qw) || qw.includes(cw)));
      score += contextHits.length * 2;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && maxScore >= 5) {
    const takeaway = bestMatch.keyTakeaway || bestMatch.subtopic;
    const answer = `**${bestMatch.subtopic}**\n\n${takeaway}`;
    return { answer, found: true, link: bestMatch.timestampLink || undefined };
  }
  return { answer: "", found: false };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const profile = await storage.getUserProfile(req.user.claims.sub);
    res.json(profile || null);
  });

  const profileInputSchema = z.object({
    role: z.string().max(200).optional().default(""),
    industry: z.string().max(200).optional().default(""),
    goal: z.string().max(500).optional().default(""),
    challenge: z.string().max(500).optional().default(""),
    learningPreference: z.string().max(50).optional().default(""),
  });

  app.post("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.claims.sub;
      const parsed = profileInputSchema.parse(req.body);
      const profile = await storage.upsertUserProfile({
        userId,
        ...parsed,
        completedOnboarding: true,
      });
      res.json(profile);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid profile data" });
      }
      throw error;
    }
  });

  app.get("/api/topic-experience/:topic", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const exp = await storage.getTopicExperience(req.user.claims.sub, req.params.topic);
    res.json(exp || null);
  });

  app.post("/api/topic-experience", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { topic, experience } = z.object({
      topic: z.string(),
      experience: z.enum(["beginner", "intermediate", "advanced"]),
    }).parse(req.body);
    const result = await storage.setTopicExperience({
      userId: req.user.claims.sub,
      topic,
      experience,
    });
    res.json(result);
  });

  app.get("/api/chat-history", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const history = await storage.getChatHistory(req.user.claims.sub);
    res.json(history);
  });

  app.get("/api/topics", async (_req, res) => {
    const topics = await storage.getAvailableTopics();
    res.json(topics);
  });

  app.post("/api/content/upload", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    upload.single("file")(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ message: "File upload error: " + err.message });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      try {
        const fileContent = req.file.buffer.toString("utf-8");
        const parsed = JSON.parse(fileContent);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          return res.status(400).json({ message: "JSON must be a non-empty array" });
        }

        const validated = parsed.map((item: any, idx: number) => {
          const result = jsonItemSchema.safeParse(item);
          if (!result.success) {
            throw new Error(`Invalid item at index ${idx}: ${result.error.issues.map(i => i.message).join(', ')}`);
          }
          return result.data;
        });

        const topic = validated[0].Topic;
        const allSameTopic = validated.every((item: any) => item.Topic === topic);
        if (!allSameTopic) {
          return res.status(400).json({ message: "All items in the JSON file must have the same Topic" });
        }

        await storage.clearContentByTopic(topic);

        const contentItems = validated.map((item: any) => ({
          unitId: item.Unit_ID || null,
          topic: item.Topic,
          subtopic: item.Subtopic,
          searchContext: item.Search_Context || null,
          keywords: item.Keywords || null,
          keyTakeaway: item.Key_Takeaway || null,
          difficulty: item.Difficulty || null,
          useCase: item.Use_Case || null,
          timestampLink: item.Timestamp_Link || null,
        }));

        await storage.bulkCreateContent(contentItems);

        res.json({
          message: `Uploaded ${contentItems.length} items for topic "${topic}"`,
          count: contentItems.length,
          topic,
        });
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          return res.status(400).json({ message: "Invalid JSON file" });
        }
        return res.status(400).json({ message: error.message || "Upload failed" });
      }
    });
  });

  app.get("/api/admin/users", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const usersWithStats = await storage.getAllUsersWithStats();
      res.json(usersWithStats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/export", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const usersWithStats = await storage.getAllUsersWithStats();
      const topics = await storage.getAvailableTopics();
      const BOM = "\uFEFF";
      const topicHeaders = topics.map(t => `${t} Qs`).join(",");
      const header = `Name,Email,${topicHeaders || "Questions"},Registered`;
      const rows = usersWithStats.map((u) => {
        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "-";
        const email = u.email || "-";
        const registered = u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "-";
        const topicCounts = topics.map(t => u.questionCounts[t] || 0).join(",");
        return `"${name.replace(/"/g, '""')}","${email.replace(/"/g, '""')}",${topicCounts || "0"},"${registered}"`;
      });
      const csv = BOM + header + "\n" + rows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  app.post(api.chat.ask.path, async (req: any, res) => {
    try {
      const { topic, question, language, history } = api.chat.ask.input.parse(req.body);

      let profile: UserProfile | null = null;
      let topicExp: TopicExperience | null = null;
      const userId = req.isAuthenticated?.() ? req.user?.claims?.sub : null;

      if (userId) {
        profile = await storage.getUserProfile(userId) || null;
        topicExp = await storage.getTopicExperience(userId, topic) || null;
      }

      const result = await findBestAnswer(topic, question, language || "en", profile, topicExp, history);

      if (userId) {
        await storage.logChatHistory({
          userId,
          topic,
          question,
          answer: result.answer || (language === "pt-BR" ? "Sem resposta encontrada" : "No answer found"),
          found: result.found,
        });
      }

      if (result.found) {
        res.json({
          answer: result.answer,
          found: true,
          link: result.link || null,
        });
      } else {
        const userEmail = req.isAuthenticated?.() ? req.user?.claims?.email : null;
        await storage.logUnansweredQuestion({ topic, question, userId: userId || null, userEmail: userEmail || null });
        const notFoundMsg = result.answer || (language === "pt-BR"
          ? "Desculpe, ainda não tenho uma resposta para essa pergunta em nossa base de conhecimento. Registrei para nossa equipe analisar e retornar."
          : "I'm sorry, I don't have an answer for that question in our knowledge base yet. I've logged it for our team to review and they'll follow up with you.");
        res.json({
          answer: notFoundMsg,
          found: false
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get(api.content.list.path, async (req, res) => {
    const contentItems = await storage.getAllContent();
    res.json(contentItems);
  });

  app.get("/api/content/:topic", async (req, res) => {
    const topic = decodeURIComponent(req.params.topic);
    const contentItems = await storage.getContentByTopic(topic);
    res.json(contentItems);
  });

  app.get(api.unanswered.list.path, async (req, res) => {
    const questions = await storage.getUnansweredQuestions();
    res.json(questions);
  });

  app.post("/api/admin/respond", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const adminId = req.user.claims.sub;
      const { questionId, response } = req.body;
      if (!questionId || !response) {
        return res.status(400).json({ message: "questionId and response are required" });
      }

      const question = await storage.getUnansweredQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.userId) {
        await storage.respondToQuestion({
          questionId,
          userId: question.userId,
          topic: question.topic,
          question: question.question,
          response,
          adminId,
        });

        if (question.userEmail) {
          const userProfile = await storage.getUserProfile(question.userId);
          if (!userProfile || userProfile.emailNotifications !== false) {
            try {
              await sendEmailNotification(question.userEmail, question.question, response, question.topic);
            } catch (emailErr) {
              console.error("Email notification failed:", emailErr);
            }
          }
        }
      }

      await storage.markQuestionReviewed(questionId);
      res.json({ success: true });
    } catch (err) {
      console.error("Respond error:", err);
      res.status(500).json({ message: "Failed to respond" });
    }
  });

  app.get("/api/notifications", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  });

  app.get("/api/notifications/count", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  });

  app.patch("/api/notifications/read-all", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  app.patch("/api/notifications/:id/read", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const notificationId = parseInt(req.params.id);
    await storage.markNotificationRead(notificationId, userId);
    res.json({ success: true });
  });

  app.patch("/api/profile/notifications", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const { emailNotifications } = req.body;
    const profile = await storage.getUserProfile(userId);
    if (profile) {
      await storage.upsertUserProfile({
        ...profile,
        emailNotifications: emailNotifications ?? true,
      });
    }
    res.json({ success: true });
  });

  // ==================== WhatsApp Webhook ====================

  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[WhatsApp] Webhook verified successfully");
      return res.status(200).send(challenge);
    }
    console.log("[WhatsApp] Webhook verification failed", { mode, token: token ? "provided" : "missing" });
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    res.sendStatus(200);

    try {
      const body = req.body;
      if (body.object !== "whatsapp_business_account") return;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          const messages = change.value?.messages || [];
          const contacts = change.value?.contacts || [];

          for (const message of messages) {
            if (message.type !== "text") continue;

            const from = message.from;
            const text = message.text?.body?.trim();
            const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || "User";

            if (!text) continue;

            console.log(`[WhatsApp] Message from ${contactName} (${from}): ${text}`);

            const allTopics = await storage.getAvailableTopics();
            const defaultTopic = allTopics.length > 0 ? allTopics[0] : null;

            if (!defaultTopic) {
              await sendWhatsAppMessage(from, "No topics available yet. Please try again later.");
              continue;
            }

            const looksPortuguese = /[àáâãéêíóôõúç]|como|você|quero|obrigad|aprender|sobre|pode|ajud/i.test(text);
            const detectedLang = looksPortuguese ? "pt-BR" : "en";

            const result = await findBestAnswer(defaultTopic, text, detectedLang, null, null);

            if (result.found && result.answer) {
              let reply = result.answer;
              if (result.link) {
                reply += `\n\n🎥 ${result.link}`;
              }
              await sendWhatsAppMessage(from, reply);
            } else {
              await sendWhatsAppMessage(from, `I don't have information about that in our "${defaultTopic}" knowledge base yet. Try asking something else!`);
              await storage.createUnansweredQuestion({
                topic: defaultTopic,
                question: text,
                userId: null,
                userEmail: `whatsapp:${from}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Error processing message:", error);
    }
  });

  return httpServer;
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log("[WhatsApp] Skipped sending (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)");
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[WhatsApp] Send failed:", err);
    } else {
      console.log(`[WhatsApp] Message sent to ${to}`);
    }
  } catch (error) {
    console.error("[WhatsApp] Send error:", error);
  }
}

export async function seedDatabase() {
}
