import { db } from "./db";
import {
  content,
  unansweredQuestions,
  type Content,
  type InsertContent,
  type UnansweredQuestion,
  type InsertUnansweredQuestion,
} from "@shared/schema";
import { eq, ilike, or, and } from "drizzle-orm";

export interface IStorage {
  // Content methods
  getAllContent(): Promise<Content[]>;
  createContent(item: InsertContent): Promise<Content>;
  findContent(topic: string, query: string): Promise<Content | undefined>;

  // Unanswered questions methods
  logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion>;
  getUnansweredQuestions(): Promise<UnansweredQuestion[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content);
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [newItem] = await db.insert(content).values(item).returning();
    return newItem;
  }

  async findContent(topic: string, query: string): Promise<Content | undefined> {
    // Simple keyword matching for MVP
    // In a real app, this would use vector search or more sophisticated logic
    // We'll look for content where the question or keywords match the query
    
    // Convert query to lower case for case-insensitive comparison
    const lowerQuery = query.toLowerCase();

    const allContent = await db
      .select()
      .from(content)
      .where(eq(content.topic, topic));

    // Basic scoring: find the content with the most matching keywords
    let bestMatch: Content | undefined;
    let maxScore = 0;

    for (const item of allContent) {
      let score = 0;
      
      // Check if question text is similar (basic inclusion)
      if (item.question.toLowerCase().includes(lowerQuery) || lowerQuery.includes(item.question.toLowerCase())) {
        score += 10;
      }

      // Check keywords
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

    // Threshold for matching
    return maxScore > 0 ? bestMatch : undefined;
  }

  async logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion> {
    const [newItem] = await db.insert(unansweredQuestions).values(item).returning();
    return newItem;
  }

  async getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
    return await db.select().from(unansweredQuestions);
  }
}

export const storage = new DatabaseStorage();
