import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquareText, ShieldQuestion, Globe, Loader2, Bell, X, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTopics } from "@/hooks/use-content";
import { useToast } from "@/hooks/use-toast";
import onsetLogo from "@assets/onset_logo.png";

export default function Home() {
  const [initialMessage] = useState<string | undefined>(() => new URLSearchParams(window.location.search).get("q") || undefined);
  const [initialTopic] = useState<string | undefined>(() => new URLSearchParams(window.location.search).get("topic") || undefined);
  const [topic, setTopic] = useState<string>("");
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: topics, isLoading: topicsLoading } = useTopics();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: notifCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && showNotifications,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    if (showNotifications) {
      refetchNotifications();
    }
  }, [showNotifications, refetchNotifications]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-select topic when arriving with ?topic= or ?q= param from profile
  useEffect(() => {
    if (initialMessage && topics && topics.length > 0 && !topic) {
      if (initialTopic) {
        const found = topics.find(t => t === initialTopic);
        if (found) {
          setTopic(found);
        } else {
          // Topic no longer exists — warn and let user pick
          toast({
            title: "Topic not available",
            description: `"${initialTopic}" is no longer in the knowledge base. Please choose a topic below.`,
            variant: "destructive",
          });
        }
      } else {
        // Fallback: extract from 'Tell me about "TopicName"' pattern
        const match = initialMessage.match(/Tell me about "([^"]+)"/i);
        const targetTopic = match ? match[1] : null;
        const found = targetTopic ? topics.find(t => t === targetTopic) : null;
        setTopic(found || topics[0]);
      }
    }
  }, [initialMessage, topics]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && profile !== undefined && (profile === null || !profile.completedOnboarding)) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-foreground">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl opacity-60" />
      </div>

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-2">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-back-landing">
            <img src={onsetLogo} alt="onset." className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-display tracking-tight">onset. Assistant</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-xs sm:text-sm px-2" data-testid="select-language">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="pt-BR">PT</SelectItem>
            </SelectContent>
          </Select>
          {!authLoading && isAuthenticated && (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  data-testid="button-notifications"
                >
                  <Bell className="w-5 h-5 text-slate-500" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white" data-testid="badge-notif-count">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900">{t.notifications.title}</h3>
                        <div className="flex items-center gap-1">
                          {notifications.length > 0 && (
                            <button
                              onClick={() => markAllRead.mutate()}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              data-testid="button-mark-all-read"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              {t.notifications.markAllRead}
                            </button>
                          )}
                          <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded">
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            {t.notifications.noNotifications}
                          </div>
                        ) : (
                          notifications.map((notif: any) => (
                            <div
                              key={notif.id}
                              className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? "bg-primary/5" : ""}`}
                              onClick={() => {
                                if (!notif.read) markOneRead.mutate(notif.id);
                                setTopic(notif.topic);
                                setShowNotifications(false);
                              }}
                              data-testid={`notification-${notif.id}`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="shrink-0 mt-0.5">
                                  <div className={`w-2 h-2 rounded-full ${!notif.read ? "bg-primary" : "bg-transparent"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] shrink-0">{notif.topic}</Badge>
                                    {!notif.read && (
                                      <Badge variant="default" className="text-[10px] px-1.5 py-0">{t.notifications.new}</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">{t.notifications.yourQuestion}: "{notif.question}"</p>
                                  <p className="text-sm text-slate-800 leading-snug">{notif.response}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Link href="/profile">
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 cursor-pointer ring-2 ring-primary/20 ring-offset-1" data-testid="link-profile">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {(user?.firstName?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          )}
        </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 flex flex-col items-center">
        {!topic ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-2xl"
          >
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rotate-3">
              <MessageSquareText className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
            </div>
            
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold font-display text-slate-900 mb-4 sm:mb-6 tracking-tight leading-tight">
              {t.home.heroTitle1}<br/>
              <span className="text-primary">
                {t.home.heroTitle2}
              </span>
            </h2>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-500 mb-3 sm:mb-4 max-w-lg leading-relaxed px-2">
              {t.home.heroSubtitle}
            </p>
            <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-10 max-w-lg leading-relaxed px-2">
              {t.home.heroTagline}
            </p>

            <div className="w-full max-w-xs space-y-4 px-2">
              <div className="bg-white p-1 rounded-xl shadow-lg border border-slate-100">
                {topicsLoading ? (
                  <div className="flex items-center justify-center h-12">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : topics && topics.length > 0 ? (
                  <Select onValueChange={(val) => setTopic(val)}>
                    <SelectTrigger className="w-full h-12 border-none bg-transparent focus:ring-0 text-base" data-testid="select-topic">
                      <SelectValue placeholder={t.home.selectTopic} />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t} value={t} data-testid={`option-topic-${t}`}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-center h-12 text-sm text-muted-foreground">
                    {t.home.noTopicsYet}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-400">
                <ShieldQuestion className="w-4 h-4 shrink-0" />
                <span>{t.home.verifiedByExperts}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full max-w-4xl mb-3 sm:mb-6 flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setTopic("")}
                className="text-muted-foreground hover:text-foreground -ml-2 sm:-ml-4 text-xs sm:text-sm"
              >
                ← {t.home.chooseAnotherTopic}
              </Button>
            </div>
            
            <ChatInterface topic={topic} initialMessage={initialMessage} />
          </motion.div>
        )}
      </main>

    </div>
  );
}
