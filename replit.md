# KnowBot - Knowledge Base Chatbot

## Overview
A chatbot web application that answers user questions based on predefined curated content. Users choose a topic (AI Skills or Communication) and ask questions. The bot looks for keyword matches in the knowledge base. Unanswered questions are logged for curator review.

## Current State
- MVP with two topics: "AI Skills" and "Communication"
- Chat interface on the home page with topic selection
- Admin panel at /admin to manage knowledge base and review unanswered questions
- Database-backed content storage (seeded with sample Q&A)

## Architecture
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + Drizzle ORM + PostgreSQL
- AI Integration: OpenAI via Replit AI Integrations (available but not used for chat matching in MVP)

## Key Files
- `shared/schema.ts` - Database models (content, unanswered_questions)
- `shared/routes.ts` - API contract definitions
- `server/routes.ts` - Backend API endpoints
- `server/storage.ts` - Database operations
- `client/src/pages/home.tsx` - Main chat page
- `client/src/pages/admin.tsx` - Admin dashboard
- `client/src/components/chat-interface.tsx` - Chat widget

## Pending Integrations
- **Google Sheets**: User dismissed the connector. Could be set up later to sync content from a Google Sheet instead of the database.
- **Twilio/WhatsApp**: User dismissed the connector. Could be set up later to receive/send messages via WhatsApp. Would need Twilio credentials stored as secrets.

## User Preferences
- Wants MVP simplicity
- Content should eventually come from Google Sheets
- WhatsApp integration desired for future
