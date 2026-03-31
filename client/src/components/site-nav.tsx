import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, MessageSquareText, Menu, X } from "lucide-react";
import onsetLogo from "@assets/onset_logo.png";

const navText = {
  en: {
    features: "Features",
    useCases: "Use Cases",
    howItWorks: "How It Works",
    pricing: "Pricing",
    tryIt: "Try It Free",
  },
  "pt-BR": {
    features: "Recursos",
    useCases: "Casos de Uso",
    howItWorks: "Como Funciona",
    pricing: "Preços",
    tryIt: "Teste Grátis",
  },
};

export function SiteNav() {
  const { language, setLanguage } = useLanguage();
  const t = navText[language as Language] || navText["pt-BR"];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Anchor links only work from landing page; from /pricing they navigate to /#section
  const featureHref = "/#features";
  const useCasesHref = "/#use-cases";
  const howItWorksHref = "/#how-it-works";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={onsetLogo} alt="onset." className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-display tracking-tight">onset.</span>
          </div>
        </Link>

        {/* Center links — desktop only */}
        <div className="hidden md:flex items-center justify-center gap-5 text-sm text-muted-foreground whitespace-nowrap">
          <Link href={featureHref} className="hover:text-foreground transition-colors">{t.features}</Link>
          <Link href={useCasesHref} className="hover:text-foreground transition-colors">{t.useCases}</Link>
          <Link href={howItWorksHref} className="hover:text-foreground transition-colors">{t.howItWorks}</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">{t.pricing}</Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center justify-end gap-2">
          <div className="hidden md:block">
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-xs sm:text-sm px-2">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="pt-BR">PT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link href="/bot">
            <Button size="sm" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquareText className="w-3.5 h-3.5" />
              {t.tryIt}
            </Button>
          </Link>
          <button
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-3">
          <Link href={featureHref} onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1">{t.features}</Link>
          <Link href={useCasesHref} onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1">{t.useCases}</Link>
          <Link href={howItWorksHref} onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1">{t.howItWorks}</Link>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1">{t.pricing}</Link>
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-sm px-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt-BR">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </nav>
  );
}
