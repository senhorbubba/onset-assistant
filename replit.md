# onset. Assistant - Knowledge Base Chatbot

## Overview
A chatbot web application branded "onset. Assistant" that answers user questions based on curated video content from a Google Sheet named "onsetMVP". Users choose a topic (AI Skills or Communication), provide their experience level for that specific topic, and receive personalized microlearning responses. The bot uses OpenAI (gpt-5-nano) for intelligent answer matching against the knowledge base, with fallback to keyword matching. Unanswered questions are logged for curator review. The bot never invents answers - if there's no genuine match, it says it doesn't know.

## Current State
- MVP with two topics: "AI Skills" and "Communication"
- Chat interface on the home page with topic selection
- Admin panel at /admin to manage knowledge base and review unanswered questions
- Google Sheets integration: syncs content from "onsetMVP" spreadsheet
- OpenAI-powered intelligent answer matching (gpt-5-nano via Replit AI Integrations)
- Database-backed content storage with link support
- Sync button in admin panel to refresh content from Google Sheets
- Multi-language support: English (en) and Brazilian Portuguese (pt-BR)
- Auto-detects user region (browser locale) — defaults to Portuguese for pt* locales
- Language choice persisted in localStorage across page navigation
- Mobile-first responsive design
- Google authentication via Replit Auth (OpenID Connect)
- User profile/onboarding system with personalized AI responses
- Onboarding questionnaire at /onboarding (role, industry, learning preference, goal, challenge)
- Per-topic experience level: asked once per topic on first visit, stored in `topic_experience` table
- Learning preference: quick tips, step-by-step, or real-world examples (set during onboarding)
- Microlearning format: AI delivers concise, single-insight responses tailored to preference
- Chat history tracking: all Q&A logged for authenticated users in `chat_history` table
- User profile panel at /profile: editable profile, learning preference, and learning summary dashboard

## Architecture
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + Drizzle ORM + PostgreSQL
- Auth: Replit Auth (OpenID Connect with Google, GitHub, email/password)
- AI: OpenAI gpt-5-nano via Replit AI Integrations (no API key needed)
- Data source: Google Sheets connector (reads from "onsetMVP" sheet)

## Key Files
- `shared/schema.ts` - Database models (content, unanswered_questions, user_profiles, topic_experience, chat_history + auth tables)
- `shared/models/auth.ts` - Auth tables (users, sessions)
- `shared/routes.ts` - API contract definitions (chat, content, unanswered, sync)
- `server/routes.ts` - Backend API endpoints with OpenAI matching + auth + profile + topic experience + chat history
- `server/storage.ts` - Database operations (CRUD, bulk create, clear, user profiles, topic experience, chat history)
- `server/google-sheets.ts` - Google Sheets connector (find sheet by name, fetch data)
- `server/replit_integrations/auth/` - Auth integration (login, session, user management)
- `client/src/pages/home.tsx` - Main chat page with topic selection and auth controls
- `client/src/pages/admin.tsx` - Admin dashboard with sync button
- `client/src/pages/onboarding.tsx` - Onboarding questionnaire with progress indicator (5 steps: role, industry, goal, challenge, learning preference)
- `client/src/pages/profile.tsx` - User profile panel with editable fields, learning preference, and learning summary
- `client/src/components/chat-interface.tsx` - Chat widget with per-topic experience prompt
- `client/src/hooks/use-auth.ts` - Auth hook (user, login, logout)
- `client/src/hooks/use-content.ts` - Content and sync hooks
- `client/src/hooks/use-chat.ts` - Chat mutation hook
- `client/src/lib/i18n.ts` - Translations for en and pt-BR with language detection
- `client/src/lib/language-context.tsx` - React context for language state and persistence

## API Endpoints
- `POST /api/chat` - Ask a question (topic + question + language?), returns AI-matched answer (includes profile + topic experience context if authenticated, logs to chat_history)
- `GET /api/content` - List all knowledge base content
- `POST /api/content` - Add new content item
- `GET /api/unanswered` - List unanswered questions
- `POST /api/sync` - Sync content from Google Sheets (clears and replaces all content)
- `GET /api/admin/users` - List all registered users with question counts per topic (requires auth)
- `GET /api/admin/users/export` - Export all users as CSV file (requires auth)
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout
- `GET /api/profile` - Get user profile (requires auth)
- `POST /api/profile` - Save/update user profile (requires auth, fields: role, industry, goal, challenge, learningPreference)
- `GET /api/topic-experience/:topic` - Get user's experience level for a topic (requires auth)
- `POST /api/topic-experience` - Set experience level for a topic (requires auth, fields: topic, experience)
- `GET /api/chat-history` - Get user's chat history (requires auth)

## Google Sheet Structure
The "onsetMVP" sheet should have columns: Topic, Question, Answer, Keywords, Link
- Topic: "AI Skills" or "Communication"
- Keywords: comma-separated list
- Link: optional URL for additional resources

## Future Plans
- WhatsApp integration via Twilio (deferred)

## User Preferences
- Branding: "onset. Assistant" (lowercase o, period, space, capital A)
- Wants MVP simplicity
- Content managed via Google Sheets
- OpenAI for intelligent matching (not just keywords)
- Never invent answers - only use curated content
- Profile personalizes HOW answers are phrased, never adds new content
- Experience level is per-topic, not global — ask once per topic, save it
- Microlearning format — one key insight at a time, not long study plans
- Learning preference maps to AI prompt: quick_tips = brief/actionable, step_by_step = clear breakdown, examples = practical scenarios
