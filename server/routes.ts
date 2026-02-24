import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import type { Content, UserProfile, TopicExperience } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
- EXPLORE — if the question is general, broad, or the user is exploring (e.g. "help me improve", "what can I learn", "I want to be better at...").
- PLAN — if the user asks for a learning plan or says "yes" to a suggestion.
- OFF_TOPIC — if unrelated to "${topic}".
- NOT_FOUND — if it's specifically about "${topic}" but no entry covers it.

Respond with ONLY the classification tag, nothing else.
${isPt ? 'The user may write in Portuguese.' : ''}

ENTRIES:
${contentItems.map((item, i) => `[${i}] ${item.subtopic} — Keywords: ${item.keywords || 'none'}`).join('\n')}`;

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

    if (matchResult) {
      const matchedIdx = parseInt(matchResult[1], 10);
      if (matchedIdx >= 0 && matchedIdx < contentItems.length) {
        const entry = contentItems[matchedIdx];
        const answerPrompt = `You are "onset. Assistant", a friendly learning coach. Answer the user's question using ONLY the information from this knowledge base entry. Be concise and natural. One key insight.
${isPt ? 'Respond in Brazilian Portuguese.' : ''}
${profileContext}

Entry: ${entry.subtopic}
Context: ${entry.searchContext || ''}
Key Takeaway: ${entry.keyTakeaway || ''}
Difficulty: ${entry.difficulty || ''}
Use Case: ${entry.useCase || ''}`;

        const answerMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: answerPrompt }
        ];
        if (history && history.length > 0) {
          for (const msg of history.slice(-4)) {
            answerMessages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
          }
        }
        answerMessages.push({ role: "user", content: question });

        const answerResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: answerMessages,
          max_completion_tokens: 500,
        });

        const answer = answerResponse.choices[0]?.message?.content?.trim() || entry.keyTakeaway || entry.subtopic;
        return { answer, found: true, link: entry.timestampLink || undefined };
      }
    }

    if (classification.startsWith("EXPLORE") || classification.startsWith("PLAN")) {
      const isplan = classification.startsWith("PLAN");
      const guidePrompt = `You are "onset. Assistant", a warm learning coach for "${topic}".
${isplan ? 'The user wants a learning plan.' : 'The user asked a general question. Engage them conversationally — acknowledge their interest, ask what aspect they want to focus on, and suggest 2-3 relevant subtopics from the list.'}
Use ONLY these subtopics (do not invent others):
${subtopicList}
${isplan ? 'Organize by difficulty: Beginner → Intermediate → Advanced. Be practical and brief.' : 'Be warm and encouraging. Ask 1-2 clarifying questions.'}
${isPt ? 'Respond in Brazilian Portuguese.' : ''}
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
        max_completion_tokens: 600,
      });

      const guideAnswer = guideResponse.choices[0]?.message?.content?.trim() || "";
      if (guideAnswer) {
        return { answer: guideAnswer, found: true };
      }
    }

    if (classification.startsWith("OFF_TOPIC")) {
      const offTopicMsg = isPt
        ? `Essa pergunta está fora do escopo da nossa base sobre "${topic}". Posso te ajudar com temas como feedback, empatia, comunicação assertiva e mais. O que te interessa?`
        : `That question is outside our "${topic}" knowledge base. I can help with topics like feedback, empathy, assertive communication, and more. What interests you?`;
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
    const answer = bestMatch.keyTakeaway || bestMatch.subtopic;
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
        await storage.logUnansweredQuestion({ topic, question });
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

  return httpServer;
}

export async function seedDatabase() {
}
