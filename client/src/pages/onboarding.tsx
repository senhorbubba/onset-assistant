import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { ArrowRight, ArrowLeft, Sparkles, User, Building2, BarChart3, Target, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import onsetLogo from "@assets/ONSET_ELEMENTOS_Prancheta_1_1770928342014.png";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [challenge, setChallenge] = useState("");
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const saveProfile = useMutation({
    mutationFn: async (data: { role: string; industry: string; experience: string; goal: string; challenge: string }) => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      navigate("/");
    },
  });

  const handleFinish = () => {
    saveProfile.mutate({ role, industry, experience, goal, challenge });
  };

  const handleSkip = () => {
    saveProfile.mutate({ role: "", industry: "", experience: "", goal: "", challenge: "" });
  };

  const stepIcons = [User, Building2, BarChart3, Target, HelpCircle];
  const StepIcon = stepIcons[step];

  const experienceOptions = [
    { value: "beginner", label: t.onboarding.experienceBeginner },
    { value: "intermediate", label: t.onboarding.experienceIntermediate },
    { value: "advanced", label: t.onboarding.experienceAdvanced },
  ];

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.roleQuestion}</label>
            <Input
              data-testid="input-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t.onboarding.rolePlaceholder}
              className="h-12 text-base"
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.industryQuestion}</label>
            <Input
              data-testid="input-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder={t.onboarding.industryPlaceholder}
              className="h-12 text-base"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.experienceQuestion}</label>
            <div className="grid grid-cols-3 gap-3">
              {experienceOptions.map((opt) => (
                <Button
                  key={opt.value}
                  data-testid={`button-experience-${opt.value}`}
                  variant={experience === opt.value ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setExperience(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.goalQuestion}</label>
            <Input
              data-testid="input-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t.onboarding.goalPlaceholder}
              className="h-12 text-base"
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <label className="text-base font-medium text-slate-700">{t.onboarding.challengeQuestion}</label>
            <Input
              data-testid="input-challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder={t.onboarding.challengePlaceholder}
              className="h-12 text-base"
            />
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
            <img src={onsetLogo} alt="Onset" className="w-8 h-8 rounded-lg" />
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
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t.onboarding.back}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={saveProfile.isPending}
                data-testid="button-skip"
              >
                {t.onboarding.skip}
              </Button>
            )}

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
        </Card>
      </div>
    </div>
  );
}
