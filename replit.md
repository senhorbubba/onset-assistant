# KnowBot - Knowledge Base Chatbot

## Overview
A chatbot web application that answers user questions based on curated content from a Google Sheet named "onsetMVP". Users choose a topic (AI Skills or Communication) and ask questions. The bot uses OpenAI (gpt-5-nano) for intelligent answer matching against the knowledge base, with fallback to keyword matching. Unanswered questions are logged for curator review.

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

## Architecture
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + Drizzle ORM + PostgreSQL
- AI: OpenAI gpt-5-nano via Replit AI Integrations (no API key needed)
- Data source: Google Sheets connector (reads from "onsetMVP" sheet)

## Key Files
- `shared/schema.ts` - Database models (content with link field, unanswered_questions)
- `shared/routes.ts` - API contract definitions (chat, content, unanswered, sync)
- `server/routes.ts` - Backend API endpoints with OpenAI matching
- `server/storage.ts` - Database operations (CRUD, bulk create, clear)
- `server/google-sheets.ts` - Google Sheets connector (find sheet by name, fetch data)
- `client/src/pages/home.tsx` - Main chat page with topic selection
- `client/src/pages/admin.tsx` - Admin dashboard with sync button
- `client/src/components/chat-interface.tsx` - Chat widget
- `client/src/hooks/use-content.ts` - Content and sync hooks
- `client/src/hooks/use-chat.ts` - Chat mutation hook
- `client/src/lib/i18n.ts` - Translations for en and pt-BR with language detection
- `client/src/lib/language-context.tsx` - React context for language state and persistence

## API Endpoints
- `POST /api/chat` - Ask a question (topic + question + language?), returns AI-matched answer
- `GET /api/content` - List all knowledge base content
- `POST /api/content` - Add new content item
- `GET /api/unanswered` - List unanswered questions
- `POST /api/sync` - Sync content from Google Sheets (clears and replaces all content)

## Google Sheet Structure
The "onsetMVP" sheet should have columns: Topic, Question, Answer, Keywords, Link
- Topic: "AI Skills" or "Communication"
- Keywords: comma-separated list
- Link: optional URL for additional resources

## Future Plans
- WhatsApp integration via Twilio (deferred)

## User Preferences
- Wants MVP simplicity
- Content managed via Google Sheets
- OpenAI for intelligent matching (not just keywords)
