import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  MessageSquareText,
  CheckCircle2,
  ArrowRight,
  Zap,
  Building2,
  Rocket,
  ShieldCheck,
  BarChart3,
  HeadphonesIcon,
  Star,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import onsetLogo from "@assets/onset_logo.png";
import { SiteNav } from "@/components/site-nav";

const pricingText = {
  en: {
    nav: {
      features: "Features",
      useCases: "Use Cases",
      howItWorks: "How It Works",
      pricing: "Pricing",
      tryIt: "Try It Free",
    },
    hero: {
      title: "Plans that grow with",
      titleHighlight: "your team.",
      subtitle:
        "One-time setup, monthly subscription. No hidden fees. Each plan includes a monthly message limit to keep your costs predictable.",
    },
    setup: {
      title: "Implementation (one-time fee)",
      subtitle: "We handle everything: content structure, configuration, deployment, and training.",
      plans: [
        {
          name: "Starter Setup",
          price: "R$\u00a02.500",
          desc: "Up to 3 topics configured",
          features: [
            "Up to 3 topics, 15 entries each",
            "Content structuring and upload",
            "Bot configuration and deployment",
            "1 language (EN or PT-BR)",
            "Admin training session",
          ],
        },
        {
          name: "Professional Setup",
          price: "R$\u00a04.900",
          desc: "Up to 8 topics configured",
          highlighted: true,
          features: [
            "Up to 8 topics, 20 entries each",
            "Content structuring and upload",
            "2 languages (PT-BR + EN)",
            "Custom branding",
            "Analytics dashboard setup",
            "2 content revision rounds",
          ],
        },
        {
          name: "Enterprise Setup",
          price: "R$\u00a09.900",
          desc: "Unlimited topics and entries",
          features: [
            "Unlimited topics and entries",
            "Content structuring and upload",
            "Multiple languages",
            "Custom domain",
            "Existing system integration",
            "Dedicated project manager",
            "3 content revision rounds",
          ],
        },
      ],
    },
    monthly: {
      title: "Monthly subscription",
      subtitle: "Pay month-to-month or annually and save 2 months. Cancel anytime.",
      annualBadge: "Annual: 2 months free",
      limitNote: "messages/month",
      plans: [
        {
          name: "Starter",
          icon: "zap",
          price: "R$\u00a0799",
          period: "/month",
          users: "Up to 25 users",
          limit: "600",
          features: [
            "600 messages/month",
            "Basic usage report",
            "Minor content corrections included",
            "Email support (48h response)",
          ],
        },
        {
          name: "Professional",
          icon: "rocket",
          price: "R$\u00a01.990",
          period: "/month",
          users: "Up to 100 users",
          limit: "2.500",
          highlighted: true,
          features: [
            "2,500 messages/month",
            "Full analytics dashboard",
            "Unanswered questions log",
            "Monthly content updates included",
            "Priority support (24h response)",
          ],
        },
        {
          name: "Enterprise",
          icon: "building",
          price: "R$\u00a03.990",
          period: "/month",
          users: "Up to 500 users",
          limit: "8.000",
          features: [
            "8,000 messages/month",
            "All Professional features",
            "Quarterly content review included",
            "Dedicated account manager",
            "Top-priority support",
          ],
        },
      ],
    },
    overLimit: {
      title: "Need more messages?",
      desc: "When your organization reaches the monthly limit, the bot pauses gracefully and notifies users to contact you. Upgrade your plan at any time, no data is lost.",
    },
    faq: {
      title: "Common questions",
      items: [
        {
          q: "What counts as a message?",
          a: "Each time a user sends a question and receives a response, that counts as 1 message. Browsing topics or selecting chips does not count.",
        },
        {
          q: "What happens when the limit is reached?",
          a: "The bot shows a friendly message letting users know the monthly limit has been reached and to contact the administrator. No questions are lost.",
        },
        {
          q: "Can I upgrade mid-month?",
          a: "Yes. Contact us and we'll adjust your plan and limit immediately.",
        },
        {
          q: "Is the setup fee required?",
          a: "Yes. We handle all content structuring, configuration, and deployment. This ensures quality and saves you significant time.",
        },
      ],
    },
    cta: {
      title: "Ready to get started?",
      subtitle: "Try the live demo first, no commitment required.",
      button: "Launch the Assistant",
      contact: "Talk to us",
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
      pricing: "Preços",
      tryIt: "Teste Grátis",
    },
    hero: {
      title: "Planos que crescem com",
      titleHighlight: "a sua equipe.",
      subtitle:
        "Implantação única, assinatura mensal. Sem taxas ocultas. Cada plano inclui um limite mensal de mensagens para manter seus custos previsíveis.",
    },
    setup: {
      title: "Implantação (taxa única)",
      subtitle: "Cuidamos de tudo: estrutura de conteúdo, configuração, deploy e treinamento.",
      plans: [
        {
          name: "Implantação Starter",
          price: "R$\u00a02.500",
          desc: "Até 3 tópicos configurados",
          features: [
            "Até 3 tópicos, 15 entradas cada",
            "Estruturação e carga de conteúdo",
            "Configuração e deploy do bot",
            "1 idioma (PT-BR ou EN)",
            "Treinamento do administrador",
          ],
        },
        {
          name: "Implantação Profissional",
          price: "R$\u00a04.900",
          desc: "Até 8 tópicos configurados",
          highlighted: true,
          features: [
            "Até 8 tópicos, 20 entradas cada",
            "Estruturação e carga de conteúdo",
            "2 idiomas (PT-BR + EN)",
            "Identidade visual personalizada",
            "Configuração do painel de analytics",
            "2 rodadas de revisão de conteúdo",
          ],
        },
        {
          name: "Implantação Enterprise",
          price: "R$\u00a09.900",
          desc: "Tópicos e entradas ilimitados",
          features: [
            "Tópicos e entradas ilimitados",
            "Estruturação e carga de conteúdo",
            "Múltiplos idiomas",
            "Domínio personalizado",
            "Integração com sistemas existentes",
            "Gerente de projeto dedicado",
            "3 rodadas de revisão de conteúdo",
          ],
        },
      ],
    },
    monthly: {
      title: "Assinatura mensal",
      subtitle: "Pague mês a mês ou anualmente e economize 2 meses. Cancele quando quiser.",
      annualBadge: "Anual: 2 meses grátis",
      limitNote: "mensagens/mês",
      plans: [
        {
          name: "Starter",
          icon: "zap",
          price: "R$\u00a0799",
          period: "/mês",
          users: "Até 25 usuários",
          limit: "600",
          features: [
            "600 mensagens/mês",
            "Relatório básico de uso",
            "Correções pontuais de conteúdo inclusas",
            "Suporte por e-mail (retorno em até 48h)",
          ],
        },
        {
          name: "Profissional",
          icon: "rocket",
          price: "R$\u00a01.990",
          period: "/mês",
          users: "Até 100 usuários",
          limit: "2.500",
          highlighted: true,
          features: [
            "2.500 mensagens/mês",
            "Painel de analytics completo",
            "Log de perguntas não respondidas",
            "Atualizações mensais de conteúdo inclusas",
            "Suporte prioritário (retorno em até 24h)",
          ],
        },
        {
          name: "Enterprise",
          icon: "building",
          price: "R$\u00a03.990",
          period: "/mês",
          users: "Até 500 usuários",
          limit: "8.000",
          features: [
            "8.000 mensagens/mês",
            "Todos os recursos Profissional",
            "Revisão trimestral de conteúdo inclusa",
            "Gerente de conta dedicado",
            "Suporte com prioridade máxima",
          ],
        },
      ],
    },
    overLimit: {
      title: "Precisa de mais mensagens?",
      desc: "Quando sua organização atinge o limite mensal, o bot pausa com uma mensagem amigável orientando os usuários a entrar em contato. Faça upgrade a qualquer momento, nenhum dado é perdido.",
    },
    faq: {
      title: "Perguntas frequentes",
      items: [
        {
          q: "O que conta como mensagem?",
          a: "Cada vez que um usuário envia uma pergunta e recebe uma resposta, isso conta como 1 mensagem. Navegar por tópicos ou clicar em sugestões não conta.",
        },
        {
          q: "O que acontece quando o limite é atingido?",
          a: "O bot exibe uma mensagem amigável informando que o limite mensal foi atingido e pedindo ao usuário que entre em contato com o administrador. Nenhuma pergunta é perdida.",
        },
        {
          q: "Posso fazer upgrade no meio do mês?",
          a: "Sim. Entre em contato conosco e ajustaremos seu plano e limite imediatamente.",
        },
        {
          q: "A taxa de implantação é obrigatória?",
          a: "Sim. Cuidamos de toda a estruturação do conteúdo, configuração e deploy. Isso garante qualidade e economiza um tempo significativo para você.",
        },
      ],
    },
    cta: {
      title: "Pronto para começar?",
      subtitle: "Experimente a demo ao vivo primeiro, sem compromisso.",
      button: "Abrir o Assistente",
      contact: "Fale conosco",
    },
    footer: {
      tagline: "Conhecimento com IA. Verdade curada por humanos.",
      rights: "Todos os direitos reservados.",
    },
  },
};

const iconMap: Record<string, any> = {
  zap: Zap,
  rocket: Rocket,
  building: Building2,
};

export default function Pricing() {
  const { language } = useLanguage();
  const t = pricingText[language as Language] || pricingText["pt-BR"];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-foreground">
      <SiteNav />

      {/* Hero */}
      <section className="py-16 sm:py-24 bg-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display leading-tight mb-4">
            {t.hero.title}{" "}
            <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Setup / Implementation */}
      <section className="py-12 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">{t.setup.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{t.setup.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.setup.plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  "relative p-6 sm:p-8 rounded-2xl border transition-all duration-300",
                  plan.highlighted
                    ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                    : "bg-white border-slate-100 hover:shadow-lg hover:border-primary/20"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> Popular
                    </span>
                  </div>
                )}
                <p className={cn("text-sm font-semibold mb-1", plan.highlighted ? "text-white/80" : "text-muted-foreground")}>
                  {plan.name}
                </p>
                <p className={cn("text-3xl font-extrabold font-display mb-1", plan.highlighted ? "text-white" : "text-foreground")}>
                  {plan.price}
                </p>
                <p className={cn("text-xs mb-6", plan.highlighted ? "text-white/70" : "text-muted-foreground")}>
                  {plan.desc}
                </p>
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", plan.highlighted ? "text-white/80" : "text-primary")} />
                      <span className={plan.highlighted ? "text-white/90" : "text-foreground"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monthly */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">{t.monthly.title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-3">{t.monthly.subtitle}</p>
            <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {t.monthly.annualBadge}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.monthly.plans.map((plan, i) => {
              const Icon = iconMap[plan.icon] || Zap;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative p-6 sm:p-8 rounded-2xl border transition-all duration-300",
                    plan.highlighted
                      ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                      : "bg-slate-50 border-slate-100 hover:shadow-lg hover:border-primary/20 hover:bg-white"
                  )}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Popular
                      </span>
                    </div>
                  )}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", plan.highlighted ? "bg-white/20" : "bg-primary/10")}>
                    <Icon className={cn("w-5 h-5", plan.highlighted ? "text-white" : "text-primary")} />
                  </div>
                  <p className={cn("font-bold font-display text-xl mb-1", plan.highlighted ? "text-white" : "text-foreground")}>
                    {plan.name}
                  </p>
                  <p className={cn("text-xs mb-4", plan.highlighted ? "text-white/70" : "text-muted-foreground")}>
                    {plan.users}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={cn("text-4xl font-extrabold font-display", plan.highlighted ? "text-white" : "text-foreground")}>
                      {plan.price}
                    </span>
                    <span className={cn("text-sm mb-1.5", plan.highlighted ? "text-white/70" : "text-muted-foreground")}>
                      {plan.period}
                    </span>
                  </div>
                  <div className={cn("flex items-center gap-1.5 mb-6 text-xs font-medium", plan.highlighted ? "text-white/80" : "text-primary")}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {plan.limit} {t.monthly.limitNote}
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", plan.highlighted ? "text-white/80" : "text-primary")} />
                        <span className={plan.highlighted ? "text-white/90" : "text-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Over-limit explanation */}
      <section className="py-10 sm:py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 mb-4">
            <BarChart3 className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold font-display mb-3">{t.overLimit.title}</h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t.overLimit.desc}</p>
        </div>
      </section>

      {/* FAQ — accordion */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center mb-10">{t.faq.title}</h2>
          <div className="divide-y divide-slate-100">
            {t.faq.items.map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold font-display text-sm sm:text-base">{item.q}</span>
                  {openFaq === i
                    ? <Minus className="w-4 h-4 shrink-0 text-primary" />
                    : <Plus className="w-4 h-4 shrink-0 text-muted-foreground" />
                  }
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-24 bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <HeadphonesIcon className="w-10 h-10 mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl sm:text-4xl font-bold font-display mb-4">{t.cta.title}</h2>
          <p className="text-base sm:text-lg opacity-90 mb-8">{t.cta.subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/bot">
              <Button size="lg" variant="secondary" className="gap-2 text-base px-8 py-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                <MessageSquareText className="w-5 h-5" />
                {t.cta.button}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="mailto:onset.devs@gmail.com">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 rounded-xl font-bold border-white/40 text-white hover:bg-white/10 transition-all">
                {t.cta.contact}
              </Button>
            </a>
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
