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

  const subtopicList = contentItems.map((item, i) =>
    `- ${item.subtopic}${item.difficulty ? ` (${item.difficulty})` : ''}`
  ).join('\n');

  try {
    const profileContext = profile && profile.completedOnboarding ? `
USER PROFILE (use this to tailor HOW you phrase your answer, but NEVER invent content):
- Role: ${getProfileLabel('role', profile.role || '')}
- Industry: ${getProfileLabel('industry', profile.industry || '')}
- Experience level for this topic: ${topicExp?.experience || 'Not specified'}
- Learning goal: ${getProfileLabel('goal', profile.goal || '')}
- Main challenge: ${getProfileLabel('challenge', profile.challenge || '')}
- Learning preference: ${profile.learningPreference === 'quick_tips' ? 'Quick tips & key takeaways — keep it brief and actionable' : profile.learningPreference === 'step_by_step' ? 'Step-by-step explanations — break down the concept clearly' : profile.learningPreference === 'examples' ? 'Real-world examples & case studies — illustrate with practical scenarios' : 'Not specified'}` : '';

    const systemPrompt = `You are "onset. Assistant", a friendly and conversational knowledge base assistant for the topic "${topic}". You help users learn from a curated knowledge base. You NEVER invent information — you ONLY use what's in the knowledge base below.

YOUR BEHAVIOR — classify each user message into one of these categories and respond accordingly:

**CATEGORY 1: SPECIFIC QUESTION** — The user asks something specific that clearly matches one or more entries in the knowledge base.
→ Find the best matching entry. Respond with:
  MATCH:[index_number]
  [Rephrase the key takeaway naturally, tailored to the user's question. Use ONLY info from the matched entry.]

**CATEGORY 2: GENERAL / EXPLORATORY** — The user asks a broad or vague question, seems unsure what to learn, asks "what can I learn?", "tell me about...", "I want to improve...", or is exploring the topic.
→ Do NOT just say NOT_FOUND. Instead, engage the user conversationally:
  - Acknowledge their interest
  - Ask 1-2 clarifying questions to understand what they're looking for
  - Suggest relevant subtopics from the knowledge base that might interest them
  - Offer to create a learning path based on available content
→ Respond with:
  EXPLORE
  [Your conversational response — ask what aspect interests them, suggest subtopics, offer a learning plan. Be warm and helpful.]

**CATEGORY 3: LEARNING PLAN REQUEST** — The user agrees to a learning plan, or says "yes" to your suggestion, or asks to see available topics/content.
→ Present a structured learning path using the available subtopics from the knowledge base. Group by difficulty if possible. Be practical and brief.
→ Respond with:
  PLAN
  [Your learning plan using ONLY subtopics from the knowledge base. Organize logically.]

**CATEGORY 4: OFF-TOPIC** — The question has nothing to do with "${topic}" or any content in the knowledge base.
→ Respond with:
  OFF_TOPIC
  [Politely explain that this question is outside the "${topic}" knowledge base. Suggest what topics are available.]

**CATEGORY 5: NO MATCH** — The question IS about "${topic}" and is specific enough, but no entry in the knowledge base covers it.
→ Respond with:
  NOT_FOUND
  [Explain that the knowledge base doesn't cover this specific aspect yet, and that a human will review the question.]

RULES:
- NEVER invent facts, data, or advice from your own knowledge. ONLY use the knowledge base.
- When suggesting subtopics or creating plans, use the actual subtopics listed in the knowledge base.
- Be conversational, warm, and helpful — not robotic.
- Pay attention to conversation history to understand context (e.g., if user says "yes" after you offered a plan).
- The [index_number] in MATCH must correspond to the [N] prefix of the entry.
${isPt ? '- IMPORTANT: Your ENTIRE response MUST be written in Brazilian Portuguese (pt-BR).' : ''}
${profileContext}
${profileContext ? '\nMICROLEARNING FORMAT: When giving a direct answer (MATCH), keep it concise — one key insight. Tailor to the user\'s learning preference and experience level. But ONLY use information from the knowledge base.' : ''}

AVAILABLE SUBTOPICS in "${topic}":
${subtopicList}

FULL KNOWLEDGE BASE for "${topic}":
${contentContext}`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: question });

    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages,
      max_completion_tokens: 800,
    });

    const aiAnswer = response.choices[0]?.message?.content?.trim() || "";

    if (!aiAnswer) {
      return fallbackKeywordMatch(contentItems, question);
    }

    if (aiAnswer.startsWith("NOT_FOUND") || aiAnswer.includes("\nNOT_FOUND")) {
      const cleanMsg = aiAnswer.replace(/^NOT_FOUND\s*\n?/, '').trim();
      if (cleanMsg) {
        return { answer: cleanMsg, found: false };
      }
      return { answer: "", found: false };
    }

    if (aiAnswer.startsWith("OFF_TOPIC") || aiAnswer.includes("\nOFF_TOPIC")) {
      const cleanMsg = aiAnswer.replace(/^OFF_TOPIC\s*\n?/, '').trim();
      return {
        answer: cleanMsg || (isPt
          ? `Essa pergunta está fora do escopo da nossa base de conhecimento sobre "${topic}". Posso ajudar com os subtópicos disponíveis — gostaria de ver o que temos?`
          : `That question is outside the scope of our "${topic}" knowledge base. I can help with the available subtopics — would you like to see what we have?`),
        found: true,
      };
    }

    if (aiAnswer.startsWith("EXPLORE") || aiAnswer.includes("\nEXPLORE")) {
      const cleanMsg = aiAnswer.replace(/^EXPLORE\s*\n?/, '').trim();
      return { answer: cleanMsg, found: true };
    }

    if (aiAnswer.startsWith("PLAN") || aiAnswer.includes("\nPLAN")) {
      const cleanMsg = aiAnswer.replace(/^PLAN\s*\n?/, '').trim();
      return { answer: cleanMsg, found: true };
    }

    const matchIndexResult = aiAnswer.match(/MATCH:\[?(\d+)\]?/);
    let link: string | undefined;
    let cleanAnswer = aiAnswer;
    let matchedIdx = -1;

    if (matchIndexResult) {
      matchedIdx = parseInt(matchIndexResult[1], 10);
      if (matchedIdx >= 0 && matchedIdx < contentItems.length) {
        if (contentItems[matchedIdx].timestampLink) {
          link = contentItems[matchedIdx].timestampLink!;
        }
      }
      cleanAnswer = aiAnswer.replace(/MATCH:\[?\d+\]?\s*\n?/, '').trim();
    }

    if (!cleanAnswer && matchedIdx >= 0 && matchedIdx < contentItems.length) {
      const matched = contentItems[matchedIdx];
      cleanAnswer = matched.keyTakeaway || matched.subtopic;
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
