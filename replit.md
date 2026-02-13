# onset. Assistant - Knowledge Base Chatbot

## Overview
A chatbot web application branded "onset. Assistant" that answers user questions based on curated video content from a Google Sheet named "onsetMVP". Users choose a topic (AI Skills or Communication) and ask questions. The bot uses OpenAI (gpt-5-nano) for intelligent answer matching against the knowledge base, with fallback to keyword matching. Unanswered questions are logged for curator review. The bot never invents answers - if there's no genuine match, it says it doesn't know.

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
- Onboarding questionnaire at /onboarding (role, industry, experience, goal, challenge)

## Architecture
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + Drizzle ORM + PostgreSQL
- Auth: Replit Auth (OpenID Connect with Google, GitHub, email/password)
- AI: OpenAI gpt-5-nano via Replit AI Integrations (no API key needed)
- Data source: Google Sheets connector (reads from "onsetMVP" sheet)

## Key Files
- `shared/schema.ts` - Database models (content, unanswered_questions, user_profiles + auth tables)
- `shared/models/auth.ts` - Auth tables (users, sessions)
- `shared/routes.ts` - API contract definitions (chat, content, unanswered, sync)
- `server/routes.ts` - Backend API endpoints with OpenAI matching + auth + profile
- `server/storage.ts` - Database operations (CRUD, bulk create, clear, user profiles)
- `server/google-sheets.ts` - Google Sheets connector (find sheet by name, fetch data)
- `server/replit_integrations/auth/` - Auth integration (login, session, user management)
- `client/src/pages/home.tsx` - Main chat page with topic selection and auth controls
- `client/src/pages/admin.tsx` - Admin dashboard with sync button
- `client/src/pages/onboarding.tsx` - Onboarding questionnaire with progress indicator
- `client/src/components/chat-interface.tsx` - Chat widget
- `client/src/hooks/use-auth.ts` - Auth hook (user, login, logout)
- `client/src/hooks/use-content.ts` - Content and sync hooks
- `client/src/hooks/use-chat.ts` - Chat mutation hook
- `client/src/lib/i18n.ts` - Translations for en and pt-BR with language detection
- `client/src/lib/language-context.tsx` - React context for language state and persistence

## API Endpoints
- `POST /api/chat` - Ask a question (topic + question + language?), returns AI-matched answer (includes profile context if authenticated)
- `GET /api/content` - List all knowledge base content
- `POST /api/content` - Add new content item
- `GET /api/unanswered` - List unanswered questions
- `POST /api/sync` - Sync content from Google Sheets (clears and replaces all content)
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout
- `GET /api/profile` - Get user profile (requires auth)
- `POST /api/profile` - Save/update user profile (requires auth)

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
