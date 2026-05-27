# 🚀 PrepVerse - AI-Powered Placement Preparation Platform

**PrepVerse** is a comprehensive placement preparation platform designed to help students ace their job interviews and land their dream jobs. Built with modern web technologies and powered by AI, PrepVerse offers personalized study plans, coding practice, resume analysis, and much more.

## ✨ Features

### 🎯 **AI-Powered Roadmap Generation**
- **Personalized Learning Paths**: Create custom roadmaps based on your skill level, target company, and timeline
- **Smart Recommendations**: AI-driven suggestions for topics to focus on
- **Progress Tracking**: Visual progress indicators and completion percentages
- **Roadmap History**: Track multiple roadmaps with creation dates and progress

### 📝 **Smart Study Planner**
- **Mood-Based Planning**: Adaptive study plans based on your current mood (Motivated, Productive, Stressed, Tired)
- **Task Management**: Add, complete, and track study tasks with XP rewards
- **Time-Based Reminders**: Set due dates and times for tasks with notification system
- **AI Study Plans**: Generate personalized daily study schedules

### 💻 **Coding Tracker**
- **DSA Problem Tracking**: Track coding problems from LeetCode, HackerRank, Codeforces, etc.
- **Progress Analytics**: Monitor solved problems by difficulty and topic
- **Status Management**: Track problems as Todo, In Progress, or Solved
- **Interactive Quizzes**: AI-generated aptitude and coding quizzes

### 🤖 **AI Resume Analyzer**
- **Multiple Analysis Modes**:
  - 🔥 **Roast Mode**: Brutal honest feedback with Gen-Z humor
  - 👔 **HR Review**: Professional corporate perspective  
  - 🧑‍🏫 **Friendly Mentor**: Encouraging and constructive feedback
- **ATS Score Analysis**: Check how well your resume passes Applicant Tracking Systems
- **Detailed Feedback**: Get specific suggestions for improvement
- **File Support**: Upload PDF, DOC, and DOCX files

### 🎮 **Gamification System**
- **XP Points**: Earn experience points for completing tasks and activities
- **Level Progression**: Level up based on your XP accumulation
- **Achievement Tracking**: Monitor your progress across different areas
- **Streak Counters**: Maintain daily activity streaks

### 🔔 **Smart Notifications**
- **Task Reminders**: Get notified when tasks are due or overdue
- **Progress Updates**: Receive updates on your learning journey
- **Achievement Alerts**: Celebrate milestones and accomplishments

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Supabase (Database, Authentication, Storage)
- **AI Integration**: Google Gemini API for content generation
- **State Management**: React Context API
- **Routing**: React Router v6
- **File Processing**: PDF parsing, document analysis
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js ≥ 20
# npm ≥ 10

# Check versions
node -v   # v20.18.3+
npm -v    # 10.8.2+
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/PavithraM-14/PrepVerse.git
cd PrepVerse
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env
```

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_ID=your_app_id
```

4. **Set up the database**
- Go to your Supabase dashboard
- Run the SQL script from `complete-database-setup.sql` in the SQL Editor
- This creates all necessary tables and security policies

5. **Start the development server**
```bash
npm run dev
```

The app will be available at `http://127.0.0.1:5173/`

## 📊 Database Setup

PrepVerse uses Supabase as its backend. Run the provided SQL scripts to set up your database:

1. **Complete Setup**: Run `complete-database-setup.sql` for full functionality
2. **Safe Setup**: Run `safe-database-setup.sql` if you encounter policy conflicts
3. **Storage Setup**: Run `setup-storage.sql` to enable file uploads

### Database Tables

- `tasks` - Study planner tasks and reminders
- `coding_problems` - Coding practice tracking
- `user_progress` - XP, levels, and achievements
- `notifications` - Task reminders and alerts
- `placement_personas` - AI roadmap data
- `resume_analyses` - Resume analysis history
- `study_sessions` - Study tracking data
- `quiz_attempts` - Quiz performance history

## 🎨 Features Overview

### Dashboard
- **Progress Overview**: Visual representation of your learning journey
- **Quick Actions**: Access all major features from one place
- **Recent Activity**: See your latest tasks and achievements
- **Notifications**: Stay updated with reminders and alerts

### AI Roadmap Generator
- **Skill Assessment**: Input your current skill level and target goals
- **Company-Specific Plans**: Tailored roadmaps for your dream company
- **Timeline Management**: Set realistic timelines for your preparation
- **Progress Tracking**: Monitor completion with visual progress bars

### Study Planner
- **Mood-Based Adaptation**: Plans adjust based on how you're feeling
- **Smart Scheduling**: AI generates optimal study schedules
- **Task Management**: Create, track, and complete study tasks
- **Reminder System**: Never miss important study sessions

### Coding Tracker
- **Multi-Platform Support**: Track problems from various coding platforms
- **Topic Organization**: Organize by DSA topics (Arrays, Trees, DP, etc.)
- **Difficulty Tracking**: Monitor progress across Easy, Medium, Hard problems
- **Quiz Generation**: AI-powered coding and aptitude quizzes

### Resume Analyzer
- **AI-Powered Analysis**: Advanced resume scanning and feedback
- **Multiple Perspectives**: Get feedback from different viewpoints
- **ATS Optimization**: Improve your resume for automated screening
- **Actionable Insights**: Specific suggestions for improvement

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Copy your project URL and anon key to `.env`
3. Run the database setup scripts
4. Configure Row Level Security policies

### AI Integration
- The app uses Google Gemini API for AI features
- Configure your API keys in the Supabase Edge Functions
- Ensure proper rate limiting and error handling

### File Upload (Optional)
- Set up Supabase Storage bucket for resume files
- Configure storage policies for user file access
- Enable file type restrictions (PDF, DOC, DOCX)

## 📱 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### Manual Deployment
```bash
# Build the project
npm run build

# Deploy the dist folder to your hosting provider
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/PavithraM-14/PrepVerse/issues) page
2. Run the database setup scripts if you see table-related errors
3. Ensure all environment variables are properly configured
4. Check the browser console for detailed error messages

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with more coding platforms
- [ ] Collaborative study features
- [ ] Interview simulation with AI
- [ ] Company-specific preparation modules

## 👥 Team

Built with ❤️ by the PrepVerse team.

---

**Ready to ace your placements? Start your PrepVerse journey today!** 🚀
