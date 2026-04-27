import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Content, UnansweredQuestion } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

export type TopicOption = { topic: string; label: string };

export function useTopics() {
  const { language } = useLanguage();
  return useQuery<TopicOption[]>({
    queryKey: ["/api/topics", language],
    queryFn: async () => {
      const res = await fetch(`/api/topics?language=${encodeURIComponent(language)}`);
      if (!res.ok) throw new Error("Failed to fetch topics");
      return res.json();
    },
  });
}

export function useContentByTopic(topic: string) {
  return useQuery<Content[]>({
    queryKey: ["/api/content", topic],
    enabled: !!topic,
  });
}

export function useContentList() {
  return useQuery<Content[]>({
    queryKey: ["/api/content"],
  });
}

export function useUnansweredList() {
  return useQuery<UnansweredQuestion[]>({
    queryKey: ["/api/unanswered"],
  });
}

export function useUploadJSON() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/content/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<{ message: string; count: number; topic: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
    },
  });
}
