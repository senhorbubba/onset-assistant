# onset. Assistant - Knowledge Base Chatbot

## Overview
A chatbot web application branded "onset. Assistant" that answers user questions based on curated JSON file uploads (one per topic). Users choose from dynamically available topics based on uploaded files, provide their experience level for that specific topic, and receive personalized microlearning responses. The bot uses OpenAI (gpt-4o-mini) with a two-phase conversational approach: Phase 1 classifies the user's intent (specific match, general/exploratory, learning plan, off-topic, not found), and Phase 2 generates a contextual response. For general questions the bot engages conversationally and suggests relevant subtopics; for specific questions it provides answers from the knowledge base with video links. Unanswered questions are logged for curator review. The bot never invents answers beyond the knowledge base.

## Current State
- Dynamic topics based on uploaded JSON files (one file per topic)
- Chat interface on the home page with dynamic topic selection
- Admin panel at /admin to upload JSON files, visually inspect knowledge base per topic, and manage users
- Two-phase conversational AI (gpt-4o-mini via Replit AI Integrations): Phase 1 classifies intent, Phase 2 generates response
- Conversational flow: general questions get guided exploration, specific questions get knowledge base answers with video links
- Conversation history support (last 6 messages) for multi-turn dialogues
- Database-backed content storage with JSON structure (Unit_ID, Subtopic, Search_Context, Keywords, Key_Takeaway, Difficulty, Use_Case, Timestamp_Link)
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
- Admin Users tab with dynamic question counts per topic and Excel/CSV export
- Admin response system: admins can respond to unanswered questions from admin panel
- Notification bell in user header: shows admin responses with unread count badge
- Email notification toggle in user profile settings (opt-out)
- Unanswered questions track userId and email for notification routing

## Architecture
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js + Drizzle ORM + PostgreSQL
- Auth: Replit Auth (OpenID Connect with Google, GitHub, email/password)
- AI: OpenAI gpt-4o-mini via Replit AI Integrations (no API key needed)
- Email: Nodemailer with Gmail SMTP (onset.devs@gmail.com, App Password in GMAIL_APP_PASSWORD secret)
- Data source: JSON file uploads (one file per topic, uploaded via admin panel)

## Key Files
- `shared/schema.ts` - Database models (content with JSON fields, unanswered_questions, user_profiles, topic_experience, chat_history, admin_responses + auth tables)
- `shared/models/auth.ts` - Auth tables (users, sessions)
- `shared/routes.ts` - API contract definitions (chat, topics, content, upload, unanswered)
- `server/routes.ts` - Backend API endpoints with OpenAI matching + auth + profile + topic experience + chat history + JSON upload
- `server/storage.ts` - Database operations (CRUD, bulk create, clear by topic, available topics, user stats)
- `server/replit_integrations/auth/` - Auth integration (login, session, user management)
- `client/src/pages/home.tsx` - Main chat page with dynamic topic selection
- `client/src/pages/admin.tsx` - Admin dashboard with JSON upload, topic inspector, unanswered questions, users tab
- `client/src/pages/onboarding.tsx` - Onboarding questionnaire with progress indicator (5 steps: role, industry, goal, challenge, learning preference)
- `client/src/pages/profile.tsx` - User profile panel with editable fields, learning preference, and learning summary
- `client/src/components/chat-interface.tsx` - Chat widget with per-topic experience prompt
- `client/src/hooks/use-auth.ts` - Auth hook (user, login, logout)
- `client/src/hooks/use-content.ts` - Content, topics, upload, and unanswered hooks
- `client/src/hooks/use-chat.ts` - Chat mutation hook
- `client/src/lib/i18n.ts` - Translations for en and pt-BR with language detection
- `client/src/lib/language-context.tsx` - React context for language state and persistence

## API Endpoints
- `POST /api/chat` - Ask a question (topic + question + language?), returns AI-matched answer
- `GET /api/topics` - List all available topics (derived from uploaded content)
- `GET /api/content` - List all knowledge base content
- `GET /api/content/:topic` - List content for a specific topic
- `POST /api/content/upload` - Upload JSON file for a topic (requires auth, replaces existing content for that topic)
- `GET /api/unanswered` - List unanswered questions
- `GET /api/admin/users` - List all registered users with question counts per topic (requires auth)
- `GET /api/admin/users/export` - Export all users as CSV file (requires auth)
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout
- `GET /api/profile` - Get user profile (requires auth)
- `POST /api/profile` - Save/update user profile (requires auth)
- `GET /api/topic-experience/:topic` - Get user's experience level for a topic (requires auth)
- `POST /api/topic-experience` - Set experience level for a topic (requires auth)
- `GET /api/chat-history` - Get user's chat history (requires auth)
- `POST /api/admin/respond` - Admin responds to unanswered question (requires auth)
- `GET /api/notifications` - Get user's notifications (requires auth)
- `GET /api/notifications/count` - Get unread notification count (requires auth)
- `PATCH /api/notifications/:id/read` - Mark notification as read (requires auth)
- `PATCH /api/profile/notifications` - Toggle email notifications preference (requires auth)

## JSON File Structure
Each JSON file should be an array of objects with these fields:
- `Unit_ID`: Unique identifier for the content unit (optional)
- `Topic`: Topic name (e.g., "Communication", "AI Skills") — all items in one file must have the same Topic
- `Subtopic`: Specific subtopic title
- `Search_Context`: Detailed context for AI matching
- `Keywords`: Comma-separated keywords for matching
- `Key_Takeaway`: Main learning points (pipe-separated)
- `Difficulty`: "Beginner", "Intermediate", or "Advanced"
- `Use_Case`: Example use case
- `Timestamp_Link`: URL with timestamp to video content

## User Preferences
- Branding: "onset. Assistant" (lowercase o, period, space, capital A)
- Wants MVP simplicity
- Content managed via JSON file uploads (one file per topic)
- OpenAI for intelligent matching (not just keywords)
- Never invent answers - only use curated content
- Profile personalizes HOW answers are phrased, never adds new content
- Experience level is per-topic, not global — ask once per topic, save it
- Microlearning format — one key insight at a time, not long study plans
- Learning preference maps to AI prompt: quick_tips = brief/actionable, step_by_step = clear breakdown, examples = practical scenarios
- Topics are dynamic — available based on uploaded JSON files
