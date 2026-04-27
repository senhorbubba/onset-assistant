import { db } from "./db";
import {
  content,
  unansweredQuestions,
  adminResponses,
  userProfiles,
  topicExperience,
  chatHistory,
  users,
  type Content,
  type InsertContent,
  type UnansweredQuestion,
  type InsertUnansweredQuestion,
  type AdminResponse,
  type InsertAdminResponse,
  type UserProfile,
  type InsertUserProfile,
  type TopicExperience,
  type InsertTopicExperience,
  type ChatHistory,
  type InsertChatHistory,
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { translateTopicToPortuguese } from "./ai";

// Dedupes concurrent translation requests for the same topic so we don't fire
// duplicate AI calls when several users hit /api/topics at once.
const pendingTopicTranslations = new Map<string, Promise<string>>();

export interface IStorage {
  getAllContent(): Promise<Content[]>;
  getContentByTopic(topic: string): Promise<Content[]>;
  getAvailableTopics(language?: string): Promise<{ topic: string; label: string }[]>;
  createContent(item: InsertContent): Promise<Content>;
  clearContentByTopic(topic: string): Promise<void>;
  clearAllContent(): Promise<void>;
  bulkCreateContent(items: InsertContent[]): Promise<void>;
  upsertContentBatch(items: InsertContent[]): Promise<{ added: number; updated: number }>;
  logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion>;
  getUnansweredQuestions(): Promise<UnansweredQuestion[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  getTopicExperience(userId: string, topic: string): Promise<TopicExperience | undefined>;
  setTopicExperience(data: InsertTopicExperience): Promise<TopicExperience>;
  logChatHistory(data: InsertChatHistory): Promise<ChatHistory>;
  getChatHistory(userId: string): Promise<ChatHistory[]>;
  getChatHistoryByTopic(userId: string, topic: string): Promise<ChatHistory[]>;
  getMonthlyMessageCount(): Promise<number>;
  getAllUsersWithStats(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean | null;
    whatsappPhone: string | null;
    createdAt: Date | null;
    questionCounts: Record<string, number>;
  }>>;
  isUserAdmin(userId: string): Promise<boolean>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<void>;
  getUserByWhatsappPhone(phone: string): Promise<{ id: string; email: string | null; firstName: string | null; } | null>;
  setUserWhatsappPhone(userId: string, phone: string | null): Promise<void>;
  setUserPreferredLanguage(userId: string, language: string): Promise<void>;
  respondToQuestion(data: InsertAdminResponse): Promise<AdminResponse>;
  markQuestionReviewed(questionId: number): Promise<void>;
  getNotifications(userId: string): Promise<AdminResponse[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(notificationId: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnansweredQuestionById(id: number): Promise<UnansweredQuestion | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content);
  }

  async getContentByTopic(topic: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.topic, topic));
  }

  async getAvailableTopics(language?: string): Promise<{ topic: string; label: string }[]> {
    const results = await db
      .selectDistinct({ topic: content.topic, topicLabelPt: content.topicLabelPt })
      .from(content)
      .orderBy(content.topic);

    if (language !== "pt-BR") {
      return results.map(r => ({ topic: r.topic, label: r.topic }));
    }

    // For PT, fill in any missing translations via AI and persist to DB so
    // future requests are instant.
    await Promise.all(
      results
        .filter(r => !r.topicLabelPt)
        .map(async (r) => {
          try {
            let promise = pendingTopicTranslations.get(r.topic);
            if (!promise) {
              promise = translateTopicToPortuguese(r.topic).then(async (translated) => {
                await db
                  .update(content)
                  .set({ topicLabelPt: translated })
                  .where(eq(content.topic, r.topic));
                return translated;
              });
              pendingTopicTranslations.set(r.topic, promise);
              promise.finally(() => pendingTopicTranslations.delete(r.topic));
            }
            r.topicLabelPt = await promise;
          } catch {
            // On failure, fall back to the English topic name for this request.
          }
        })
    );

    return results.map(r => ({
      topic: r.topic,
      label: r.topicLabelPt || r.topic,
    }));
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

  async upsertContentBatch(items: InsertContent[]): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;
    for (const item of items) {
      const [existing] = await db
        .select()
        .from(content)
        .where(and(eq(content.topic, item.topic), eq(content.subtopic, item.subtopic)));
      if (existing) {
        await db.update(content).set(item).where(eq(content.id, existing.id));
        updated++;
      } else {
        await db.insert(content).values(item);
        added++;
      }
    }
    return { added, updated };
  }

  async logUnansweredQuestion(item: InsertUnansweredQuestion): Promise<UnansweredQuestion> {
    const [newItem] = await db.insert(unansweredQuestions).values(item).returning();
    return newItem;
  }

  async getUnansweredQuestions(): Promise<UnansweredQuestion[]> {
    return await db.select().from(unansweredQuestions).where(eq(unansweredQuestions.reviewed, false)).orderBy(desc(unansweredQuestions.createdAt));
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

  async getMonthlyMessageCount(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM chat_history
      WHERE created_at >= date_trunc('month', now())
    `);
    const rows = result.rows as Array<{ cnt: number }>;
    return rows[0]?.cnt ?? 0;
  }

  async getAllUsersWithStats(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean | null;
    whatsappPhone: string | null;
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
      isAdmin: u.isAdmin,
      whatsappPhone: u.whatsappPhone ?? null,
      createdAt: u.createdAt,
      questionCounts: countMap[u.id] || {},
    }));
  }

  async isUserAdmin(userId: string): Promise<boolean> {
    const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
    return user?.isAdmin === true;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
  }

  async getUserByWhatsappPhone(phone: string): Promise<{ id: string; email: string | null; firstName: string | null; } | null> {
    const [user] = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.whatsappPhone, phone));
    return user ?? null;
  }

  async setUserWhatsappPhone(userId: string, phone: string | null): Promise<void> {
    await db.update(users).set({ whatsappPhone: phone }).where(eq(users.id, userId));
  }

  async setUserPreferredLanguage(userId: string, language: string): Promise<void> {
    await db
      .insert(userProfiles)
      .values({ userId, preferredLanguage: language })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { preferredLanguage: language, updatedAt: new Date() },
      });
  }

  async respondToQuestion(data: InsertAdminResponse): Promise<AdminResponse> {
    const [result] = await db.insert(adminResponses).values(data).returning();
    return result;
  }

  async markQuestionReviewed(questionId: number): Promise<void> {
    await db.update(unansweredQuestions).set({ reviewed: true }).where(eq(unansweredQuestions.id, questionId));
  }

  async getNotifications(userId: string): Promise<AdminResponse[]> {
    return await db
      .select()
      .from(adminResponses)
      .where(eq(adminResponses.userId, userId))
      .orderBy(desc(adminResponses.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminResponses)
      .where(and(eq(adminResponses.userId, userId), eq(adminResponses.read, false)));
    return result?.count || 0;
  }

  async markNotificationRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(adminResponses)
      .set({ read: true })
      .where(and(eq(adminResponses.id, notificationId), eq(adminResponses.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(adminResponses)
      .set({ read: true })
      .where(eq(adminResponses.userId, userId));
  }

  async getUnansweredQuestionById(id: number): Promise<UnansweredQuestion | undefined> {
    const [result] = await db.select().from(unansweredQuestions).where(eq(unansweredQuestions.id, id));
    return result;
  }
}

export const storage = new DatabaseStorage();
