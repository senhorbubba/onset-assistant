export type Language = "en" | "pt-BR";

export const translations = {
  en: {
    header: {
      adminPanel: "Admin Panel",
    },
    home: {
      heroTitle1: "Stop searching.",
      heroTitle2: "Start learning.",
      heroSubtitle: "Select a topic and enter a guided learning session.",
      heroTagline: "Trusted insights. Practical application. Built for real business decisions.",
      selectTopic: "Select a topic to begin...",
      verifiedByExperts: "Responses verified by experts",
      chooseAnotherTopic: "Choose another topic",
      featureCurated: "Curated Knowledge",
      featureCuratedDesc: "Every answer is sourced from verified content in our database.",
      featureSmart: "Smart Matching",
      featureSmartDesc: "Uses keyword analysis to find the most relevant answers instantly.",
      featureLearning: "Always Learning",
      featureLearningDesc: "Unanswered questions are logged for review by human experts.",
    },
    chat: {
      welcomeMessage: (topic: string) => `Hello! I'm your assistant for **${topic}**. Ask me anything about this topic!`,
      placeholder: (topic: string) => `Ask about ${topic}...`,
      online: "Online",
      topic: "Topic",
      watchVideo: "Watch video talking about this",
      enterToSend: "Press Enter to send, Shift + Enter for new line",
      errorMessage: "I'm having trouble connecting right now. Please try again later.",
      noAnswer: "I'm sorry, I don't have an answer for that question in our knowledge base yet. I've logged it for our team to review and they'll follow up with you.",
      noContent: "There is no content available for this topic yet. Please try again later.",
    },
    admin: {
      dashboard: "Admin Dashboard",
      manageKB: "Manage knowledge base and review questions",
      syncSheets: "Sync Sheets",
      syncing: "Syncing...",
      addContent: "Add Content",
      knowledgeBase: "Knowledge Base",
      unanswered: "Unanswered",
      contentLibrary: "Content Library",
      contentDesc: "Current questions and answers in the database.",
      unansweredQuestions: "Unanswered Questions",
      unansweredDesc: "Questions the bot couldn't answer. Review and add to knowledge base.",
      topic: "Topic",
      question: "Question",
      questionAsked: "Question Asked",
      keywords: "Keywords",
      link: "Link",
      status: "Status",
      active: "Active",
      view: "View",
      viewLink: "View link",
      date: "Date",
      action: "Action",
      answer: "Answer",
      noContent: "No content found. Add some knowledge!",
      allCaughtUp: "All caught up! No unanswered questions.",
      syncComplete: "Sync Complete",
      syncFailed: "Sync Failed",
      syncError: "Could not sync from Google Sheets",
      addKBItem: "Add Knowledge Base Item",
      selectTopic: "Select topic",
      questionPlaceholder: "e.g. What is a neural network?",
      answerLabel: "Answer",
      answerPlaceholder: "Enter the detailed answer...",
      keywordsLabel: "Keywords (comma separated)",
      keywordsPlaceholder: "neural, network, deep learning, AI",
      keywordsHelp: "Used for matching user questions",
      cancel: "Cancel",
      createContent: "Create Content",
      creating: "Creating...",
      success: "Success",
      contentCreated: "Content created successfully",
      error: "Error",
      createFailed: "Failed to create content",
      users: "Users",
      usersTitle: "Registered Users",
      usersDesc: "All users who signed up and their question activity.",
      userName: "Name",
      userEmail: "Email",
      aiSkillsQuestions: "AI Skills Qs",
      communicationQuestions: "Communication Qs",
      registered: "Registered",
      exportExcel: "Export to Excel",
      exporting: "Exporting...",
      noUsers: "No users registered yet.",
      totalUsers: "Total Users",
    },
    auth: {
      signIn: "Sign in",
      signOut: "Sign out",
      signInWith: "Sign in with Google",
    },
    onboarding: {
      title: "Let's personalize your experience",
      subtitle: "Help us tailor answers to your context. You can skip this anytime.",
      step: "Step",
      of: "of",
      next: "Next",
      back: "Back",
      finish: "Finish",
      skip: "Skip for now",
      roleQuestion: "What best describes your role?",
      rolePlaceholder: "Select your role",
      roleOptions: {
        manager: "Manager / Team Lead",
        executive: "Executive / Director",
        entrepreneur: "Entrepreneur / Founder",
        consultant: "Consultant / Advisor",
        specialist: "Specialist / Analyst",
        creative: "Creative Professional",
        educator: "Educator / Trainer",
        student: "Student / Learner",
        other: "Other",
      },
      industryQuestion: "What industry do you work in?",
      industryPlaceholder: "Select your industry",
      industryOptions: {
        technology: "Technology / IT",
        healthcare: "Healthcare / Pharma",
        finance: "Finance / Banking",
        education: "Education / Training",
        marketing: "Marketing / Advertising",
        retail: "Retail / E-commerce",
        manufacturing: "Manufacturing / Engineering",
        media: "Media / Entertainment",
        consulting: "Consulting / Professional Services",
        nonprofit: "Non-profit / Government",
        other: "Other",
      },
      experienceQuestion: "What's your experience level?",
      experienceBeginner: "Beginner",
      experienceIntermediate: "Intermediate",
      experienceAdvanced: "Advanced",
      goalQuestion: "What's your main learning goal?",
      goalPlaceholder: "Select your goal",
      goalOptions: {
        ai_basics: "Understand AI fundamentals",
        ai_productivity: "Use AI to boost productivity",
        communication: "Improve communication skills",
        leadership: "Develop leadership abilities",
        career_growth: "Accelerate career growth",
        team_management: "Better team management",
        innovation: "Drive innovation in my work",
        stay_current: "Stay current with trends",
      },
      challengeQuestion: "What's your biggest challenge right now?",
      challengePlaceholder: "Select your challenge",
      challengeOptions: {
        time: "Finding time to learn",
        overwhelm: "Too much information, hard to filter",
        practical: "Turning knowledge into practice",
        keeping_up: "Keeping up with rapid changes",
        confidence: "Building confidence in new skills",
        team_adoption: "Getting my team to adopt new approaches",
        measuring: "Measuring progress and impact",
        starting: "Not sure where to start",
      },
      learningPreferenceQuestion: "How do you prefer to learn?",
      learningQuickTips: "Quick tips & key takeaways",
      learningStepByStep: "Step-by-step explanations",
      learningExamples: "Real-world examples & case studies",
    },
    topicExperience: {
      question: (topic: string) => `Before we start, what's your experience level with ${topic}?`,
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
    profile: {
      title: "My Profile",
      editProfile: "Edit Profile",
      learningSummary: "Learning Summary",
      personalInfo: "Personal Information",
      name: "Name",
      namePlaceholder: "Your name",
      role: "Role",
      industry: "Industry",
      goal: "Learning Goal",
      challenge: "Main Challenge",
      learningPreference: "Learning Preference",
      quickTips: "Quick tips & key takeaways",
      stepByStep: "Step-by-step explanations",
      examples: "Real-world examples & case studies",
      save: "Save Changes",
      saving: "Saving...",
      saved: "Profile Updated",
      savedDesc: "Your changes have been saved.",
      questionsAsked: "Questions Asked",
      topicsExplored: "Topics Explored",
      answersReceived: "Answers Received",
      recentQuestions: "Recent Questions",
      noHistory: "No learning history yet. Start asking questions to build your summary!",
      backToHome: "Back to Home",
      adminMode: "Admin Mode",
      adminModeDesc: "Access the admin panel to manage knowledge base and review questions.",
      openAdminPanel: "Open Admin Panel",
      signOut: "Sign Out",
    },
    langPicker: {
      language: "Language",
    },
  },
  "pt-BR": {
    header: {
      adminPanel: "Painel Admin",
    },
    home: {
      heroTitle1: "Pare de procurar.",
      heroTitle2: "Comece a aprender.",
      heroSubtitle: "Selecione um tópico e entre em uma sessão de aprendizado guiada.",
      heroTagline: "Insights confiáveis. Aplicação prática. Feito para decisões reais de negócios.",
      selectTopic: "Selecione um tópico para começar...",
      verifiedByExperts: "Respostas verificadas por especialistas",
      chooseAnotherTopic: "Escolher outro tópico",
      featureCurated: "Conhecimento Curado",
      featureCuratedDesc: "Cada resposta é proveniente de conteúdo verificado em nosso banco de dados.",
      featureSmart: "Correspondência Inteligente",
      featureSmartDesc: "Usa análise de palavras-chave para encontrar as respostas mais relevantes instantaneamente.",
      featureLearning: "Sempre Aprendendo",
      featureLearningDesc: "Perguntas sem resposta são registradas para revisão por especialistas.",
    },
    chat: {
      welcomeMessage: (topic: string) => `Olá! Sou seu assistente para **${topic}**. Pergunte-me qualquer coisa sobre este tópico!`,
      placeholder: (topic: string) => `Pergunte sobre ${topic}...`,
      online: "Online",
      topic: "Tópico",
      watchVideo: "Assistir vídeo sobre isso",
      enterToSend: "Pressione Enter para enviar, Shift + Enter para nova linha",
      errorMessage: "Estou com dificuldade para conectar agora. Por favor, tente novamente mais tarde.",
      noAnswer: "Desculpe, ainda não tenho uma resposta para essa pergunta em nossa base de conhecimento. Registrei para nossa equipe analisar e retornar.",
      noContent: "Ainda não há conteúdo disponível para este tópico. Por favor, tente novamente mais tarde.",
    },
    admin: {
      dashboard: "Painel Administrativo",
      manageKB: "Gerencie a base de conhecimento e revise perguntas",
      syncSheets: "Sincronizar",
      syncing: "Sincronizando...",
      addContent: "Adicionar",
      knowledgeBase: "Base de Conhecimento",
      unanswered: "Sem Resposta",
      contentLibrary: "Biblioteca de Conteúdo",
      contentDesc: "Perguntas e respostas atuais no banco de dados.",
      unansweredQuestions: "Perguntas Sem Resposta",
      unansweredDesc: "Perguntas que o bot não conseguiu responder. Revise e adicione à base.",
      topic: "Tópico",
      question: "Pergunta",
      questionAsked: "Pergunta Feita",
      keywords: "Palavras-chave",
      link: "Link",
      status: "Status",
      active: "Ativo",
      view: "Ver",
      viewLink: "Ver link",
      date: "Data",
      action: "Ação",
      answer: "Responder",
      noContent: "Nenhum conteúdo encontrado. Adicione conhecimento!",
      allCaughtUp: "Tudo em dia! Nenhuma pergunta sem resposta.",
      syncComplete: "Sincronização Completa",
      syncFailed: "Falha na Sincronização",
      syncError: "Não foi possível sincronizar com o Google Sheets",
      addKBItem: "Adicionar Item à Base",
      selectTopic: "Selecione o tópico",
      questionPlaceholder: "ex: O que é uma rede neural?",
      answerLabel: "Resposta",
      answerPlaceholder: "Digite a resposta detalhada...",
      keywordsLabel: "Palavras-chave (separadas por vírgula)",
      keywordsPlaceholder: "neural, rede, aprendizado, IA",
      keywordsHelp: "Usadas para corresponder perguntas dos usuários",
      cancel: "Cancelar",
      createContent: "Criar Conteúdo",
      creating: "Criando...",
      success: "Sucesso",
      contentCreated: "Conteúdo criado com sucesso",
      error: "Erro",
      createFailed: "Falha ao criar conteúdo",
      users: "Usuários",
      usersTitle: "Usuários Registrados",
      usersDesc: "Todos os usuários cadastrados e suas atividades de perguntas.",
      userName: "Nome",
      userEmail: "E-mail",
      aiSkillsQuestions: "Perguntas AI Skills",
      communicationQuestions: "Perguntas Communication",
      registered: "Registrado",
      exportExcel: "Exportar para Excel",
      exporting: "Exportando...",
      noUsers: "Nenhum usuário registrado ainda.",
      totalUsers: "Total de Usuários",
    },
    auth: {
      signIn: "Entrar",
      signOut: "Sair",
      signInWith: "Entrar com Google",
    },
    onboarding: {
      title: "Vamos personalizar sua experiência",
      subtitle: "Nos ajude a adaptar as respostas ao seu contexto. Você pode pular quando quiser.",
      step: "Etapa",
      of: "de",
      next: "Próximo",
      back: "Voltar",
      finish: "Finalizar",
      skip: "Pular por enquanto",
      roleQuestion: "O que melhor descreve sua função?",
      rolePlaceholder: "Selecione sua função",
      roleOptions: {
        manager: "Gerente / Líder de Equipe",
        executive: "Executivo / Diretor",
        entrepreneur: "Empreendedor / Fundador",
        consultant: "Consultor / Assessor",
        specialist: "Especialista / Analista",
        creative: "Profissional Criativo",
        educator: "Educador / Treinador",
        student: "Estudante / Aprendiz",
        other: "Outro",
      },
      industryQuestion: "Em qual setor você trabalha?",
      industryPlaceholder: "Selecione seu setor",
      industryOptions: {
        technology: "Tecnologia / TI",
        healthcare: "Saúde / Farmacêutica",
        finance: "Finanças / Bancos",
        education: "Educação / Treinamento",
        marketing: "Marketing / Publicidade",
        retail: "Varejo / E-commerce",
        manufacturing: "Manufatura / Engenharia",
        media: "Mídia / Entretenimento",
        consulting: "Consultoria / Serviços Profissionais",
        nonprofit: "Terceiro Setor / Governo",
        other: "Outro",
      },
      experienceQuestion: "Qual seu nível de experiência?",
      experienceBeginner: "Iniciante",
      experienceIntermediate: "Intermediário",
      experienceAdvanced: "Avançado",
      goalQuestion: "Qual seu principal objetivo de aprendizado?",
      goalPlaceholder: "Selecione seu objetivo",
      goalOptions: {
        ai_basics: "Entender fundamentos de IA",
        ai_productivity: "Usar IA para aumentar produtividade",
        communication: "Melhorar habilidades de comunicação",
        leadership: "Desenvolver habilidades de liderança",
        career_growth: "Acelerar crescimento na carreira",
        team_management: "Melhorar gestão de equipe",
        innovation: "Impulsionar inovação no trabalho",
        stay_current: "Manter-se atualizado com tendências",
      },
      challengeQuestion: "Qual seu maior desafio atualmente?",
      challengePlaceholder: "Selecione seu desafio",
      challengeOptions: {
        time: "Encontrar tempo para aprender",
        overwhelm: "Muita informação, difícil filtrar",
        practical: "Transformar conhecimento em prática",
        keeping_up: "Acompanhar mudanças rápidas",
        confidence: "Construir confiança em novas habilidades",
        team_adoption: "Engajar equipe em novas abordagens",
        measuring: "Medir progresso e impacto",
        starting: "Não sei por onde começar",
      },
      learningPreferenceQuestion: "Como você prefere aprender?",
      learningQuickTips: "Dicas rápidas e pontos-chave",
      learningStepByStep: "Explicações passo a passo",
      learningExamples: "Exemplos reais e estudos de caso",
    },
    topicExperience: {
      question: (topic: string) => `Antes de começar, qual seu nível de experiência com ${topic}?`,
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    },
    profile: {
      title: "Meu Perfil",
      editProfile: "Editar Perfil",
      learningSummary: "Resumo de Aprendizado",
      personalInfo: "Informações Pessoais",
      name: "Nome",
      namePlaceholder: "Seu nome",
      role: "Função",
      industry: "Setor",
      goal: "Objetivo de Aprendizado",
      challenge: "Principal Desafio",
      learningPreference: "Preferência de Aprendizado",
      quickTips: "Dicas rápidas e pontos-chave",
      stepByStep: "Explicações passo a passo",
      examples: "Exemplos reais e estudos de caso",
      save: "Salvar Alterações",
      saving: "Salvando...",
      saved: "Perfil Atualizado",
      savedDesc: "Suas alterações foram salvas.",
      questionsAsked: "Perguntas Feitas",
      topicsExplored: "Tópicos Explorados",
      answersReceived: "Respostas Recebidas",
      recentQuestions: "Perguntas Recentes",
      noHistory: "Nenhum histórico de aprendizado ainda. Comece a fazer perguntas para construir seu resumo!",
      backToHome: "Voltar ao Início",
      adminMode: "Modo Admin",
      adminModeDesc: "Acesse o painel administrativo para gerenciar a base de conhecimento e revisar perguntas.",
      openAdminPanel: "Abrir Painel Admin",
      signOut: "Sair",
    },
    langPicker: {
      language: "Idioma",
    },
  },
} as const;

export interface Translations {
  header: { adminPanel: string };
  home: {
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    heroTagline: string;
    selectTopic: string;
    verifiedByExperts: string;
    chooseAnotherTopic: string;
    featureCurated: string;
    featureCuratedDesc: string;
    featureSmart: string;
    featureSmartDesc: string;
    featureLearning: string;
    featureLearningDesc: string;
  };
  chat: {
    welcomeMessage: (topic: string) => string;
    placeholder: (topic: string) => string;
    online: string;
    topic: string;
    watchVideo: string;
    enterToSend: string;
    errorMessage: string;
    noAnswer: string;
    noContent: string;
  };
  admin: {
    dashboard: string;
    manageKB: string;
    syncSheets: string;
    syncing: string;
    addContent: string;
    knowledgeBase: string;
    unanswered: string;
    contentLibrary: string;
    contentDesc: string;
    unansweredQuestions: string;
    unansweredDesc: string;
    topic: string;
    question: string;
    questionAsked: string;
    keywords: string;
    link: string;
    status: string;
    active: string;
    view: string;
    viewLink: string;
    date: string;
    action: string;
    answer: string;
    noContent: string;
    allCaughtUp: string;
    syncComplete: string;
    syncFailed: string;
    syncError: string;
    addKBItem: string;
    selectTopic: string;
    questionPlaceholder: string;
    answerLabel: string;
    answerPlaceholder: string;
    keywordsLabel: string;
    keywordsPlaceholder: string;
    keywordsHelp: string;
    cancel: string;
    createContent: string;
    creating: string;
    success: string;
    contentCreated: string;
    error: string;
    createFailed: string;
    users: string;
    usersTitle: string;
    usersDesc: string;
    userName: string;
    userEmail: string;
    aiSkillsQuestions: string;
    communicationQuestions: string;
    registered: string;
    exportExcel: string;
    exporting: string;
    noUsers: string;
    totalUsers: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    signInWith: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    step: string;
    of: string;
    next: string;
    back: string;
    finish: string;
    skip: string;
    roleQuestion: string;
    rolePlaceholder: string;
    roleOptions: Record<string, string>;
    industryQuestion: string;
    industryPlaceholder: string;
    industryOptions: Record<string, string>;
    experienceQuestion: string;
    experienceBeginner: string;
    experienceIntermediate: string;
    experienceAdvanced: string;
    goalQuestion: string;
    goalPlaceholder: string;
    goalOptions: Record<string, string>;
    challengeQuestion: string;
    challengePlaceholder: string;
    challengeOptions: Record<string, string>;
    learningPreferenceQuestion: string;
    learningQuickTips: string;
    learningStepByStep: string;
    learningExamples: string;
  };
  topicExperience: {
    question: (topic: string) => string;
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  profile: {
    title: string;
    editProfile: string;
    learningSummary: string;
    personalInfo: string;
    name: string;
    namePlaceholder: string;
    role: string;
    industry: string;
    goal: string;
    challenge: string;
    learningPreference: string;
    quickTips: string;
    stepByStep: string;
    examples: string;
    save: string;
    saving: string;
    saved: string;
    savedDesc: string;
    questionsAsked: string;
    topicsExplored: string;
    answersReceived: string;
    recentQuestions: string;
    noHistory: string;
    backToHome: string;
    adminMode: string;
    adminModeDesc: string;
    openAdminPanel: string;
    signOut: string;
  };
  langPicker: { language: string };
}

export function detectLanguage(): Language {
  const stored = localStorage.getItem("knowbot-language");
  if (stored === "en" || stored === "pt-BR") {
    return stored;
  }

  const browserLang = navigator.language || (navigator as any).userLanguage || "";
  if (browserLang.startsWith("pt")) {
    return "pt-BR";
  }

  return "en";
}

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}
