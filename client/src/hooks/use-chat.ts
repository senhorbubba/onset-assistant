import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ChatRequest, type ChatResponse } from "@shared/routes";

export function useChat() {
  return useMutation({
    mutationFn: async (data: ChatRequest) => {
      // Validate input using Zod schema from api definition if possible, 
      // or just trust the types for now since api.chat.ask.input is available
      const validated = api.chat.ask.input.parse(data);
      
      const res = await fetch(api.chat.ask.path, {
        method: api.chat.ask.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      // Validate response
      const json = await res.json();
      return api.chat.ask.responses[200].parse(json);
    },
  });
}
