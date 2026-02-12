import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { syncFromSheet } from "./google-sheets";
import type { Content } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function findBestAnswer(topic: string, question: string): Promise<{ answer: string; found: boolean; link?: string }> {
  const contentItems = await storage.getContentByTopic(topic);

  if (contentItems.length === 0) {
    return { answer: "There is no content available for this topic yet. Please try again later.", found: false };
  }

  const contentContext = contentItems.map((item, i) => {
    let entry = `[${i}] Question: ${item.question}\nAnswer: ${item.answer}`;
    if (item.keywords && item.keywords.length > 0) {
      entry += `\nKeywords: ${item.keywords.join(', ')}`;
    }
    return entry;
  }).join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that answers questions ONLY based on the provided knowledge base content. You must not make up information or use knowledge outside of what is provided.

Rules:
1. Only answer using the content provided below.
2. If the user's question matches or is related to any entry in the knowledge base, respond with EXACTLY this format:
   MATCH:[index_number]
   [your answer based on the matched entry's content, rephrased for clarity]
3. If the question does NOT match any content in the knowledge base, respond EXACTLY with: "NOT_FOUND"
4. Do not add any information beyond what is in the knowledge base.
5. The index number should correspond to the [N] prefix of the matched entry.

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

    const matchIndexResult = aiAnswer.match(/^MATCH:\[?(\d+)\]?/);
    let link: string | undefined;
    let cleanAnswer = aiAnswer;

    if (matchIndexResult) {
      const idx = parseInt(matchIndexResult[1], 10);
      if (idx >= 0 && idx < contentItems.length && contentItems[idx].link) {
        link = contentItems[idx].link!;
      }
      cleanAnswer = aiAnswer.replace(/^MATCH:\[?\d+\]?\s*\n?/, '').trim();
    }

    return { answer: cleanAnswer, found: true, link };
  } catch (error) {
    console.error("OpenAI error, falling back to keyword matching:", error);
    return fallbackKeywordMatch(contentItems, question);
  }
}

function fallbackKeywordMatch(contentItems: Content[], query: string): { answer: string; found: boolean; link?: string } {
  const lowerQuery = query.toLowerCase();
  let bestMatch: Content | undefined;
  let maxScore = 0;

  for (const item of contentItems) {
    let score = 0;
    if (item.question.toLowerCase().includes(lowerQuery) || lowerQuery.includes(item.question.toLowerCase())) {
      score += 10;
    }
    if (item.keywords) {
      for (const keyword of item.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          score += 5;
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && maxScore > 0) {
    return { answer: bestMatch.answer, found: true, link: bestMatch.link || undefined };
  }
  return { answer: "", found: false };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Chat endpoint - uses OpenAI for intelligent matching
  app.post(api.chat.ask.path, async (req, res) => {
    try {
      const { topic, question } = api.chat.ask.input.parse(req.body);

      const result = await findBestAnswer(topic, question);

      if (result.found) {
        res.json({
          answer: result.answer,
          found: true,
          link: result.link || null,
        });
      } else {
        await storage.logUnansweredQuestion({ topic, question });
        res.json({
          answer: "I'm sorry, I don't have an answer for that question in our knowledge base yet. I've logged it for our team to review and they'll follow up with you.",
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
