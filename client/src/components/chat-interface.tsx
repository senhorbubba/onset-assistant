import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Send, User, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: `Hello! I'm your assistant for **${topic}**. Ask me anything about this topic!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useChat();

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    try {
      const response = await chatMutation.mutateAsync({
        topic,
        question: userMessage.content,
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
        content: "I'm having trouble connecting right now. Please try again later.",
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

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto glass rounded-2xl overflow-hidden shadow-2xl border border-white/20">
      {/* Header */}
      <div className="p-4 bg-white/50 border-b border-border/50 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src={onsetLogo} alt="Onset" className="w-10 h-10 rounded-xl" />
          <div>
            <h3 className="font-bold text-lg text-foreground">Onset Assistant</h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Topic: {topic}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/30 to-white/10"
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
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {msg.role === "user" ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary text-primary-foreground">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <img src={onsetLogo} alt="Onset" className="w-8 h-8 rounded-full shrink-0 shadow-sm border border-border" />
              )}
              
              <div className={cn(
                "p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-white text-foreground border border-border/50 rounded-tl-none"
              )}>
                {msg.content}
                {msg.link && (
                  <a 
                    href={msg.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                    data-testid="link-resource"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Learn more
                  </a>
                )}
              </div>
            </motion.div>
          ))}
          
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 mr-auto max-w-[85%]"
            >
              <img src={onsetLogo} alt="Onset" className="w-8 h-8 rounded-full shrink-0 border border-border" />
              <div className="p-4 bg-white border border-border/50 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/50 border-t border-border/50 backdrop-blur-sm">
        <div className="flex gap-2 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${topic}...`}
            className="min-h-[60px] max-h-[120px] pr-12 resize-none rounded-xl border-border bg-white shadow-sm focus-visible:ring-primary/20"
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg shadow-md transition-transform active:scale-95"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
