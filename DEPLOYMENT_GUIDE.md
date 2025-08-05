# AI MeetMind - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### **Step 1: Prerequisites**
- ✅ GitHub account
- ✅ Vercel account (free at vercel.com)
- ✅ All your API credentials ready

### **Step 2: Push to GitHub**
1. **Create a new repository** on GitHub (public or private)
2. **Push your code** to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial AI MeetMind deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-meetmind.git
   git push -u origin main
   ```

### **Step 3: Deploy to Vercel**
1. **Go to** https://vercel.com/
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import** your AI MeetMind repository
5. **Configure** the project settings:
   - **Framework Preset**: Other
   - **Root Directory**: Leave empty (.)
   - **Build Command**: `npm run install:all && npm run frontend:build`
   - **Output Directory**: `frontend/dist`

### **Step 4: Environment Variables**
In Vercel dashboard, add these environment variables:

#### **Production Environment Variables:**
```env
# Node.js
NODE_ENV=production

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Airtable
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=ai-meetmind-468013
GOOGLE_CLOUD_BUCKET_NAME=ai_meetmind_data
GOOGLE_APPLICATION_CREDENTIALS=../config/google-service-account.json

# JWT
JWT_SECRET=your_production_jwt_secret_here_make_it_long_and_secure

# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_DIR=uploads/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend Environment Variables (add these too)
VITE_SUPABASE_URL=https://mvfsohcbgnzmfmhnopzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZnNvaGNiZ256bWZtaG5vcHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDI5MDUsImV4cCI6MjA2OTg3ODkwNX0.tI_j6GG5OXoEQc4esHUv2LURmoBnzgBFUMI3NXcHIrs
VITE_API_BASE_URL_PRODUCTION=/api
VITE_APP_NAME=AI MeetMind
VITE_APP_VERSION=1.0.0
```

### **Step 5: Deploy**
1. **Click "Deploy"** in Vercel
2. **Wait** for the build to complete (5-10 minutes)
3. **Get your live URL** (e.g., https://ai-meetmind.vercel.app)

## 🔧 **Alternative: Vercel CLI Deployment**

If you prefer command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: ai-meetmind
# - Directory: ./
# - Override settings? N
```

## 🎯 **Post-Deployment Steps**

### **1. Update CORS Settings**
Update your backend CORS configuration to include your Vercel domain:

```javascript
// In backend/server.js
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
```

### **2. Test the Deployment**
1. **Visit your Vercel URL**
2. **Register a new account**
3. **Create a project**
4. **Upload a meeting recording**
5. **Verify AI processing works**

### **3. Custom Domain (Optional)**
1. **Go to** Vercel dashboard → Your project → Settings → Domains
2. **Add your custom domain**
3. **Update DNS** records as instructed

## 🔒 **Security Considerations**

### **Production Security Checklist:**
- ✅ **Environment variables** set in Vercel (not in code)
- ✅ **JWT secret** changed to a secure random string
- ✅ **CORS** configured for your domain only
- ✅ **Rate limiting** enabled
- ✅ **HTTPS** enforced (automatic with Vercel)

### **Google Cloud Storage Setup:**
For production, you'll need to:
1. **Upload** the service account JSON to Vercel as a file
2. **Or** convert the JSON to environment variables
3. **Update** the path in your environment variables

## 📊 **Monitoring & Analytics**

Vercel provides:
- **Analytics** dashboard
- **Function logs** for debugging
- **Performance** metrics
- **Error tracking**

## 🚀 **Continuous Deployment**

Once connected to GitHub:
- **Every push** to main branch triggers automatic deployment
- **Preview deployments** for pull requests
- **Rollback** capability to previous versions

## 📞 **Support**

If you encounter issues:
1. **Check** Vercel function logs
2. **Verify** environment variables
3. **Test** API endpoints directly
4. **Check** CORS settings

---

**Your AI MeetMind application will be live and accessible worldwide!** 🌍
