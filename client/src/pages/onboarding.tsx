import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { ArrowRight, ArrowLeft, Sparkles, User, Building2, Target, HelpCircle, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import onsetLogo from "@assets/onset_logo_final.png";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [challenge, setChallenge] = useState("");
  const [learningPreference, setLearningPreference] = useState("");
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const saveProfile = useMutation({
    mutationFn: async (data: { role: string; industry: string; goal: string; challenge: string; learningPreference: string }) => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: async (savedProfile) => {
      queryClient.setQueryData(["/api/profile"], savedProfile);
      navigate("/bot");
    },
  });

  const handleFinish = () => {
    saveProfile.mutate({ role, industry, goal, challenge, learningPreference });
  };

  const handleSkip = () => {
    saveProfile.mutate({ role: "", industry: "", goal: "", challenge: "", learningPreference: "" });
  };

  const stepIcons = [User, Building2, Target, HelpCircle, GraduationCap];
  const StepIcon = stepIcons[step];

  const learningOptions = [
    { value: "quick_tips", label: t.onboarding.learningQuickTips },
    { value: "step_by_step", label: t.onboarding.learningStepByStep },
    { value: "examples", label: t.onboarding.learningExamples },
  ];

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.roleQuestion}</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-12 text-base" data-testid="select-role">
                <SelectValue placeholder={t.onboarding.rolePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.onboarding.roleOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-role-${key}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.industryQuestion}</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-12 text-base" data-testid="select-industry">
                <SelectValue placeholder={t.onboarding.industryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.onboarding.industryOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-industry-${key}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.goalQuestion}</label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="h-12 text-base" data-testid="select-goal">
                <SelectValue placeholder={t.onboarding.goalPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.onboarding.goalOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-goal-${key}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.challengeQuestion}</label>
            <Select value={challenge} onValueChange={setChallenge}>
              <SelectTrigger className="h-12 text-base" data-testid="select-challenge">
                <SelectValue placeholder={t.onboarding.challengePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.onboarding.challengeOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-challenge-${key}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.learningPreferenceQuestion}</label>
            <div className="space-y-3">
              {learningOptions.map((opt) => (
                <Button
                  key={opt.value}
                  data-testid={`button-learning-${opt.value}`}
                  variant={learningPreference === opt.value ? "default" : "outline"}
                  className="w-full h-12 justify-start text-left"
                  onClick={() => setLearningPreference(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <img src={onsetLogo} alt="Onset" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-display tracking-tight">onset. Assistant</span>
          </div>
          <div className="p-3 rounded-2xl bg-white shadow-lg border border-slate-100 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2" data-testid="text-onboarding-title">
            {t.onboarding.title}
          </h2>
          <p className="text-sm text-slate-500 text-center max-w-xs">
            {t.onboarding.subtitle}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary w-8" : "bg-slate-200 w-4"
              }`}
              data-testid={`progress-step-${i}`}
            />
          ))}
        </div>

        <div className="text-center text-xs text-slate-400 mb-4">
          {t.onboarding.step} {step + 1} {t.onboarding.of} {TOTAL_STEPS}
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 gap-3">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t.onboarding.back}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={saveProfile.isPending}
                data-testid="button-skip"
              >
                {t.onboarding.skip}
              </Button>

              {step < TOTAL_STEPS - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  data-testid="button-next"
                >
                  {t.onboarding.next}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={saveProfile.isPending}
                  data-testid="button-finish"
                >
                  {t.onboarding.finish}
                  <Sparkles className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
