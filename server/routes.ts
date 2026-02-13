import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { syncFromSheet } from "./google-sheets";
import type { Content, UserProfile, TopicExperience } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const profileLabels: Record<string, Record<string, string>> = {
  role: { manager: "Manager / Team Lead", executive: "Executive / Director", entrepreneur: "Entrepreneur / Founder", consultant: "Consultant / Advisor", specialist: "Specialist / Analyst", creative: "Creative Professional", educator: "Educator / Trainer", student: "Student / Learner", other: "Other" },
  industry: { technology: "Technology / IT", healthcare: "Healthcare / Pharma", finance: "Finance / Banking", education: "Education / Training", marketing: "Marketing / Advertising", retail: "Retail / E-commerce", manufacturing: "Manufacturing / Engineering", media: "Media / Entertainment", consulting: "Consulting / Professional Services", nonprofit: "Non-profit / Government", other: "Other" },
  goal: { ai_basics: "Understand AI fundamentals", ai_productivity: "Use AI to boost productivity", communication: "Improve communication skills", leadership: "Develop leadership abilities", career_growth: "Accelerate career growth", team_management: "Better team management", innovation: "Drive innovation", stay_current: "Stay current with trends" },
  challenge: { time: "Finding time to learn", overwhelm: "Too much information", practical: "Turning knowledge into practice", keeping_up: "Keeping up with rapid changes", confidence: "Building confidence in new skills", team_adoption: "Getting team to adopt new approaches", measuring: "Measuring progress and impact", starting: "Not sure where to start" },
};

function getProfileLabel(field: string, key: string): string {
  return profileLabels[field]?.[key] || key || "Not specified";
}

async function findBestAnswer(topic: string, question: string, language: string = "en", profile?: UserProfile | null, topicExp?: TopicExperience | null): Promise<{ answer: string; found: boolean; link?: string }> {
  const contentItems = await storage.getContentByTopic(topic);

  const isPt = language === "pt-BR";
  if (contentItems.length === 0) {
    return { answer: isPt 
      ? "Ainda não há conteúdo disponível para este tópico. Por favor, tente novamente mais tarde." 
      : "There is no content available for this topic yet. Please try again later.", found: false };
  }

  const contentContext = contentItems.map((item, i) => {
    let entry = `[${i}] Subtopic: ${item.question}`;
    if (item.keywords && item.keywords.length > 0) {
      entry += `\nKeywords: ${item.keywords.join(', ')}`;
    }
    const answerParts = item.answer.split('\n\nSource: ');
    entry += `\nKey Takeaway: ${answerParts[0]}`;
    if (answerParts[1]) {
      entry += `\nExpert/Source: ${answerParts[1]}`;
    }
    return entry;
  }).join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `You are a strict knowledge base assistant. You can ONLY answer using the curated entries below.

INSTRUCTIONS:
1. Read the user's question carefully. The user may ask in English or Portuguese — understand the intent regardless of language.
2. For each entry, check if the user's question is specifically asking about the SAME specific subtopic described in that entry. The entry's subtopic, keywords, and key takeaway must directly answer what the user is asking.
3. A match is ONLY valid if the entry's key takeaway actually answers the user's question. Sharing a word (like "AI") is NOT enough — the specific subject must match.
4. If you find a genuine match, respond EXACTLY like this:
   MATCH:[index_number]
   [Rephrase the key takeaway as a natural answer. Use ONLY info from the entry. Then write: — [Expert/Source name]]
5. If no entry genuinely answers the user's question, respond EXACTLY with: NOT_FOUND

EXAMPLES OF WRONG MATCHES (do NOT do this):
- User asks "How to use AI in the gym" → Entry about "How to start a prompt" → NOT a match (different subjects)
- User asks "AI tools for cooking" → Entry about "prompt persona" → NOT a match
- User asks about topic X → Entry mentions "AI" too → NOT a match unless the specific subject is the same

EXAMPLES OF CORRECT MATCHES:
- User asks "How should I write a prompt?" → Entry about "How to start a prompt" → MATCH (same specific subject)
- User asks "What role should I give AI?" → Entry about "giving AI a persona/role" → MATCH (same specific subject)

RULES:
- NEVER invent answers. NEVER use your own knowledge.
- When in doubt, respond NOT_FOUND. A human will review the question later.
- The [index_number] must match the [N] prefix of the entry.
${isPt ? '- IMPORTANT: Your answer MUST be written in Brazilian Portuguese (pt-BR). Translate the key takeaway into natural Portuguese. Keep expert/source names unchanged.' : ''}
${profile && profile.completedOnboarding ? `
USER PROFILE (use this to tailor HOW you phrase your answer, but NEVER invent content):
- Role: ${getProfileLabel('role', profile.role || '')}
- Industry: ${getProfileLabel('industry', profile.industry || '')}
- Experience level for this topic: ${topicExp?.experience || 'Not specified'}
- Learning goal: ${getProfileLabel('goal', profile.goal || '')}
- Main challenge: ${getProfileLabel('challenge', profile.challenge || '')}
- Learning preference: ${profile.learningPreference === 'quick_tips' ? 'Quick tips & key takeaways — keep it brief and actionable' : profile.learningPreference === 'step_by_step' ? 'Step-by-step explanations — break down the concept clearly' : profile.learningPreference === 'examples' ? 'Real-world examples & case studies — illustrate with practical scenarios' : 'Not specified'}

MICROLEARNING FORMAT: Keep your answer concise and focused — one key insight at a time. Do NOT create a long study plan. Deliver a single, digestible piece of knowledge that matches the user's learning preference. Adjust complexity based on their experience level for this topic.

When you find a match, tailor the explanation to this person's context. Use their learning preference to structure the response. But ONLY use information from the knowledge base entries — do NOT add facts or advice from your own knowledge.` : ''}

Knowledge Base for topic "${topic}":
${contentContext}`
        },
        {
          role: "user",
          content: question
        }
      ],
      max_completion_tokens: 512,
    });

    const aiAnswer = response.choices[0]?.message?.content?.trim() || "";

    if (aiAnswer === "NOT_FOUND" || aiAnswer.includes("NOT_FOUND")) {
      return { answer: "", found: false };
    }

    if (!aiAnswer) {
      return fallbackKeywordMatch(contentItems, question);
    }

    const matchIndexResult = aiAnswer.match(/MATCH:\[?(\d+)\]?/);
    let link: string | undefined;
    let cleanAnswer = aiAnswer;
    let matchedIdx = -1;

    if (matchIndexResult) {
      matchedIdx = parseInt(matchIndexResult[1], 10);
      if (matchedIdx >= 0 && matchedIdx < contentItems.length) {
        if (contentItems[matchedIdx].link) {
          link = contentItems[matchedIdx].link!;
        }
      }
      cleanAnswer = aiAnswer.replace(/MATCH:\[?\d+\]?\s*\n?/, '').trim();
    }

    cleanAnswer = cleanAnswer.replace(/\n\nSource:\s*/g, '\n— ').replace(/\nSource:\s*/g, '\n— ').replace(/^Source:\s*/g, '— ');

    if (!cleanAnswer && matchedIdx >= 0 && matchedIdx < contentItems.length) {
      const matched = contentItems[matchedIdx];
      const answerParts = matched.answer.split('\n\nSource: ');
      cleanAnswer = answerParts[0];
      if (answerParts[1]) {
        cleanAnswer += `\n— ${answerParts[1]}`;
      }
    }

    if (!cleanAnswer) {
      return { answer: "", found: false };
    }

    return { answer: cleanAnswer, found: true, link };
  } catch (error) {
    console.error("OpenAI error, falling back to keyword matching:", error);
    return fallbackKeywordMatch(contentItems, question);
  }
}

function fallbackKeywordMatch(contentItems: Content[], query: string): { answer: string; found: boolean; link?: string } {
  const lowerQuery = query.toLowerCase().replace(/[?!.,]/g, '').trim();
  const stopWords = new Set(['how', 'to', 'the', 'a', 'an', 'is', 'in', 'of', 'for', 'and', 'or', 'what', 'can', 'do', 'i', 'my', 'use', 'using', 'with', 'about', 'should']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  let bestMatch: Content | undefined;
  let maxScore = 0;

  for (const item of contentItems) {
    let score = 0;
    const lowerQuestion = item.question.toLowerCase();
    const questionWords = lowerQuestion.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    const significantMatches = queryWords.filter(qw =>
      questionWords.some(qwItem => qw === qwItem || (qw.length > 4 && (qwItem.includes(qw) || qw.includes(qwItem))))
    );

    if (significantMatches.length >= 2 || (significantMatches.length === 1 && significantMatches[0].length > 5)) {
      score += significantMatches.length * 5;
    }

    if (item.keywords) {
      let keywordHits = 0;
      for (const keyword of item.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerKeyword.length > 3 && lowerQuery.includes(lowerKeyword)) {
          keywordHits++;
        }
      }
      if (keywordHits >= 2) {
        score += keywordHits * 5;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && maxScore >= 5) {
    const formattedAnswer = bestMatch.answer.replace(/\n\nSource:\s*/g, '\n— ').replace(/\nSource:\s*/g, '\n— ');
    return { answer: formattedAnswer, found: true, link: bestMatch.link || undefined };
  }
  return { answer: "", found: false };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  // Profile endpoints
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

  // Topic experience endpoints
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

  // Chat history endpoints
  app.get("/api/chat-history", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const history = await storage.getChatHistory(req.user.claims.sub);
    res.json(history);
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
      const BOM = "\uFEFF";
      const header = "Name,Email,AI Skills Questions,Communication Questions,Registered";
      const rows = usersWithStats.map((u) => {
        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "-";
        const email = u.email || "-";
        const registered = u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "-";
        return `"${name.replace(/"/g, '""')}","${email.replace(/"/g, '""')}",${u.aiSkillsCount},${u.communicationCount},"${registered}"`;
      });
      const csv = BOM + header + "\n" + rows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // Chat endpoint - uses OpenAI for intelligent matching
  app.post(api.chat.ask.path, async (req: any, res) => {
    try {
      const { topic, question, language } = api.chat.ask.input.parse(req.body);

      let profile: UserProfile | null = null;
      let topicExp: TopicExperience | null = null;
      const userId = req.isAuthenticated?.() ? req.user?.claims?.sub : null;

      if (userId) {
        profile = await storage.getUserProfile(userId) || null;
        topicExp = await storage.getTopicExperience(userId, topic) || null;
      }

      const result = await findBestAnswer(topic, question, language || "en", profile, topicExp);

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
        await storage.logUnansweredQuestion({ topic, question });
        const notFoundMsg = language === "pt-BR"
          ? "Desculpe, ainda não tenho uma resposta para essa pergunta em nossa base de conhecimento. Registrei para nossa equipe analisar e retornar."
          : "I'm sorry, I don't have an answer for that question in our knowledge base yet. I've logged it for our team to review and they'll follow up with you.";
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

  // Content Management
  app.get(api.content.list.path, async (req, res) => {
    const contentItems = await storage.getAllContent();
    res.json(contentItems);
  });

  app.post(api.content.create.path, async (req, res) => {
    try {
      const input = api.content.create.input.parse(req.body);
      const item = await storage.createContent(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
    }
  });

  // Unanswered Questions
  app.get(api.unanswered.list.path, async (req, res) => {
    const questions = await storage.getUnansweredQuestions();
    res.json(questions);
  });

  // Sync from Google Sheets
  app.post(api.sync.trigger.path, async (req, res) => {
    try {
      const sheetData = await syncFromSheet();

      await storage.clearAllContent();
      await storage.bulkCreateContent(sheetData.map(row => ({
        topic: row.topic,
        question: row.question,
        answer: row.answer,
        keywords: row.keywords.length > 0 ? row.keywords : null,
        link: row.link || null,
      })));

      res.json({
        message: `Synced ${sheetData.length} items from Google Sheets`,
        count: sheetData.length
      });
    } catch (err: any) {
      console.error("Sheet sync error:", err);
      res.status(500).json({ message: err.message || "Failed to sync from Google Sheets" });
    }
  });

  return httpServer;
}

export async function seedDatabase() {
  const existingContent = await storage.getAllContent();
  if (existingContent.length === 0) {
    // Try syncing from Google Sheets first
    try {
      const sheetData = await syncFromSheet();
      if (sheetData.length > 0) {
        await storage.bulkCreateContent(sheetData.map(row => ({
          topic: row.topic,
          question: row.question,
          answer: row.answer,
          keywords: row.keywords.length > 0 ? row.keywords : null,
          link: row.link || null,
        })));
        console.log(`Seeded ${sheetData.length} items from Google Sheets`);
        return;
      }
    } catch (err) {
      console.log("Could not sync from Google Sheets on startup, using default seed data:", (err as Error).message);
    }

    await storage.createContent({
      topic: "AI Skills",
      question: "What is machine learning?",
      answer: "Machine learning is a subset of AI that enables systems to learn from data and improve without explicit programming.",
      keywords: ["machine learning", "ml", "learn"],
      link: null,
    });
    await storage.createContent({
      topic: "AI Skills",
      question: "How do I start with Python for AI?",
      answer: "Start by learning basic Python syntax, then move to libraries like NumPy, Pandas, and Scikit-learn.",
      keywords: ["python", "start", "libraries"],
      link: null,
    });
    await storage.createContent({
      topic: "Communication",
      question: "How to give good feedback?",
      answer: "Good feedback should be specific, actionable, and delivered with empathy. Focus on behavior, not personality.",
      keywords: ["feedback", "give", "tips"],
      link: null,
    });
    await storage.createContent({
      topic: "Communication",
      question: "What is active listening?",
      answer: "Active listening involves fully concentrating, understanding, responding, and remembering what is being said.",
      keywords: ["active listening", "listen"],
      link: null,
    });
  }
}
