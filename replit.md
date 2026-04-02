# onset. Assistant — Project Reference

## Overview
A chatbot web application branded "onset. Assistant" that answers user questions based on a curated knowledge base (uploaded per topic via admin panel). Users choose a topic, set their experience level, and receive personalized microlearning responses. The bot uses Anthropic Claude (claude-sonnet-4-6) with a two-phase conversational approach: Phase 1 classifies intent (MATCH/EXPLORE/PLAN/OVERVIEW/SUGGEST/NOT_FOUND/OFF_TOPIC), Phase 2 generates a contextual coaching response. Unanswered questions are logged for admin review. The bot never invents answers beyond the knowledge base.

## Deployment
- **Platform:** Railway (`https://onset-assistant-production.up.railway.app`)
- **Custom domain:** `https://www.onset-edu.com` (DNS via Cloudflare, nameservers: armando + eleanor)
- **Start command** (railway.toml): `npm run db:push && NODE_ENV=production node dist/index.cjs`
- **Build command:** `npm install && npm run build`
- **Key env vars:** `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `GMAIL_APP_PASSWORD`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `MONTHLY_MESSAGE_LIMIT`

## Current Features
- Landing page `/` with product overview and CTA
- Chat interface `/bot` — dynamic topic selection, per-topic experience level, conversation history
- Admin panel `/admin` — JSON upload, topic inspector, unanswered questions, user management, CSV export, admin respond to questions
- Two-phase AI classification + response (Claude claude-sonnet-4-6)
- Suggestion chips on bot responses — context-aware, only shown on latest message, only when offering topics to explore
- OVERVIEW response lists categories as chips
- NOT_FOUND keeps conversation alive — pivots to related topics, never dead-ends user
- Continuation phrases ("tell me more", "yes", "ok") pre-intercepted as EXPLORE before classifier
- Multi-language: English and Brazilian Portuguese (pt-BR)
- Language toggle in header, persisted per user in `user_profiles.preferred_language`
- Authentication: Google OAuth + email/password (passport)
- Onboarding questionnaire `/onboarding` (role, industry, goal, challenge, learning preference)
- Per-topic experience level (beginner/intermediate/advanced) — asked once per topic
- Chat history tracking for authenticated users
- User profile `/profile`:
  - Left column: AI Learning Summary (generate button, clickable topic chips → bot auto-starts)
  - Left column: Activity card (stats grid + full question history)
  - Right sidebar: WhatsApp linking (2-step verification via code sent over WhatsApp), Email notifications toggle, Personal Info (collapsible), Learning Preference (collapsible), Admin link
- Learning summary chips navigate to `/bot?topic=ExactDBTopic&q=Tell me about "TranslatedLabel"` — topic auto-selected, bot auto-sends question
- Notification bell in header — admin responses, unread count badge, mark all/one read
- WhatsApp bot integration — user links phone via verified code, bot responds on WhatsApp, numbered options (1/2/3) for chips, messages capped at 4000 chars
- Monthly message limit (global, configurable via `MONTHLY_MESSAGE_LIMIT` env var)
- Video/link popup — YouTube/Loom/Vimeo embed in modal, other URLs open in new tab
- OG meta tags with absolute URLs (https://www.onset-edu.com/og-image.png)

## Architecture
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui + framer-motion + wouter routing
- **Backend:** Express.js + Drizzle ORM + PostgreSQL
- **Auth:** Google OAuth (passport-google-oauth20) + Local email/password (passport-local + bcryptjs)
- **AI:** Anthropic Claude claude-sonnet-4-6 (replaced OpenAI)
- **Email:** Nodemailer with Gmail SMTP (onset.devs@gmail.com, GMAIL_APP_PASSWORD env var)
- **WhatsApp:** Meta Graph API v21.0 webhook

## Key Files
- `shared/schema.ts` — DB models (content, unanswered_questions, user_profiles, topic_experience, chat_history, admin_responses)
- `shared/models/auth.ts` — Auth tables (users with isAdmin, whatsappPhone columns; sessions)
- `shared/routes.ts` — API contract definitions
- `server/routes.ts` — All backend endpoints, AI classification + response logic, WhatsApp webhook, phone verification
- `server/storage.ts` — All DB operations
- `server/db.ts` — Database connection
- `client/src/pages/landing.tsx` — Landing page
- `client/src/pages/home.tsx` — /bot page, stable initialMessage/initialTopic via useState lazy init, auto-selects topic from URL params
- `client/src/pages/admin.tsx` — Admin dashboard
- `client/src/pages/login.tsx` — Login/register
- `client/src/pages/onboarding.tsx` — Onboarding flow
- `client/src/pages/profile.tsx` — User profile with learning summary, activity, WhatsApp card
- `client/src/components/chat-interface.tsx` — Chat widget, getEmbedInfo() for URL detection, chips on latest bot message only
- `client/src/components/site-nav.tsx` — Shared nav component
- `client/src/hooks/use-auth.ts` — Auth hook
- `client/src/hooks/use-content.ts` — Content/topics hooks
- `client/src/hooks/use-chat.ts` — Chat mutation hook
- `client/src/lib/i18n.ts` — Translations en + pt-BR
- `client/src/lib/language-context.tsx` — Language state context
- `railway.toml` — Railway deploy config
- `client/index.html` — OG meta tags with absolute URLs

## AI Bot Logic (server/routes.ts — findBestAnswer)
### Phase 1: Classification
- Pre-intercept: continuation phrases (tell me more, yes, ok, etc.) → EXPLORE immediately
- Pre-intercept: if last bot message was an OVERVIEW and user reply is short → EXPLORE immediately
- Otherwise: callClaude with classify prompt (50 tokens), result trimmed
- Classifications: MATCH:[n] / EXPLORE / PLAN / OVERVIEW / SUGGEST / NOT_FOUND / OFF_TOPIC

### Phase 2: Response
- **MATCH** — coaching response from specific KB entry, related subtopics, conditional chips
- **EXPLORE** — conversational coaching using full KB list, MODE A (specific) or MODE B (exploring), conditional chips
- **PLAN** — structured learning path with links
- **OVERVIEW** — category list as bullet points, ALL category chips
- **SUGGEST** — partial matches listed, user picks one
- **NOT_FOUND** — brief pivot + related topics + chips, question logged for admin review (silently)
- **OFF_TOPIC** — polite redirect

### Chips ([OPTIONS:] format)
- Claude appends `[OPTIONS: label 1 | label 2 | label 3]` only when offering KB topics to explore
- NOT on personal/reflective questions or yes/no follow-ups
- parseChips() strips it from display, returns as suggestions array
- Client renders chips only on latest bot message, not on history

### WhatsApp
- Webhook at `POST /api/whatsapp/webhook`
- User links phone in profile → 2-step: request code → verify code (10-min TTL, in-memory)
- Bot sends numbered options (1/2/3) matching chips; user replies with number
- lastSuggestions Map tracks last options per phone for number resolution
- Messages capped at 4000 chars in sendWhatsAppMessage()

## API Endpoints
- `POST /api/chat` — Ask question, returns answer + found + link + suggestions
- `GET /api/topics` — Available topics
- `GET /api/content` — All KB content
- `POST /api/content/upload` — Upload JSON for a topic
- `GET /api/unanswered` — Unanswered questions (admin)
- `POST /api/admin/respond` — Admin responds to question
- `PATCH /api/admin/users/:id/admin` — Toggle admin
- `PATCH /api/admin/users/:id/whatsapp` — Admin sets user phone
- `GET /api/profile` — Get profile
- `POST /api/profile` — Save profile
- `PATCH /api/profile/notifications` — Toggle email notifications
- `POST /api/profile/whatsapp/request-code` — Send WhatsApp verification code
- `POST /api/profile/whatsapp/verify` — Verify code and save phone
- `DELETE /api/profile/whatsapp` — Unlink phone
- `GET /api/profile/learning-summary?lang=` — AI learning summary + suggestedTopics [{label, topic}]
- `GET /api/topic-experience/:topic` — Get experience for topic
- `POST /api/topic-experience` — Set experience for topic
- `GET /api/chat-history` — User's full chat history
- `GET /api/notifications` — User notifications
- `GET /api/notifications/count` — Unread count
- `PATCH /api/notifications/:id/read` — Mark one read
- `PATCH /api/notifications/read-all` — Mark all read
- `GET /api/whatsapp/webhook` — WhatsApp webhook verification
- `POST /api/whatsapp/webhook` — WhatsApp incoming messages
- `GET /api/admin/users` — All users with stats
- `GET /api/admin/users/export` — CSV export

## JSON Knowledge Base Format
```json
[{
  "Unit_ID": "optional",
  "Topic": "TopicName",
  "Subtopic": "Specific subtopic title",
  "Search_Context": "Detailed context for AI matching",
  "Keywords": "comma, separated, keywords",
  "Key_Takeaway": "Point one | Point two | Point three",
  "Difficulty": "Beginner|Intermediate|Advanced",
  "Use_Case": "Example use case",
  "Timestamp_Link": "https://video-url-with-timestamp"
}]
```

## User/Brand Preferences
- Branding: "onset. Assistant" (lowercase o, period, space, capital A)
- Domain: www.onset-edu.com
- Never invent answers — only curated content
- Microlearning format — one key insight at a time
- Profile personalizes HOW answers are phrased, never adds content
- Experience level is per-topic, asked once per topic
- Topics are dynamic — based on uploaded JSON files
- No emojis in bot responses (unless user explicitly asks)
- Tone mirroring — bot matches user's communication style
