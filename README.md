# AI MeetMind - Intelligent Meeting Management

AI-powered meeting management and assistant application for automated transcription, analysis, and task management.

## 🚀 Features

- **AI-Powered Transcription** - Automatic speech-to-text using OpenAI Whisper
- **Smart Meeting Analysis** - Generate Minutes of Meeting (MOM) with GPT-4
- **Action Item Extraction** - Automatically identify and create tasks from meetings
- **Email Summaries** - Generate stakeholder-ready meeting summaries
- **Project Management** - Organize meetings and tasks by project
- **Role-Based Access** - Super Admin, Project Admin, Team Member, Viewer roles
- **Real-time Processing** - Background AI processing with status updates
- **Cloud Storage** - Secure file storage with Google Cloud Storage
- **Modern UI** - Responsive React interface with Tailwind CSS

## 🛠️ Tech Stack

### Backend
- **Node.js + Express** - REST API server
- **Supabase** - Authentication and user management
- **Airtable** - Project, meeting, and task data storage
- **OpenAI** - Whisper (transcription) + GPT-4 (analysis)
- **Google Cloud Storage** - File storage and management

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast development and build tool
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - API client

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Supabase account and project
- Airtable account and workspace
- Google Cloud project with Storage API enabled

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI_MeetMind
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   - Backend: `backend/.env`
   - Frontend: `frontend/.env`
   - All credentials are already configured

4. **Set up Airtable tables**
   Create these tables in your Airtable base:

   **Projects Table:**
   - `name` (Single line text)
   - `created_by` (Single line text)
   - `members` (Multiple select)
   - `meetings` (Link to Meetings)
   - `created_at` (Date & time)

   **Meetings Table:**
   - `project_id` (Link to Projects)
   - `title` (Single line text)
   - `date` (Date & time)
   - `recording_url` (URL)
   - `transcript` (Long text)
   - `mom` (Long text)
   - `summary` (Long text)
   - `action_points` (Link to Tasks)
   - `created_at` (Date & time)

   **Tasks Table:**
   - `name` (Single line text)
   - `owner_id` (Single line text)
   - `status` (Single select: pending, in_progress, done, cancelled)
   - `deadline` (Date)
   - `source_meeting` (Link to Meetings)
   - `team` (Single line text)
   - `description` (Long text)
   - `priority` (Single select: low, medium, high, urgent)
   - `created_at` (Date & time)

## 🚀 Running the Application

1. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts both backend (port 5000) and frontend (port 5173)

2. **Or run individually**
   ```bash
   # Backend only
   npm run backend:dev

   # Frontend only
   npm run frontend:dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health check: http://localhost:5000/health

## 📖 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Meetings
- `POST /api/meetings/upload` - Upload meeting recording
- `GET /api/meetings/:id` - Get meeting details
- `GET /api/meetings/project/:projectId` - Get project meetings
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Tasks
- `GET /api/tasks` - Get user's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/stats/overview` - Get task statistics

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://mvfsohcbgnzmfmhnopzu.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Airtable
AIRTABLE_API_KEY=your_airtable_token
AIRTABLE_BASE_ID=your_base_id

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=ai-meetmind-468013
GOOGLE_CLOUD_BUCKET_NAME=ai_meetmind_data
GOOGLE_APPLICATION_CREDENTIALS=../config/google-service-account.json
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://mvfsohcbgnzmfmhnopzu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🧪 Testing the AI Pipeline

1. **Register/Login** to the application
2. **Create a project** 
3. **Upload a meeting recording** (MP3, MP4, WAV supported)
4. **Watch the AI process:**
   - Transcribe audio with Whisper
   - Generate MOM with GPT-4
   - Extract action items
   - Create tasks automatically
   - Generate email summary

## 📁 Project Structure

```
AI_MeetMind/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
├── config/
│   ├── supabaseConfig.js
│   ├── airtableConfig.js
│   └── googleCloudConfig.js
└── README.md
```

## 🔒 Security Features

- JWT-based authentication with Supabase
- Role-based access control (RBAC)
- Row Level Security (RLS) for data isolation
- File upload validation and size limits
- Rate limiting and request throttling
- CORS protection
- Helmet security headers

## 🚀 Deployment

The application is ready for deployment on Vercel:

1. **Build the application**
   ```bash
   npm run frontend:build
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository
   - Configure environment variables
   - Deploy both frontend and backend

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the GitHub repository.
