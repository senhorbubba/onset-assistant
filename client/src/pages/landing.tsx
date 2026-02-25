import { useState } from "react";
import { Link } from "wouter";

import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Globe,
  MessageSquareText,
  ShieldCheck,
  GraduationCap,
  BrainCircuit,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Target,
  HeadphonesIcon,
  Package,
  Building2,
  FileText,
  Code2,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import onsetLogo from "@assets/onset_logo.png";


const landingText = {
  en: {
    nav: {
      features: "Features",
      useCases: "Use Cases",
      howItWorks: "How It Works",
      tryIt: "Try It Free",
    },
    hero: {
      badgeLine1: "AI-Powered Knowledge.",
      badgeLine2: "Human-Curated Truth.",
      title: "Learning that adapts to",
      titleHighlight: "you.",
      subtitle:
        "onset. delivers personalized microlearning through AI, powered by expert-curated content. No hallucinated answers, no assumptions. Your team learns faster, retains more, and trusts every response.",
      cta: "Try the Assistant",
      ctaSub: "Free to use",
    },
    trust: {
      title: "Why onset.?",
      subtitle: "We combine the power of AI with the reliability of human-curated knowledge.",
      items: [
        {
          icon: "shield",
          title: "Zero Hallucinations",
          desc: "Every answer comes from curated, verified content. We never invent, assume, or fabricate information.",
        },
        {
          icon: "brain",
          title: "Adaptive Learning",
          desc: "The bot adjusts to your pace, style, industry, seniority, and preferences. Like a personal tutor.",
        },
        {
          icon: "zap",
          title: "Microlearning Format",
          desc: "One key insight at a time. Quick tips, step-by-step guides, or real-world examples. You choose the format.",
        },
        {
          icon: "graduation",
          title: "Expert Methodology",
          desc: "Content designed by educational specialists using proven pedagogical frameworks.",
        },
      ],
    },
    useCases: {
      title: "Built for real-world learning",
      subtitle: "From onboarding to exam prep, onset. fits wherever knowledge matters.",
      items: [
        { icon: "users", title: "Employee Onboarding", desc: "Get new hires up to speed faster with guided, interactive learning paths." },
        { icon: "headphones", title: "Customer Support", desc: "Empower support teams with instant, accurate answers from your knowledge base." },
        { icon: "package", title: "Product Knowledge", desc: "Help users learn about your product through conversational Q&A." },
        { icon: "building", title: "Corporate University", desc: "Replace complex LMS navigation with a simple chat interface." },
        { icon: "graduationCap", title: "Exam Preparation", desc: "Students study smarter with personalized, bite-sized content." },
        { icon: "fileText", title: "Documentation", desc: "Make your docs conversational. Users ask, the bot answers with precision." },
      ],
    },
    howItWorks: {
      title: "Simple. Powerful. Trustworthy.",
      subtitle: "Three steps to smarter learning.",
      steps: [
        { number: "01", title: "Upload Your Content", desc: "Curators upload structured knowledge, one file per topic. The bot learns only what you teach it." },
        { number: "02", title: "Users Ask Questions", desc: "Learners choose a topic and ask naturally. The AI understands context, not just keywords." },
        { number: "03", title: "Personalized Answers", desc: "Responses adapt to each user's experience level, learning preference, and pace. Always sourced, never invented." },
      ],
    },
    deploy: {
      title: "Works where your users are",
      subtitle: "Deploy onset. the way that fits your business.",
      items: [
        { icon: "code", title: "Embed in Your App", desc: "Drop the bot into your existing website, intranet, or platform. It blends right into your current interface." },
        { icon: "globe", title: "Standalone Website", desc: "Launch a dedicated learning portal. Fully branded, ready to go. No development needed on your side." },
        { icon: "messageCircle", title: "WhatsApp Bot", desc: "Meet users where they already are. Deliver the same curated learning experience through WhatsApp." },
      ],
    },
    cta: {
      title: "Ready to see it in action?",
      subtitle: "Try the onset. Assistant now. Ask anything from our demo knowledge base.",
      button: "Launch the Assistant",
    },
    footer: {
      tagline: "AI-Powered Knowledge. Human-Curated Truth.",
      rights: "All rights reserved.",
    },
  },
  "pt-BR": {
    nav: {
      features: "Recursos",
      useCases: "Casos de Uso",
      howItWorks: "Como Funciona",
      tryIt: "Teste Grátis",
    },
    hero: {
      badgeLine1: "Conhecimento com IA.",
      badgeLine2: "Verdade curada por humanos.",
      title: "Aprendizado que se adapta a",
      titleHighlight: "você.",
      subtitle:
        "onset. entrega microlearning personalizado com IA, baseado em conteúdo curado por especialistas. Sem respostas inventadas, sem suposições. Sua equipe aprende mais rápido, retém mais e confia em cada resposta.",
      cta: "Testar o Assistente",
      ctaSub: "Gratuito para usar",
    },
    trust: {
      title: "Por que onset.?",
      subtitle: "Combinamos o poder da IA com a confiabilidade do conhecimento curado por humanos.",
      items: [
        {
          icon: "shield",
          title: "Zero Alucinações",
          desc: "Cada resposta vem de conteúdo curado e verificado. Nunca inventamos, assumimos ou fabricamos informações.",
        },
        {
          icon: "brain",
          title: "Aprendizado Adaptativo",
          desc: "O bot se ajusta ao seu ritmo, estilo, indústria, senioridade e preferências. Como um tutor pessoal.",
        },
        {
          icon: "zap",
          title: "Formato Microlearning",
          desc: "Um insight por vez. Dicas rápidas, passo a passo ou exemplos práticos. Você escolhe o formato.",
        },
        {
          icon: "graduation",
          title: "Metodologia Especialista",
          desc: "Conteúdo desenvolvido por especialistas em educação usando frameworks pedagógicos comprovados.",
        },
      ],
    },
    useCases: {
      title: "Feito para aprendizado real",
      subtitle: "De onboarding a preparação para provas, onset. se encaixa onde o conhecimento importa.",
      items: [
        { icon: "users", title: "Onboarding de Funcionários", desc: "Integre novos colaboradores mais rápido com trilhas interativas e guiadas." },
        { icon: "headphones", title: "Suporte ao Cliente", desc: "Capacite equipes de suporte com respostas instantâneas e precisas." },
        { icon: "package", title: "Conhecimento de Produto", desc: "Ajude usuários a conhecer seu produto através de perguntas e respostas conversacionais." },
        { icon: "building", title: "Universidade Corporativa", desc: "Substitua navegações complexas de LMS por uma interface de chat simples." },
        { icon: "graduationCap", title: "Preparação para Provas", desc: "Estudantes estudam melhor com conteúdo personalizado e em pequenas doses." },
        { icon: "fileText", title: "Documentação", desc: "Torne seus docs conversacionais. Usuários perguntam, o bot responde com precisão." },
      ],
    },
    howItWorks: {
      title: "Simples. Poderoso. Confiável.",
      subtitle: "Três passos para um aprendizado mais inteligente.",
      steps: [
        { number: "01", title: "Envie seu Conteúdo", desc: "Curadores enviam conhecimento estruturado, um arquivo por tópico. O bot aprende apenas o que você ensina." },
        { number: "02", title: "Usuários Fazem Perguntas", desc: "Aprendizes escolhem um tópico e perguntam naturalmente. A IA entende contexto, não apenas palavras-chave." },
        { number: "03", title: "Respostas Personalizadas", desc: "Respostas se adaptam ao nível de experiência, preferência de aprendizado e ritmo de cada usuário. Sempre com fonte, nunca inventadas." },
      ],
    },
    deploy: {
      title: "Funciona onde seus usuários estão",
      subtitle: "Implante o onset. do jeito que faz sentido para o seu negócio.",
      items: [
        { icon: "code", title: "Integre no Seu App", desc: "Adicione o bot ao seu site, intranet ou plataforma. Ele se integra naturalmente à sua interface atual." },
        { icon: "globe", title: "Site Independente", desc: "Lance um portal de aprendizado dedicado. Totalmente personalizado, pronto para usar. Sem necessidade de desenvolvimento do seu lado." },
        { icon: "messageCircle", title: "Bot no WhatsApp", desc: "Encontre seus usuários onde eles já estão. A mesma experiência de aprendizado curado via WhatsApp." },
      ],
    },
    cta: {
      title: "Pronto para ver em ação?",
      subtitle: "Teste o onset. Assistant agora. Pergunte qualquer coisa da nossa base de conhecimento demo.",
      button: "Abrir o Assistente",
    },
    footer: {
      tagline: "Conhecimento com IA. Verdade curada por humanos.",
      rights: "Todos os direitos reservados.",
    },
  },
};

const iconMap: Record<string, any> = {
  shield: ShieldCheck,
  brain: BrainCircuit,
  zap: Zap,
  graduation: GraduationCap,
  users: Users,
  headphones: HeadphonesIcon,
  package: Package,
  building: Building2,
  code: Code2,
  messageCircle: MessageCircle,
  globe: Globe,
  graduationCap: GraduationCap,
  fileText: FileText,
};

export default function Landing() {
  const { language, setLanguage } = useLanguage();
  const t = landingText[language] || landingText.en;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-foreground">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100" data-testid="nav-landing">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between md:grid md:grid-cols-3 md:justify-items-center">
          <div className="flex items-center gap-2 md:justify-self-start">
            <img src={onsetLogo} alt="onset." className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-display tracking-tight">onset.</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors" data-testid="link-features">{t.nav.features}</a>
            <a href="#use-cases" className="hover:text-foreground transition-colors" data-testid="link-use-cases">{t.nav.useCases}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors" data-testid="link-how-it-works">{t.nav.howItWorks}</a>
          </div>
          <div className="flex items-center justify-end gap-2 md:justify-self-end">
            <div className="hidden md:block">
              <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-xs sm:text-sm px-2" data-testid="select-language-landing">
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
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm" data-testid="button-nav-cta">
                <MessageSquareText className="w-3.5 h-3.5" />
                {t.nav.tryIt}
              </Button>
            </Link>
            <button
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-features-mobile">{t.nav.features}</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-use-cases-mobile">{t.nav.useCases}</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-how-it-works-mobile">{t.nav.howItWorks}</a>
            <div className="flex items-center gap-2 py-1 border-t border-slate-100 pt-3">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                <SelectTrigger className="w-auto gap-1 border-none bg-transparent text-muted-foreground text-sm px-0 h-auto" data-testid="select-language-mobile">
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

      <section className="min-h-[calc(85dvh-57px)] sm:min-h-0 sm:py-24 lg:py-32 bg-white flex flex-col justify-center sm:items-center">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 text-center w-full pt-20 sm:pt-0">
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-tight mb-5 sm:mb-6"
            data-testid="text-hero-title"
          >
            {t.hero.title}{" "}
            <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>
          <p
            className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 sm:mb-10 leading-relaxed px-2 sm:px-0"
            data-testid="text-hero-subtitle"
          >
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col items-center gap-3 mb-6 sm:mb-0">
            <Link href="/bot">
              <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" data-testid="button-hero-cta">
                <MessageSquareText className="w-5 h-5" />
                {t.hero.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground">{t.hero.ctaSub}</span>
          </div>
        </div>
      </section>
      <section id="features" className="py-12 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3" data-testid="text-features-title">{t.trust.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{t.trust.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.trust.items.map((item, i) => {
              const Icon = iconMap[item.icon] || ShieldCheck;
              return (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                  data-testid={`card-feature-${i}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold font-display text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-12 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3" data-testid="text-usecases-title">{t.useCases.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{t.useCases.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.useCases.items.map((item, i) => {
              const Icon = iconMap[item.icon] || BookOpen;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-xl bg-white border border-slate-100 hover:shadow-md transition-all duration-300"
                  data-testid={`card-usecase-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold font-display mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3" data-testid="text-howitworks-title">{t.howItWorks.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{t.howItWorks.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.howItWorks.steps.map((step, i) => (
              <div
                key={i}
                className="relative text-center p-6"
                data-testid={`step-${i}`}
              >
                <div className="text-6xl font-extrabold font-display text-primary/10 mb-4">{step.number}</div>
                <h3 className="font-bold font-display text-xl mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 -right-4 w-8">
                    <ArrowRight className="w-6 h-6 text-primary/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-3" data-testid="text-deploy-title">{t.deploy.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{t.deploy.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.deploy.items.map((item, i) => {
              const Icon = iconMap[item.icon] || Globe;
              return (
                <div
                  key={i}
                  className="text-center p-8 rounded-2xl bg-white border border-slate-100 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                  data-testid={`card-deploy-${i}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold font-display text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-24 bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <div>
            <Target className="w-10 h-10 mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl sm:text-4xl font-bold font-display mb-4" data-testid="text-cta-title">{t.cta.title}</h2>
            <p className="text-base sm:text-lg opacity-90 mb-8">{t.cta.subtitle}</p>
            <Link href="/bot">
              <Button size="lg" variant="secondary" className="gap-2 text-base px-8 py-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all" data-testid="button-bottom-cta">
                <MessageSquareText className="w-5 h-5" />
                {t.cta.button}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <img src={onsetLogo} alt="onset." className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium text-white">onset.</span>
          </div>
          <p className="text-xs">{t.footer.tagline}</p>
          <p className="text-xs">&copy; {new Date().getFullYear()} onset. {t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );

}
