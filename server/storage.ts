import { db } from "./db";
import {
  content,
  unansweredQuestions,
  userProfiles,
  topicExperience,
  chatHistory,
  users,
  type Content,
  type InsertContent,
  type UnansweredQuestion,
  type InsertUnansweredQuestion,
  type UserProfile,
  type InsertUserProfile,
  type TopicExperience,
  type InsertTopicExperience,
  type ChatHistory,
  type InsertChatHistory,
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  getAllContent(): Promise<Content[]>;
  getContentByTopic(topic: string): Promise<Content[]>;
  getAvailableTopics(): Promise<string[]>;
  createContent(item: InsertContent): Promise<Content>;
  clearContentByTopic(topic: string): Promise<void>;
  clearAllContent(): Promise<void>;
  bulkCreateContent(items: InsertContent[]): Promise<void>;
  logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion>;
  getUnansweredQuestions(): Promise<UnansweredQuestion[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  getTopicExperience(userId: string, topic: string): Promise<TopicExperience | undefined>;
  setTopicExperience(data: InsertTopicExperience): Promise<TopicExperience>;
  logChatHistory(data: InsertChatHistory): Promise<ChatHistory>;
  getChatHistory(userId: string): Promise<ChatHistory[]>;
  getChatHistoryByTopic(userId: string, topic: string): Promise<ChatHistory[]>;
  getAllUsersWithStats(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date | null;
    questionCounts: Record<string, number>;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content);
  }

  async getContentByTopic(topic: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.topic, topic));
  }

  async getAvailableTopics(): Promise<string[]> {
    const results = await db
      .selectDistinct({ topic: content.topic })
      .from(content)
      .orderBy(content.topic);
    return results.map(r => r.topic);
  }

  async createContent(item: InsertContent): Promise<Content> {
    const [newItem] = await db.insert(content).values(item).returning();
    return newItem;
  }

  async clearContentByTopic(topic: string): Promise<void> {
    await db.delete(content).where(eq(content.topic, topic));
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

  async getTopicExperience(userId: string, topic: string): Promise<TopicExperience | undefined> {
    const [result] = await db
      .select()
      .from(topicExperience)
      .where(and(eq(topicExperience.userId, userId), eq(topicExperience.topic, topic)));
    return result;
  }

  async setTopicExperience(data: InsertTopicExperience): Promise<TopicExperience> {
    const existing = await this.getTopicExperience(data.userId, data.topic);
    if (existing) {
      const [result] = await db
        .update(topicExperience)
        .set({ experience: data.experience })
        .where(eq(topicExperience.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(topicExperience).values(data).returning();
    return result;
  }

  async logChatHistory(data: InsertChatHistory): Promise<ChatHistory> {
    const [result] = await db.insert(chatHistory).values(data).returning();
    return result;
  }

  async getChatHistory(userId: string): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.createdAt));
  }

  async getChatHistoryByTopic(userId: string, topic: string): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(and(eq(chatHistory.userId, userId), eq(chatHistory.topic, topic)))
      .orderBy(desc(chatHistory.createdAt));
  }

  async getAllUsersWithStats(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date | null;
    questionCounts: Record<string, number>;
  }>> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const topicCounts = await db.execute(sql`
      SELECT user_id, topic, COUNT(*)::int as cnt
      FROM chat_history
      GROUP BY user_id, topic
    `);
    const countMap: Record<string, Record<string, number>> = {};
    for (const row of topicCounts.rows as any[]) {
      if (!countMap[row.user_id]) countMap[row.user_id] = {};
      countMap[row.user_id][row.topic] = row.cnt;
    }
    return allUsers.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      questionCounts: countMap[u.id] || {},
    }));
  }
}

export const storage = new DatabaseStorage();
