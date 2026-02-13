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
