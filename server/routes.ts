import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Chat endpoint
  app.post(api.chat.ask.path, async (req, res) => {
    try {
      const { topic, question } = api.chat.ask.input.parse(req.body);
      
      const match = await storage.findContent(topic, question);
      
      if (match) {
        res.json({
          answer: match.answer,
          found: true
        });
      } else {
        // Log unanswered question
        await storage.logUnansweredQuestion({
          topic,
          question,
        });
        
        res.json({
          answer: "I'm sorry, I don't have an answer for that specific question yet. I've logged it for our team to review.",
          found: false
        });
      }
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Content Management (for MVP/Admin)
  app.get(api.content.list.path, async (req, res) => {
    const content = await storage.getAllContent();
    res.json(content);
  });

  app.post(api.content.create.path, async (req, res) => {
    try {
      const input = api.content.create.input.parse(req.body);
      const content = await storage.createContent(input);
      res.status(201).json(content);
    } catch (err) {
       if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
    }
  });

  // Unanswered Questions (for Curator)
  app.get(api.unanswered.list.path, async (req, res) => {
    const questions = await storage.getUnansweredQuestions();
    res.json(questions);
  });

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  const existingContent = await storage.getAllContent();
  if (existingContent.length === 0) {
    // AI Skills Topic
    await storage.createContent({
      topic: "AI Skills",
      question: "What is machine learning?",
      answer: "Machine learning is a subset of AI that enables systems to learn from data and improve without explicit programming.",
      keywords: ["machine learning", "ml", "learn"],
    });
    await storage.createContent({
      topic: "AI Skills",
      question: "How do I start with Python for AI?",
      answer: "Start by learning basic Python syntax, then move to libraries like NumPy, Pandas, and Scikit-learn.",
      keywords: ["python", "start", "libraries"],
    });

    // Communication Topic
    await storage.createContent({
      topic: "Communication",
      question: "How to give good feedback?",
      answer: "Good feedback should be specific, actionable, and delivered with empathy. Focus on behavior, not personality.",
      keywords: ["feedback", "give", "tips"],
    });
    await storage.createContent({
      topic: "Communication",
      question: "What is active listening?",
      answer: "Active listening involves fully concentrating, understanding, responding, and remembering what is being said.",
      keywords: ["active listening", "listen"],
    });
  }
}
