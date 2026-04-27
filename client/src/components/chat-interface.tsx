import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Send, User, Sparkles, Loader2, Play, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import onsetLogo from "@assets/onset_logo.png";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  link?: string | null;
  suggestions?: string[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  topic: string;
  topicLabel?: string;
  initialMessage?: string;
}

export function ChatInterface({ topic, topicLabel, initialMessage }: ChatInterfaceProps) {
  const displayTopic = topicLabel ?? topic;
  const { language, t, setLanguage } = useLanguage();
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
      content: t.chat.welcomeMessage(displayTopic),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Always holds the latest sendMessage so the initialMessage effect never closes over stale state.
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  function getEmbedInfo(url: string): { embedUrl: string; embeddable: boolean } {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const videoId = u.hostname.includes('youtu.be')
          ? u.pathname.slice(1)
          : u.searchParams.get('v') || '';
        const start = u.searchParams.get('t')?.replace('s', '') || '0';
        return { embedUrl: `https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=1`, embeddable: true };
      }
      if (u.hostname.includes('loom.com')) {
        const embedUrl = url.replace('share', 'embed');
        return { embedUrl, embeddable: true };
      }
      if (u.hostname.includes('vimeo.com')) {
        const videoId = u.pathname.split('/').filter(Boolean)[0];
        return { embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`, embeddable: true };
      }
      // PDFs, webpages, etc. — open in new tab
      return { embedUrl: url, embeddable: false };
    } catch {
      return { embedUrl: url, embeddable: false };
    }
  }
  
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
        content: t.chat.welcomeMessage(displayTopic),
        timestamp: new Date(),
      },
    ]);
  }, [language, topic, displayTopic]);

  useEffect(() => { sendMessageRef.current = sendMessage; });

  useEffect(() => {
    if (initialMessage && topic) {
      const timer = setTimeout(() => sendMessageRef.current(initialMessage), 300);
      return () => clearTimeout(timer);
    }
  }, [initialMessage, topic]);

  function detectLangSwitch(text: string): "en" | "pt-BR" | null {
    const t = text.trim().toLowerCase();
    if (/english|inglês|inglés/.test(t)) return "en";
    if (/portugu[eê]s|portugues/.test(t)) return "pt-BR";
    return null;
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setConversationStarted(true);

    // Detect language switch intent before sending so we can update the UI
    // language immediately when the bot confirms the switch.
    const switchTo = detectLangSwitch(text);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    const conversationHistory = updatedMessages
      .filter(m => m.id !== "welcome" && m.content.trim().length > 0)
      .map(m => ({ role: m.role as "user" | "bot", content: m.content }));

    try {
      const response = await chatMutation.mutateAsync({
        topic,
        question: userMessage.content,
        language,
        // Exclude the just-sent message; cap at 6 to avoid large payloads (server trims anyway)
        history: conversationHistory.slice(0, -1).slice(-6),
      });

      // If the user asked to switch language and the bot confirmed it,
      // update the UI language so subsequent messages go in the right language.
      if (switchTo) setLanguage(switchTo);

      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        content: response.answer,
        link: response.link,
        suggestions: response.suggestions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const isTimeout = error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
      const errorContent = isTimeout
        ? (language === "pt-BR"
            ? "Desculpe, a resposta está demorando mais do que o esperado. Por favor, tente novamente."
            : "Sorry, this is taking longer than usual. Please try again in a moment.")
        : t.chat.errorMessage;
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleSend = () => sendMessage(input);

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
            <img src={onsetLogo} alt="Onset" className="w-10 h-10 object-contain" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2" data-testid="text-experience-question">
            {t.topicExperience.question(displayTopic)}
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
          <img src={onsetLogo} alt="Onset" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground">onset. Assistant</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t.chat.topic}: {displayTopic}
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
          {messages.filter(msg => msg.role === "user" || msg.content.trim().length > 0).map((msg, msgIdx, arr) => (
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
                <img src={onsetLogo} alt="Onset" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
              )}
              
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none whitespace-pre-wrap" 
                  : "bg-white text-foreground border border-border/50 rounded-tl-none prose prose-sm max-w-none prose-a:text-primary prose-a:underline prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground"
              )}>
                {msg.role === "bot" ? (
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => {
                        if (!href) return <span>{children}</span>;
                        const { embeddable } = getEmbedInfo(href);
                        return embeddable ? (
                          <a
                            href={href}
                            onClick={(e) => { e.preventDefault(); setPopupUrl(href); }}
                            className="text-primary hover:underline font-medium cursor-pointer"
                            data-testid="link-markdown"
                          >
                            {children}
                          </a>
                        ) : (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                            data-testid="link-markdown"
                          >
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : msg.content}
                {msg.link && (() => {
                  const { embeddable } = getEmbedInfo(msg.link);
                  return embeddable ? (
                    <button
                      onClick={() => setPopupUrl(msg.link!)}
                      className="mt-2 flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                      data-testid="link-resource"
                    >
                      <Play className="w-4 h-4" />
                      {t.chat.watchVideo}
                    </button>
                  ) : (
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
                  );
                })()}
                {/* Suggestion chips — only on the latest bot message */}
                {msg.role === "bot" && msg.suggestions && msg.suggestions.length > 0 && msgIdx === arr.length - 1 && !chatMutation.isPending && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all duration-150"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
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
              <img src={onsetLogo} alt="Onset" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
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
        {/* Entry chips — shown before first message */}
        {!conversationStarted && (
          <div className="flex flex-wrap gap-2 mb-3">
            {t.chat.entryChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  if (chip.message) {
                    sendMessage(chip.message);
                  } else {
                    setConversationStarted(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-border text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-150 shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder(displayTopic)}
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

      {/* Video popup modal */}
      {popupUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPopupUrl(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPopupUrl(null)}
              className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={getEmbedInfo(popupUrl).embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
