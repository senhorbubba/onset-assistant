import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, MessageSquare, BookOpen, CheckCircle, Clock, LogOut, Settings, Mail, Phone, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import onsetLogo from "@assets/onset_logo.png";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: chatHistory = [] } = useQuery({
    queryKey: ["/api/chat-history"],
    queryFn: async () => {
      const res = await fetch("/api/chat-history", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [challenge, setChallenge] = useState("");
  const [learningPreference, setLearningPreference] = useState("");
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showLearningPref, setShowLearningPref] = useState(false);

  useEffect(() => {
    if (profile) {
      setRole(profile.role || "");
      setIndustry(profile.industry || "");
      setGoal(profile.goal || "");
      setChallenge(profile.challenge || "");
      setLearningPreference(profile.learningPreference || "");
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowPersonalInfo(false);
      setShowLearningPref(false);
      toast({ title: t.profile.saved, description: t.profile.savedDesc });
    },
  });

  const toggleEmailNotifications = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailNotifications: enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const linkedPhone: string | null = (user as any)?.whatsappPhone ?? null;
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("");
  const [whatsappStep, setWhatsappStep] = useState<"idle" | "code-sent">("idle");

  const requestCode = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch("/api/profile/whatsapp/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => { setWhatsappStep("code-sent"); toast({ title: "Code sent", description: "Check your WhatsApp for the 6-digit code." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const verifyCode = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: whatsappPhone, code: whatsappCode }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setWhatsappStep("idle");
      setWhatsappCode("");
      toast({ title: "Verified", description: "WhatsApp number linked successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unlinkWhatsapp = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/whatsapp", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setWhatsappPhone("");
      setWhatsappStep("idle");
      toast({ title: "Unlinked", description: "WhatsApp number removed." });
    },
    onError: () => toast({ title: "Error", description: "Could not unlink.", variant: "destructive" }),
  });

  const [learningSummary, setLearningSummary] = useState<{ summary: string; suggestedTopics: Array<{ label: string; topic: string }> } | null>(null);
  const generateSummary = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/profile/learning-summary?lang=${language}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ summary: string; suggestedTopics: Array<{ label: string; topic: string }> }>;
    },
    onSuccess: (data) => setLearningSummary(data),
    onError: () => toast({ title: "Error", description: "Could not generate summary", variant: "destructive" }),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/bot");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const questionsAsked = chatHistory.length;
  const topicsExplored = new Set(chatHistory.map((h: any) => h.topic)).size;
  const answersReceived = chatHistory.filter((h: any) => h.found).length;

  const learningOptions = [
    { value: "quick_tips", label: t.profile.quickTips },
    { value: "step_by_step", label: t.profile.stepByStep },
    { value: "examples", label: t.profile.examples },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/bot")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t.profile.backToHome}
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <img src={onsetLogo} alt="Onset" className="w-6 h-6 object-contain" />
          <span className="text-sm font-bold font-display tracking-tight">onset. Assistant</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-primary/20 ring-offset-2">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || ""} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
              {(user?.firstName?.[0] || "").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
              {`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || t.profile.title}
            </h1>
            <p className="text-sm text-slate-500 truncate">{user?.email || ""}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="default" size="sm" onClick={() => navigate("/bot")} data-testid="button-back-learning">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t.profile.backToHome}
            </Button>
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-1" />
              {t.profile.signOut}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN — main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Learning Summary — top */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Learning Summary</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateSummary.mutate()}
                  disabled={generateSummary.isPending || chatHistory.length === 0}
                >
                  {generateSummary.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
                    : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate</>
                  }
                </Button>
              </div>
              {!learningSummary && !generateSummary.isPending && (
                <p className="text-sm text-slate-400">Click Generate to get an AI summary of your learning journey.</p>
              )}
              {learningSummary && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                    {learningSummary.summary}
                  </p>
                  {learningSummary.suggestedTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Explore next</p>
                      <div className="flex flex-wrap gap-2">
                        {learningSummary.suggestedTopics.map((s) => (
                          <button
                            key={s.label}
                            onClick={() => navigate(`/bot?topic=${encodeURIComponent(s.topic)}&q=${encodeURIComponent(`Tell me about "${s.label}"`)}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-full transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Activity — stats + full question history combined */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Activity</h2>
                <Badge variant="secondary" className="text-xs">{questionsAsked} questions</Badge>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900" data-testid="text-questions-count">{questionsAsked}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.profile.questionsAsked}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900" data-testid="text-topics-count">{topicsExplored}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.profile.topicsExplored}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900" data-testid="text-answers-count">{answersReceived}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.profile.answersReceived}</p>
                </div>
              </div>

              {/* Question history */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t.profile.recentQuestions}</p>
              {chatHistory.length === 0 ? (
                <p className="text-sm text-slate-400" data-testid="text-no-history">{t.profile.noHistory}</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {chatHistory.map((item: any) => (
                    <div key={item.id} className="border-b border-slate-100 pb-3 last:border-0">
                      <div className="flex items-start gap-2">
                        <Badge variant={item.found ? "default" : "secondary"} className="shrink-0 text-[10px] mt-0.5">
                          {item.topic}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 font-medium" data-testid={`text-history-question-${item.id}`}>
                        {item.question}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN — sidebar */}
          <div className="space-y-4">

            {/* WhatsApp */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-green-600" />
                <h2 className="text-sm font-bold text-slate-900">WhatsApp</h2>
              </div>
              {/* Bot number — always visible */}
              <a
                href="https://wa.me/551153045402"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 mb-3 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-green-700 font-medium">Chat with bot</span>
                  <span className="text-xs text-green-600 font-mono">+55 11 5304-5402</span>
                </div>
              </a>
              {linkedPhone ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="font-medium">+{linkedPhone}</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs text-slate-500" onClick={() => unlinkWhatsapp.mutate()} disabled={unlinkWhatsapp.isPending}>
                    {unlinkWhatsapp.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Unlink number
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">Link your number to receive answers on WhatsApp. You must message the bot first to activate the connection.</p>
                  {whatsappStep === "idle" ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="5511940484040"
                          className="border rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                        />
                        <Button size="sm" onClick={() => requestCode.mutate(whatsappPhone)} disabled={requestCode.isPending || !whatsappPhone.trim()}>
                          {requestCode.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send code"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">Code sent to <strong>+{whatsappPhone.replace(/\D/g, "")}</strong> via WhatsApp.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="6-digit code"
                          maxLength={6}
                          className="border rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-widest font-mono"
                          value={whatsappCode}
                          onChange={(e) => setWhatsappCode(e.target.value.replace(/\D/g, ""))}
                        />
                        <Button size="sm" onClick={() => verifyCode.mutate()} disabled={verifyCode.isPending || whatsappCode.length < 6}>
                          {verifyCode.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify"}
                        </Button>
                      </div>
                      <button className="text-xs text-primary hover:underline" onClick={() => { setWhatsappStep("idle"); setWhatsappCode(""); }}>
                        Change number or resend
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Email notifications */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">{t.profile.emailNotifications}</h2>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">
                  {profile?.emailNotifications !== false ? t.profile.emailNotificationsOn : t.profile.emailNotificationsOff}
                </span>
                <Switch
                  checked={profile?.emailNotifications !== false}
                  onCheckedChange={(checked) => toggleEmailNotifications.mutate(checked)}
                  disabled={toggleEmailNotifications.isPending}
                  data-testid="switch-email-notifications"
                />
              </div>
            </Card>

            {/* Personal Info — collapsible */}
            <Card className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setShowPersonalInfo(!showPersonalInfo)}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">{t.profile.personalInfo}</span>
                </div>
                {showPersonalInfo ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showPersonalInfo && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
                  <div className="pt-3">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t.profile.role}</label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-9 text-sm" data-testid="select-profile-role">
                        <SelectValue placeholder={t.onboarding.rolePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(t.onboarding.roleOptions).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t.profile.industry}</label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="h-9 text-sm" data-testid="select-profile-industry">
                        <SelectValue placeholder={t.onboarding.industryPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(t.onboarding.industryOptions).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t.profile.goal}</label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger className="h-9 text-sm" data-testid="select-profile-goal">
                        <SelectValue placeholder={t.onboarding.goalPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(t.onboarding.goalOptions).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t.profile.challenge}</label>
                    <Select value={challenge} onValueChange={setChallenge}>
                      <SelectTrigger className="h-9 text-sm" data-testid="select-profile-challenge">
                        <SelectValue placeholder={t.onboarding.challengePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(t.onboarding.challengeOptions).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full mt-1"
                    size="sm"
                    onClick={() => saveProfile.mutate({ role, industry, goal, challenge, learningPreference })}
                    disabled={saveProfile.isPending}
                    data-testid="button-save-profile"
                  >
                    {saveProfile.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    {t.profile.save}
                  </Button>
                </div>
              )}
            </Card>

            {/* Learning Preference — collapsible */}
            <Card className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setShowLearningPref(!showLearningPref)}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">{t.profile.learningPreference}</span>
                </div>
                {showLearningPref ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showLearningPref && (
                <div className="px-5 pb-5 space-y-2 border-t border-slate-100 pt-3">
                  {learningOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={learningPreference === opt.value ? "default" : "outline"}
                      className="w-full h-10 justify-start text-sm"
                      onClick={() => setLearningPreference(opt.value)}
                      data-testid={`button-profile-learning-${opt.value}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                  <Button
                    className="w-full mt-1"
                    size="sm"
                    onClick={() => saveProfile.mutate({ role, industry, goal, challenge, learningPreference })}
                    disabled={saveProfile.isPending}
                  >
                    {saveProfile.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    {t.profile.save}
                  </Button>
                </div>
              )}
            </Card>

            {/* Admin panel */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">{t.profile.adminMode}</h2>
              </div>
              <p className="text-xs text-slate-500 mb-3">{t.profile.adminModeDesc}</p>
              <Link href="/admin">
                <Button variant="outline" className="w-full" size="sm" data-testid="button-open-admin">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  {t.profile.openAdminPanel}
                </Button>
              </Link>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
