
# Technical Blueprint – Internal Meeting Notes + AI Assistant App

## 1. Technology Stack

### Frontend
- **Framework**: Vibe Coding (React-based)
- **UI**: Responsive web design, Mobile-friendly
- **State Management**: Context API / Zustand
- **Styling**: Tailwind CSS

### Backend
- **Framework**: Node.js + Express
- **Auth & User Management**: Supabase Auth (Email/Password + Google SSO)
- **API Layer**: REST APIs + WebSockets (for real-time updates)
- **Data Processing**:
  - Speech-to-Text: OpenAI Whisper API
  - NLP: OpenAI GPT API

### Database & Storage
- **Authentication & Roles**: Supabase
- **App Data Storage**: Airtable (Projects, Meetings, Tasks)
- **File Storage**: Google Cloud Storage (Meeting recordings, uploaded documents)

### Integrations
- Google Calendar API (Meeting sync)
- Slack API (Notifications)
- Notion API (Knowledge sync)
- Airtable API (Data retrieval & updates)

### Deployment
- **Frontend + Backend**: Vercel
- **Database**: Supabase Cloud
- **File Storage**: Google Cloud Storage

---

## 2. System Architecture

**Flow Overview**:
1. **User Authentication** → Supabase Auth verifies credentials and assigns roles.
2. **Project & Meeting Management** → Airtable stores project metadata, meetings, tasks.
3. **Meeting Upload** → File uploaded to Google Cloud Storage, URL stored in Airtable.
4. **AI Processing Pipeline**:
    - Whisper API: Transcription
    - GPT API: MOM generation, action items, summaries
5. **Task Management** → Tasks auto-generated in Airtable linked to meetings.
6. **AI Chatbot** → Queries Airtable + Supabase to return contextual answers.
7. **Real-Time Updates** → Supabase subscriptions + Airtable API polling.
8. **Notifications & Reminders** → Slack + Email + Calendar events.

---

## 3. Data Models

### Supabase (Auth & Roles)
**users**
```sql
id UUID PRIMARY KEY,
name TEXT,
email TEXT UNIQUE,
role TEXT CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'viewer')),
created_at TIMESTAMP DEFAULT now()
```

### Airtable (App Data)
**Projects**
- id (Auto-generated)
- name (Text)
- created_by (User ID from Supabase)
- members (Array of User IDs)
- meetings (Linked to Meetings table)

**Meetings**
- id
- project_id (Linked to Projects)
- title
- date
- recording_url (Google Cloud Storage link)
- mom (Long text)
- action_points (Linked to Tasks)

**Tasks**
- id
- name
- owner_id (Supabase User ID)
- status (pending, in_progress, done)
- deadline (Date)
- source_meeting (Linked to Meetings)
- team (Text)

---

## 4. API Endpoints

### Auth
- `POST /auth/login` → Supabase Auth login
- `POST /auth/signup` → Supabase Auth signup

### Projects
- `GET /projects` → List all projects for user
- `POST /projects` → Create new project
- `GET /projects/:id` → Get project details

### Meetings
- `POST /meetings/upload` → Upload meeting recording
- `GET /meetings/:id` → Get meeting details

### Tasks
- `GET /tasks` → Get user tasks
- `PATCH /tasks/:id` → Update task status

---

## 5. Security Considerations
- **Supabase RLS (Row Level Security)** for per-user/project data isolation
- **TLS/SSL** for all API traffic
- **Google Cloud Storage Signed URLs** for file access
- **GDPR Compliance** for data handling

---

## 6. Deployment Plan
1. Set up Supabase project (DB + Auth)
2. Set up Airtable workspace + API keys
3. Configure Google Cloud Storage bucket
4. Build backend API with Node.js + Express
5. Build frontend UI with Vibe Coding
6. Deploy both frontend & backend to Vercel
7. Configure CI/CD pipeline (GitHub Actions → Vercel Deploy)
8. Integrate environment variables securely in Vercel

---

## 7. Future Enhancements
- Analytics dashboard powered by Airtable data
- AI-powered search across meeting history
- Offline-first mobile version
