import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(), // 'AI Skills' or 'Communication'
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  keywords: text("keywords").array(), // Array of keywords for matching
  createdAt: timestamp("created_at").defaultNow(),
});

export const unansweredQuestions = pgTable("unanswered_questions", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  reviewed: boolean("reviewed").default(false),
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

export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type UnansweredQuestion = typeof unansweredQuestions.$inferSelect;
export type InsertUnansweredQuestion = z.infer<typeof insertUnansweredQuestionSchema>;

// API Types
export type ChatRequest = {
  topic: string;
  question: string;
};

export type ChatResponse = {
  answer: string;
  found: boolean;
};
