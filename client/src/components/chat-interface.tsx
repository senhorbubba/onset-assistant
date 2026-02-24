import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Send, User, Sparkles, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import onsetLogo from "@assets/ONSET_ELEMENTOS_Prancheta_1_1770928342014.png";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  link?: string | null;
  timestamp: Date;
}

interface ChatInterfaceProps {
  topic: string;
}

export function ChatInterface({ topic }: ChatInterfaceProps) {
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: topicExp, isLoading: expLoading } = useQuery({
    queryKey: ["/api/topic-experience", topic],
    queryFn: async () => {
      const res = await fetch(`/api/topic-experience/${encodeURIComponent(topic)}`, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const saveExperience = useMutation({
    mutationFn: async (experience: string) => {
      const res = await fetch("/api/topic-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic, experience }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-experience", topic] });
    },
  });

  const needsExperiencePrompt = isAuthenticated && !expLoading && topicExp === null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: t.chat.welcomeMessage(topic),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "bot",
        content: t.chat.welcomeMessage(topic),
        timestamp: new Date(),
      },
    ]);
  }, [language, topic]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    const conversationHistory = updatedMessages
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role as "user" | "bot", content: m.content }));
    
    try {
      const response = await chatMutation.mutateAsync({
        topic,
        question: userMessage.content,
        language,
        history: conversationHistory.slice(0, -1),
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: response.answer,
        link: response.link,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: t.chat.errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (needsExperiencePrompt) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="mb-4 p-3 bg-primary/10 rounded-xl w-fit mx-auto">
            <img src={onsetLogo} alt="Onset" className="w-10 h-10 rounded-lg" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2" data-testid="text-experience-question">
            {t.topicExperience.question(topic)}
          </h3>
          <div className="space-y-3 mt-6">
            {[
              { value: "beginner", label: t.topicExperience.beginner },
              { value: "intermediate", label: t.topicExperience.intermediate },
              { value: "advanced", label: t.topicExperience.advanced },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="w-full h-12"
                onClick={() => saveExperience.mutate(opt.value)}
                disabled={saveExperience.isPending}
                data-testid={`button-topic-exp-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] sm:h-[600px] w-full max-w-4xl mx-auto glass rounded-none sm:rounded-2xl overflow-hidden shadow-none sm:shadow-2xl border-0 sm:border sm:border-white/20">
      <div className="p-3 sm:p-4 bg-white/50 border-b border-border/50 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={onsetLogo} alt="Onset" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl" />
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground">onset. Assistant</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t.chat.topic}: {topic}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t.chat.online}</span>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-white/30 to-white/10"
        ref={scrollRef}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-2 sm:gap-4 max-w-[90%] sm:max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {msg.role === "user" ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary text-primary-foreground">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              ) : (
                <img src={onsetLogo} alt="Onset" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 shadow-sm border border-border" />
              )}
              
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-white text-foreground border border-border/50 rounded-tl-none"
              )}>
                {msg.content}
                {msg.link && msg.link.includes('youtube.com') && (() => {
                  const url = new URL(msg.link!);
                  const videoId = url.searchParams.get('v');
                  const startTime = url.searchParams.get('t')?.replace('s', '') || '0';
                  const embedSrc = `https://www.youtube.com/embed/${videoId}?start=${startTime}`;
                  return (
                    <div className="mt-3">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute inset-0 w-full h-full rounded-lg"
                          src={embedSrc}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  );
                })()}
                {msg.link && !msg.link.includes('youtube.com') && (
                  <a 
                    href={msg.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                    data-testid="link-resource"
                  >
                    <Play className="w-4 h-4" />
                    {t.chat.watchVideo}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
          
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 sm:gap-4 mr-auto max-w-[90%] sm:max-w-[85%]"
            >
              <img src={onsetLogo} alt="Onset" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 border border-border" />
              <div className="p-3 sm:p-4 bg-white border border-border/50 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 sm:p-4 bg-white/50 border-t border-border/50 backdrop-blur-sm">
        <div className="flex gap-2 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder(topic)}
            className="min-h-[48px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] pr-12 resize-none rounded-xl border-border bg-white shadow-sm focus-visible:ring-primary/20 text-sm sm:text-base"
            data-testid="input-question"
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 rounded-lg shadow-md transition-transform active:scale-95"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            data-testid="button-send"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="hidden sm:block text-center text-[10px] text-muted-foreground mt-2">
          {t.chat.enterToSend}
        </p>
      </div>
    </div>
  );
}
