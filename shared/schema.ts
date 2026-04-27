import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  role: text("role"),
  industry: text("industry"),
  goal: text("goal"),
  challenge: text("challenge"),
  learningPreference: text("learning_preference"),
  preferredLanguage: text("preferred_language"),
  completedOnboarding: boolean("completed_onboarding").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export const topicExperience = pgTable("topic_experience", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  topic: text("topic").notNull(),
  experience: text("experience").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopicExperienceSchema = createInsertSchema(topicExperience).omit({
  id: true,
  createdAt: true,
});

export type TopicExperience = typeof topicExperience.$inferSelect;
export type InsertTopicExperience = z.infer<typeof insertTopicExperienceSchema>;

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  found: boolean("found").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatHistorySchema = createInsertSchema(chatHistory).omit({
  id: true,
  createdAt: true,
});

export type ChatHistory = typeof chatHistory.$inferSelect;
export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  unitId: text("unit_id"),
  topic: text("topic").notNull(),
  topicLabelPt: text("topic_label_pt"),
  subtopic: text("subtopic").notNull(),
  searchContext: text("search_context"),
  keywords: text("keywords"),
  keyTakeaway: text("key_takeaway"),
  difficulty: text("difficulty"),
  useCase: text("use_case"),
  timestampLink: text("timestamp_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const unansweredQuestions = pgTable("unanswered_questions", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  userId: varchar("user_id"),
  userEmail: varchar("user_email"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewed: boolean("reviewed").default(false),
});

export const adminResponses = pgTable("admin_responses", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userId: varchar("user_id").notNull(),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  response: text("response").notNull(),
  adminId: varchar("admin_id").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentSchema = createInsertSchema(content).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUnansweredQuestionSchema = createInsertSchema(unansweredQuestions).omit({ 
  id: true, 
  createdAt: true,
  reviewed: true
});

export const insertAdminResponseSchema = createInsertSchema(adminResponses).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type UnansweredQuestion = typeof unansweredQuestions.$inferSelect;
export type InsertUnansweredQuestion = z.infer<typeof insertUnansweredQuestionSchema>;
export type AdminResponse = typeof adminResponses.$inferSelect;
export type InsertAdminResponse = z.infer<typeof insertAdminResponseSchema>;
