import { db } from "./db";
import {
  content,
  unansweredQuestions,
  userProfiles,
  type Content,
  type InsertContent,
  type UnansweredQuestion,
  type InsertUnansweredQuestion,
  type UserProfile,
  type InsertUserProfile,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getAllContent(): Promise<Content[]>;
  getContentByTopic(topic: string): Promise<Content[]>;
  createContent(item: InsertContent): Promise<Content>;
  clearAllContent(): Promise<void>;
  bulkCreateContent(items: InsertContent[]): Promise<void>;
  logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion>;
  getUnansweredQuestions(): Promise<UnansweredQuestion[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
}

export class DatabaseStorage implements IStorage {
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content);
  }

  async getContentByTopic(topic: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.topic, topic));
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [newItem] = await db.insert(content).values(item).returning();
    return newItem;
  }

  async clearAllContent(): Promise<void> {
    await db.delete(content);
  }

  async bulkCreateContent(items: InsertContent[]): Promise<void> {
    if (items.length === 0) return;
    await db.insert(content).values(items);
  }

  async logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion> {
    const [newItem] = await db.insert(unansweredQuestions).values(item).returning();
    return newItem;
  }

  async getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
    return await db.select().from(unansweredQuestions);
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
