import { storage } from "./storage";
import type { Content } from "@shared/schema";

const cache = new Map<string, { items: Content[]; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getContentCached(topic: string): Promise<Content[]> {
  const cached = cache.get(topic);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.items;
  const items = await storage.getContentByTopic(topic);
  cache.set(topic, { items, ts: Date.now() });
  return items;
}

export function invalidateContentCache(topic?: string): void {
  if (topic) {
    cache.delete(topic);
  } else {
    cache.clear();
  }
}
