import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertContent } from "@shared/routes";

export function useContentList() {
  return useQuery({
    queryKey: [api.content.list.path],
    queryFn: async () => {
      const res = await fetch(api.content.list.path);
      if (!res.ok) throw new Error("Failed to fetch content");
      return api.content.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertContent) => {
      const validated = api.content.create.input.parse(data);
      const res = await fetch(api.content.create.path, {
        method: api.content.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Validation failed");
        }
        throw new Error("Failed to create content");
      }
      
      return api.content.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.content.list.path] });
    },
  });
}

export function useUnansweredList() {
  return useQuery({
    queryKey: [api.unanswered.list.path],
    queryFn: async () => {
      const res = await fetch(api.unanswered.list.path);
      if (!res.ok) throw new Error("Failed to fetch unanswered questions");
      return api.unanswered.list.responses[200].parse(await res.json());
    },
  });
}

export function useSyncFromSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.sync.trigger.path, {
        method: api.sync.trigger.method,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sync");
      }
      return api.sync.trigger.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.content.list.path] });
    },
  });
}
