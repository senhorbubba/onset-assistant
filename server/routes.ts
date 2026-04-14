import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import type { UserProfile } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { findBestAnswer, generateLearningSummary } from "./ai";
import type { ConversationMessage } from "./ai";
import { sendEmailNotification } from "./email";
import { getContentCached, invalidateContentCache } from "./content-cache";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const jsonItemSchema = z.object({
  Unit_ID: z.string().optional(),
  Topic: z.string(),
  Subtopic: z.string(),
  Search_Context: z.string().optional(),
  Keywords: z.string().optional(),
  Key_Takeaway: z.string().optional(),
  Difficulty: z.string().optional(),
  Use_Case: z.string().optional(),
  Timestamp_Link: z.string().optional(),
});

// Module-level state for WhatsApp OTP and suggestion memory.
// These reset on server restart — acceptable for short-lived OTP codes.
const pendingVerifications = new Map<
  string,
  { code: string; userId: string; expiresAt: number }
>();
const lastSuggestions = new Map<string, string[]>();

// ─── Auth middleware ───────────────────────────────────────────────────────────

async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const r = req as any;
  if (!r.isAuthenticated?.() || !r.user?.claims?.sub) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const isAdmin = await storage.isUserAdmin(r.user.claims.sub);
  if (!isAdmin) {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return;
  }
  next();
}

// ─── Route registration ────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ── Admin / auth checks ────────────────────────────────────────────────────

  app.get("/api/auth/admin-check", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.json({ isAdmin: false });
    }
    const isAdmin = await storage.isUserAdmin(req.user.claims.sub);
    res.json({ isAdmin });
  });

  // ── Profile ────────────────────────────────────────────────────────────────

  app.get("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const profile = await storage.getUserProfile(req.user.claims.sub);
    res.json(profile || null);
  });

  const profileInputSchema = z.object({
    role: z.string().max(200).optional().default(""),
    industry: z.string().max(200).optional().default(""),
    goal: z.string().max(500).optional().default(""),
    challenge: z.string().max(500).optional().default(""),
    learningPreference: z.string().max(50).optional().default(""),
  });

  app.post("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.claims.sub;
      const parsed = profileInputSchema.parse(req.body);
      const profile = await storage.upsertUserProfile({
        userId,
        ...parsed,
        completedOnboarding: true,
      });
      res.json(profile);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid profile data" });
      }
      throw error;
    }
  });

  app.patch("/api/profile/notifications", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const { emailNotifications } = req.body;
    const profile = await storage.getUserProfile(userId);
    if (profile) {
      await storage.upsertUserProfile({
        ...profile,
        emailNotifications: emailNotifications ?? true,
      });
    }
    res.json({ success: true });
  });

  app.get("/api/profile/learning-summary", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.claims.sub;
    const lang = (req.query.lang as string) || "en";
    const langLabel = lang === "pt-BR" ? "Brazilian Portuguese" : "English";
    const history = await storage.getChatHistory(userId);
    if (history.length === 0) {
      return res.json({ summary: null });
    }
    const historyText = history
      .map(
        (h) =>
          `[${h.topic}] Q: ${h.question}${h.found ? ` → A: ${h.answer.slice(0, 200)}` : " (not answered)"}`
      )
      .join("\n")
      .slice(0, 6000);

    try {
      const result = await generateLearningSummary(historyText, langLabel);
      res.json(result);
    } catch {
      res.json({ summary: null, suggestedTopics: [] });
    }
  });

  // ── Topic experience ───────────────────────────────────────────────────────

  app.get("/api/topic-experience/:topic", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const exp = await storage.getTopicExperience(
      req.user.claims.sub,
      req.params.topic
    );
    res.json(exp || null);
  });

  app.post("/api/topic-experience", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { topic, experience } = z
      .object({
        topic: z.string(),
        experience: z.enum(["beginner", "intermediate", "advanced"]),
      })
      .parse(req.body);
    const result = await storage.setTopicExperience({
      userId: req.user.claims.sub,
      topic,
      experience,
    });
    res.json(result);
  });

  // ── Chat history ───────────────────────────────────────────────────────────

  app.get("/api/chat-history", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const history = await storage.getChatHistory(req.user.claims.sub);
    res.json(history);
  });

  // ── Topics ─────────────────────────────────────────────────────────────────

  app.get("/api/topics", async (_req, res) => {
    const topics = await storage.getAvailableTopics();
    res.json(topics);
  });

  // ── Content management ─────────────────────────────────────────────────────

  app.post("/api/content/upload", requireAdmin, async (req: any, res) => {
    upload.single("file")(req, res, async (err: any) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "File upload error: " + err.message });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      try {
        const fileContent = req.file.buffer.toString("utf-8");
        const parsed = JSON.parse(fileContent);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          return res
            .status(400)
            .json({ message: "JSON must be a non-empty array" });
        }

        const validated = parsed.map((item: any, idx: number) => {
          const result = jsonItemSchema.safeParse(item);
          if (!result.success) {
            throw new Error(
              `Invalid item at index ${idx}: ${result.error.issues.map((i) => i.message).join(", ")}`
            );
          }
          return result.data;
        });

        const topic = validated[0].Topic;
        const allSameTopic = validated.every(
          (item: any) => item.Topic === topic
        );
        if (!allSameTopic) {
          return res.status(400).json({
            message: "All items in the JSON file must have the same Topic",
          });
        }

        await storage.clearContentByTopic(topic);

        const contentItems = validated.map((item: any) => ({
          unitId: item.Unit_ID || null,
          topic: item.Topic,
          subtopic: item.Subtopic,
          searchContext: item.Search_Context || null,
          keywords: item.Keywords || null,
          keyTakeaway: item.Key_Takeaway || null,
          difficulty: item.Difficulty || null,
          useCase: item.Use_Case || null,
          timestampLink: item.Timestamp_Link || null,
        }));

        await storage.bulkCreateContent(contentItems);
        invalidateContentCache(topic);

        res.json({
          message: `Uploaded ${contentItems.length} items for topic "${topic}"`,
          count: contentItems.length,
          topic,
        });
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          return res.status(400).json({ message: "Invalid JSON file" });
        }
        return res
          .status(400)
          .json({ message: error.message || "Upload failed" });
      }
    });
  });

  app.post(
    "/api/admin/sync-sheets",
    requireAdmin,
    async (_req, res) => {
      try {
        const { syncFromSheet } = await import("./google-sheets");
        const rows = await syncFromSheet();
        if (rows.length === 0) {
          return res.status(400).json({
            message:
              "No data found in Google Sheet. Check column headers.",
          });
        }
        const items = rows.map((row) => ({
          topic: row.topic,
          subtopic: row.question,
          searchContext: row.searchContext || null,
          keywords: row.keywords.join(", ") || null,
          keyTakeaway: row.answer || null,
          difficulty: row.difficulty || null,
          useCase: row.useCase || null,
          timestampLink: row.link || null,
        }));
        const result = await storage.upsertContentBatch(items);
        invalidateContentCache(); // multiple topics may have changed
        res.json({
          message: `Sync complete: ${result.added} added, ${result.updated} updated`,
          added: result.added,
          updated: result.updated,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ message: error.message || "Sheets sync failed" });
      }
    }
  );

  app.get(api.content.list.path, async (_req, res) => {
    const contentItems = await storage.getAllContent();
    res.json(contentItems);
  });

  app.get("/api/content/:topic", async (req, res) => {
    const topic = decodeURIComponent(req.params.topic);
    const contentItems = await storage.getContentByTopic(topic);
    res.json(contentItems);
  });

  // ── Chat ───────────────────────────────────────────────────────────────────

  app.get("/api/usage", async (_req, res) => {
    const limit = parseInt(process.env.MONTHLY_MESSAGE_LIMIT || "0", 10);
    const used = await storage.getMonthlyMessageCount();
    res.json({
      used,
      limit: limit || null,
      remaining: limit ? Math.max(0, limit - used) : null,
    });
  });

  app.post(api.chat.ask.path, async (req: any, res) => {
    try {
      const { topic, question, language, history } =
        api.chat.ask.input.parse(req.body);

      const monthlyLimit = parseInt(
        process.env.MONTHLY_MESSAGE_LIMIT || "0",
        10
      );
      if (monthlyLimit > 0) {
        const used = await storage.getMonthlyMessageCount();
        if (used >= monthlyLimit) {
          const isPt = (language || "en") === "pt-BR";
          return res.status(429).json({
            message: isPt
              ? "Sua organização atingiu o limite mensal de perguntas do plano atual. Entre em contato para fazer upgrade."
              : "Your organization has reached the monthly message limit for the current plan. Please contact us to upgrade.",
            limitReached: true,
          });
        }
      }

      let profile: UserProfile | null = null;
      const userId = req.isAuthenticated?.() ? req.user?.claims?.sub : null;

      if (userId) {
        profile = (await storage.getUserProfile(userId)) || null;
      }

      const topicExp = userId
        ? (await storage.getTopicExperience(userId, topic)) || null
        : null;

      const contentItems = await getContentCached(topic);
      const result = await findBestAnswer(
        topic,
        question,
        contentItems,
        language || "en",
        profile,
        topicExp,
        history as ConversationMessage[] | undefined
      );

      if (userId) {
        await storage.logChatHistory({
          userId,
          topic,
          question,
          answer:
            result.answer ||
            (language === "pt-BR"
              ? "Sem resposta encontrada"
              : "No answer found"),
          found: result.found,
        });
      }

      if (!result.found) {
        const userEmail = req.isAuthenticated?.()
          ? req.user?.claims?.email
          : null;
        storage
          .logUnansweredQuestion({
            topic,
            question,
            userId: userId || null,
            userEmail: userEmail || null,
          })
          .catch(() => {});
      }

      res.json({
        answer: result.answer,
        found: result.found,
        link: result.link || null,
        suggestions: result.suggestions || [],
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request" });
      }
      console.error("Chat error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Unanswered questions / admin responses ─────────────────────────────────

  app.get(api.unanswered.list.path, async (_req, res) => {
    const questions = await storage.getUnansweredQuestions();
    res.json(questions);
  });

  app.post("/api/admin/respond", requireAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { questionId, response } = req.body;
      if (!questionId || !response) {
        return res
          .status(400)
          .json({ message: "questionId and response are required" });
      }

      const question = await storage.getUnansweredQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.userId) {
        await storage.respondToQuestion({
          questionId,
          userId: question.userId,
          topic: question.topic,
          question: question.question,
          response,
          adminId,
        });

        if (question.userEmail) {
          const userProfile = await storage.getUserProfile(question.userId);
          if (!userProfile || userProfile.emailNotifications !== false) {
            try {
              await sendEmailNotification(
                question.userEmail,
                question.question,
                response,
                question.topic
              );
            } catch (emailErr) {
              console.error("Email notification failed:", emailErr);
            }
          }
        }
      }

      await storage.markQuestionReviewed(questionId);
      res.json({ success: true });
    } catch (err) {
      console.error("Respond error:", err);
      res.status(500).json({ message: "Failed to respond" });
    }
  });

  // ── Admin: users ───────────────────────────────────────────────────────────

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const usersWithStats = await storage.getAllUsersWithStats();
      res.json(usersWithStats);
    } catch {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch(
    "/api/admin/users/:userId/admin",
    requireAdmin,
    async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { isAdmin } = req.body;
        if (userId === req.user.claims.sub) {
          return res
            .status(400)
            .json({ message: "You cannot change your own admin status" });
        }
        await storage.setUserAdmin(userId, isAdmin === true);
        res.json({ success: true });
      } catch {
        res.status(500).json({ message: "Failed to update admin status" });
      }
    }
  );

  app.patch(
    "/api/admin/users/:userId/whatsapp",
    requireAdmin,
    async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { phone } = req.body;
        const normalized = phone ? phone.replace(/\D/g, "") : null;
        await storage.setUserWhatsappPhone(userId, normalized || null);
        res.json({ success: true, phone: normalized || null });
      } catch (error: any) {
        if (error?.code === "23505") {
          return res.status(409).json({
            message: "This phone number is already linked to another user.",
          });
        }
        res.status(500).json({ message: "Failed to update WhatsApp phone" });
      }
    }
  );

  app.get("/api/admin/users/export", requireAdmin, async (_req, res) => {
    try {
      const usersWithStats = await storage.getAllUsersWithStats();
      const topics = await storage.getAvailableTopics();
      const BOM = "\uFEFF";
      const topicHeaders = topics.map((t) => `${t} Qs`).join(",");
      const header = `Name,Email,${topicHeaders || "Questions"},Registered`;
      const rows = usersWithStats.map((u) => {
        const name =
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || "-";
        const email = u.email || "-";
        const registered = u.createdAt
          ? new Date(u.createdAt).toISOString().split("T")[0]
          : "-";
        const topicCounts = topics
          .map((t) => u.questionCounts[t] || 0)
          .join(",");
        return `"${name.replace(/"/g, '""')}","${email.replace(/"/g, '""')}",${topicCounts || "0"},"${registered}"`;
      });
      const csv = BOM + header + "\n" + rows.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=users_export.csv"
      );
      res.send(csv);
    } catch {
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // ── Notifications ──────────────────────────────────────────────────────────

  app.get("/api/notifications", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const notifications = await storage.getNotifications(req.user.claims.sub);
    res.json(notifications);
  });

  app.get("/api/notifications/count", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const count = await storage.getUnreadNotificationCount(
      req.user.claims.sub
    );
    res.json({ count });
  });

  app.patch("/api/notifications/read-all", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    await storage.markAllNotificationsRead(req.user.claims.sub);
    res.json({ success: true });
  });

  app.patch("/api/notifications/:id/read", async (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const notificationId = parseInt(req.params.id);
    await storage.markNotificationRead(notificationId, req.user.claims.sub);
    res.json({ success: true });
  });

  // ── WhatsApp phone verification ────────────────────────────────────────────

  app.delete("/api/profile/whatsapp", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await storage.setUserWhatsappPhone(req.user.claims.sub, null);
    res.json({ success: true });
  });

  app.post(
    "/api/profile/whatsapp/request-code",
    async (req: any, res) => {
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.claims.sub;
      const { phone } = req.body;
      const normalized = phone ? phone.replace(/\D/g, "") : null;
      if (!normalized || normalized.length < 7) {
        return res.status(400).json({ message: "Invalid phone number." });
      }

      const existing = await storage.getUserByWhatsappPhone(normalized);
      if (existing && existing.id !== userId) {
        return res.status(409).json({
          message: "This number is already linked to another account.",
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      pendingVerifications.set(normalized, {
        code,
        userId,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const userProfile = await storage.getUserProfile(userId);
      // Default to pt-BR when no preference is stored (primary market is Brazil).
      const isPt = (userProfile?.preferredLanguage ?? "pt-BR") !== "en";
      const otpMessage = isPt
        ? `Seu código de verificação onset. é: *${code}*\n\nEste código expira em 10 minutos.`
        : `Your onset. verification code is: *${code}*\n\nThis code expires in 10 minutes.`;

      const sent = await sendWhatsAppMessage(normalized, otpMessage);
      if (!sent) {
        pendingVerifications.delete(normalized);
        return res.status(502).json({
          message:
            "Could not send WhatsApp message. Make sure you have started a conversation with the bot first (+551153045402), then try again.",
        });
      }
      res.json({ success: true });
    }
  );

  app.post("/api/profile/whatsapp/verify", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.claims.sub;
    const { phone, code } = req.body;
    const normalized = phone ? phone.replace(/\D/g, "") : null;
    if (!normalized || !code) {
      return res
        .status(400)
        .json({ message: "Phone and code are required." });
    }

    const pending = pendingVerifications.get(normalized);
    if (!pending) {
      return res.status(400).json({
        message:
          "No verification pending for this number. Request a new code.",
      });
    }
    if (pending.userId !== userId) {
      return res.status(403).json({ message: "Verification mismatch." });
    }
    if (Date.now() > pending.expiresAt) {
      pendingVerifications.delete(normalized);
      return res
        .status(400)
        .json({ message: "Code expired. Please request a new one." });
    }
    if (pending.code !== code.trim()) {
      return res
        .status(400)
        .json({ message: "Incorrect code. Please try again." });
    }

    pendingVerifications.delete(normalized);
    try {
      await storage.setUserWhatsappPhone(userId, normalized);
      res.json({ success: true, phone: normalized });

      // Send a welcome message to the newly linked number.
      const userProfile = await storage.getUserProfile(userId);
      const isPt = (userProfile?.preferredLanguage ?? "pt-BR") !== "en";
      const allTopics = await storage.getAvailableTopics();
      const topicName = allTopics[0] ?? "";
      const welcomeMsg = isPt
        ? `Número vinculado com sucesso! Agora você pode me perguntar qualquer coisa sobre *${topicName}* diretamente por aqui.`
        : `Your number is now linked! You can now ask me anything about *${topicName}* directly here.`;
      sendWhatsAppMessage(normalized, welcomeMsg).catch(() => {});
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({
          message: "This number is already linked to another account.",
        });
      }
      res.status(500).json({ message: "Failed to save phone number." });
    }
  });

  // ── WhatsApp webhook ───────────────────────────────────────────────────────

  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
      mode === "subscribe" &&
      token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      console.log("[WhatsApp] Webhook verified successfully");
      return res.status(200).send(challenge);
    }
    console.log("[WhatsApp] Webhook verification failed", {
      mode,
      token: token ? "provided" : "missing",
    });
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    res.sendStatus(200);

    try {
      const body = req.body;
      if (body.object !== "whatsapp_business_account") return;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          const messages = change.value?.messages || [];
          const contacts = change.value?.contacts || [];

          for (const message of messages) {
            if (message.type !== "text") continue;

            const from = message.from;
            const text = message.text?.body?.trim();
            const contactName =
              contacts.find((c: any) => c.wa_id === from)?.profile?.name ||
              "User";

            if (!text) continue;

            console.log(
              `[WhatsApp] Message from ${contactName} (${from}): ${text}`
            );

            const linkedUser = await storage.getUserByWhatsappPhone(from);

            if (!linkedUser) {
              const unregisteredMsg = `Olá! Seu número do WhatsApp ainda não está vinculado a uma conta. Peça ao administrador para vincular seu número ao seu perfil e tente novamente.`;
              await sendWhatsAppMessage(from, unregisteredMsg);
              continue;
            }

            const allTopics = await storage.getAvailableTopics();
            const defaultTopic =
              allTopics.length > 0 ? allTopics[0] : null;

            const profile = await storage.getUserProfile(linkedUser.id);

            if (!defaultTopic) {
              const noTopicMsg =
                (profile?.preferredLanguage || "") === "pt-BR"
                  ? "Nenhum tópico disponível ainda. Por favor, tente novamente mais tarde."
                  : "No topics available yet. Please try again later.";
              await sendWhatsAppMessage(from, noTopicMsg);
              continue;
            }
            const topicExp = await storage.getTopicExperience(
              linkedUser.id,
              defaultTopic
            );

            const rawHistory = await storage.getChatHistoryByTopic(
              linkedUser.id,
              defaultTopic
            );
            const history: ConversationMessage[] = rawHistory
              .slice(0, 10)
              .reverse()
              .flatMap((h) => [
                { role: "user" as const, content: h.question },
                { role: "bot" as const, content: h.answer },
              ]);

            const looksPortuguese =
              /[àáâãéêíóôõúç]|^(oi|olá|ola|tudo|sim|não|nao|bom|boa|dia|tarde|noite|salve|fala|e aí|eai|valeu|obrigado|obrigada|tchau|até|ate|help|ajuda)\b|como|você|quero|obrigad|aprender|sobre|pode|ajud/i.test(
                text
              );
            const explicitPt =
              /responde?\s+em\s+portugu[eê]s|fala\s+portugu[eê]s/i.test(text);
            const explicitEn =
              /respond?\s+in\s+english|speak\s+english|switch\s+to\s+english/i.test(
                text
              );
            // Determine language: stored preference wins, explicit switch overrides,
            // heuristic (looksPortuguese) sets it when no preference is stored yet.
            // We never flip back to English on a neutral/short message — only an
            // explicit English request can do that.
            let detectedLang: string =
              profile?.preferredLanguage || "pt-BR";
            if (explicitPt) detectedLang = "pt-BR";
            if (explicitEn) detectedLang = "en";

            // Persist whenever there is a positive signal so language sticks
            // across short/neutral messages.
            const shouldSaveLang =
              explicitPt ||
              explicitEn ||
              (looksPortuguese && profile?.preferredLanguage !== "pt-BR");
            if (shouldSaveLang) {
              await storage.setUserPreferredLanguage(
                linkedUser.id,
                detectedLang
              );
            }

            const monthlyLimit = parseInt(
              process.env.MONTHLY_MESSAGE_LIMIT || "0",
              10
            );
            if (monthlyLimit > 0) {
              const used = await storage.getMonthlyMessageCount();
              if (used >= monthlyLimit) {
                const limitMsg =
                  detectedLang === "pt-BR"
                    ? `Sua organização atingiu o limite mensal de mensagens. Entre em contato com o administrador para continuar.`
                    : `Your organization has reached the monthly message limit. Contact your administrator to continue.`;
                await sendWhatsAppMessage(from, limitMsg);
                continue;
              }
            }

            let resolvedText = text;
            const numericReply = text.trim().match(/^([123])\.?$/);
            if (numericReply) {
              const prev = lastSuggestions.get(from);
              const idx = parseInt(numericReply[1], 10) - 1;
              if (prev && prev[idx]) {
                resolvedText = prev[idx];
              } else {
                // No suggestion memory (e.g. after server restart) — ask user to rephrase
                const rephraseMsg =
                  detectedLang === "pt-BR"
                    ? "Por favor, escreva sua pergunta completa."
                    : "Please type your full question.";
                await sendWhatsAppMessage(from, rephraseMsg);
                continue;
              }
            }

            const contentItems = await getContentCached(defaultTopic);
            const result = await findBestAnswer(
              defaultTopic,
              resolvedText,
              contentItems,
              detectedLang,
              profile ?? null,
              topicExp ?? null,
              history
            );

            await storage.logChatHistory({
              userId: linkedUser.id,
              topic: defaultTopic,
              question: text,
              answer: result.answer,
              found: result.found,
            });

            if (result.answer) {
              let reply = stripMarkdownLinksForWhatsApp(result.answer);
              if (result.link) reply += `\n\n${result.link}`;
              if (result.suggestions && result.suggestions.length > 0) {
                lastSuggestions.set(from, result.suggestions);
                const optionsLabel =
                  detectedLang === "pt-BR"
                    ? "Continuar com:"
                    : "Continue with:";
                reply +=
                  `\n\n*${optionsLabel}*\n` +
                  result.suggestions
                    .map((s, i) => `${i + 1}. ${s}`)
                    .join("\n");
              } else {
                lastSuggestions.delete(from);
              }
              await sendWhatsAppMessage(from, reply);
            } else {
              const notFoundMsg =
                detectedLang === "pt-BR"
                  ? `Não encontrei uma resposta sobre isso na nossa base de conhecimento sobre "${defaultTopic}". Tente perguntar de outra forma!`
                  : `I don't have information about that in our "${defaultTopic}" knowledge base yet. Try asking something else!`;
              await sendWhatsAppMessage(from, notFoundMsg);
            }

            if (!result.found) {
              await storage.logUnansweredQuestion({
                topic: defaultTopic,
                question: text,
                userId: linkedUser.id,
                userEmail: linkedUser.email,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Error processing message:", error);
    }
  });

  return httpServer;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// WhatsApp does not render markdown links ([text](url)). Convert them to a
// plain label + bare URL so WhatsApp auto-links the URL correctly.
function stripMarkdownLinksForWhatsApp(text: string): string {
  return text.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (_match, label, url) => {
    const cleanLabel = label.trim();
    const cleanUrl = url.trim();
    // If the label is generic ("aqui", "here", "link", "clique aqui", etc.)
    // just return the URL. Otherwise keep "Label: URL" for context.
    const genericLabels = /^(aqui|here|link|clique aqui|click here|assistir|watch|ver|veja|acesse|access|abrir|open)$/i;
    return genericLabels.test(cleanLabel) ? cleanUrl : `${cleanLabel}: ${cleanUrl}`;
  });
}

async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(
      "[WhatsApp] Skipped sending (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)"
    );
    return false;
  }

  if (text.length > 4000) text = text.slice(0, 4000);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[WhatsApp] Send failed:", err);
      return false;
    }
    console.log(`[WhatsApp] Message sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[WhatsApp] Send error:", error);
    return false;
  }
}

export async function seedDatabase() {
  try {
    const { pool } = await import("./db");
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) UNIQUE`
    );
    await pool.query(
      `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT`
    );
    await pool.query(
      `UPDATE users SET is_admin = true WHERE email = 'dczarcin@gmail.com' AND (is_admin IS NULL OR is_admin = false)`
    );
  } catch (error) {
    console.error("Seed database error:", error);
  }
}
