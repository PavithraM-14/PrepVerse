# Requirements Document

## 1. Application Overview

**Application Name**: PrepVerse – The AI Placement Universe

**Description**: An AI-powered web platform designed to help students prepare for placements, internships, coding interviews, aptitude rounds, and resume building through personalized AI-driven workflows.

**Design Requirements**:
- Modern Gen-Z inspired UI with futuristic gradients
- Dark/light mode support
- Responsive design for desktop and mobile
- Clean dashboard layout
- Animated cards and smooth transitions
- Glassmorphism and neon accent styles
- Student-focused attractive interface
- Fast loading with professional animations
- Smooth navigation and clean component structure

**Technology Stack**:
- Core application: React + Vite
- Authentication & Database: Supabase (Authentication, PostgreSQL database, User profiles, Progress tracking, Storage)
- AI capabilities: Google Gemini API (AI chat, Resume analysis, Mock interview generation, Personalized roadmap generation, AI recommendations)
- Styling: Tailwind CSS
- Frontend logic: JavaScript
- Integration: REST APIs
- Optimization: Desktop and mobile devices

## 2. Target Users and Usage Scenarios

**Target Users**: Students preparing for campus placements, internships, and job interviews

**Core Usage Scenarios**:
- Students seeking personalized placement preparation roadmaps
- Candidates preparing for technical and HR interviews
- Users wanting to improve resume quality and ATS scores
- Students tracking coding practice and aptitude preparation progress
- Learners needing adaptive study plans based on mood and availability

## 3. Page Structure and Functional Description

### Page Hierarchy

```
PrepVerse Application
├── Landing Page
├── Login/Register Page
├── Dashboard (Main Hub)
├── Resume Analyzer Page
├── Interview Simulator Page
├── Study Planner Page
├── Coding Tracker Page
├── Leaderboard Page
└── Profile Settings Page
```

### 3.1 Landing Page

**Purpose**: Introduce the platform and convert visitors to users

**Components**:
- Hero section with futuristic UI
- Tagline: \"Your AI-Powered Placement Universe\"
- CTA buttons for signup/login
- Feature showcase cards displaying main capabilities
- Testimonials section
- Animated statistics (e.g., users helped, success rate)
- Modern footer with links and information

### 3.2 Login/Register Page

**Authentication Options**:
- User signup with email and password
- User login with email and password
- Google authentication (using OSS Google login method)

**Data Storage**: Store user credentials and profile data securely using Supabase

### 3.3 AI Placement Persona (Post-Login Setup)

**Trigger**: Displayed after first login

**User Input Collection**:
- Dream company
- Current skill level
- Preferred role
- Weak subjects
- Confidence level
- Placement timeline

**AI Generation Output**:
- Personalized roadmap
- Daily tasks
- Weekly preparation goals
- AI recommendations

### 3.4 Dashboard (Main Hub)

**Display Elements**:
- Study streak counter
- Resume score indicator
- Upcoming tasks list
- Interview readiness score
- Daily goals checklist
- Progress analytics visualization
- Personalized AI tips
- Quick access cards to main features
- AI chatbot assistant integrated

### 3.5 AI Study Planner Page

**Input Parameters**:
- Available study hours
- Weak topics
- Upcoming interviews/exams
- User mood

**Features**:
- Daily planner with scheduled tasks
- Progress tracking visualization
- Task completion checkboxes
- Smart reminders

### 3.6 Mood-Based Study System

**Mood Selection Options**:
- Motivated
- Stressed
- Tired
- Productive

**Adaptive Behavior**:
- Adjust difficulty level based on selected mood
- Change motivation style
- Suggest easier or harder tasks accordingly
- Display mood-appropriate motivational messages

### 3.7 AI Resume Analyzer Page

**Upload Functionality**: Users upload resume files (PDF/DOC format)

**Analysis Features**:
- ATS score analysis
- Resume improvement suggestions
- Keyword optimization recommendations
- Grammar feedback

**Analysis Modes**:
- \"Roast My Resume\" mode
- HR Review mode
- Friendly Mentor mode

**Display Output**:
- Overall resume score
- Missing skills identification
- Suggested improvements list

### 3.8 AI Interview Simulator Page

**Interview Types**:
- HR rounds
- Technical interviews
- Behavioral interviews
- Coding interviews

**Simulation Features**:
- Dynamic follow-up questions based on user responses
- AI-generated feedback
- Confidence score calculation
- Communication analysis
- Realistic interviewer personalities

### 3.9 Aptitude & Coding Practice

**Components**:
- Aptitude quizzes with multiple difficulty levels
- DSA practice tracker
- Coding progress dashboard
- Daily challenge system
- Difficulty level selection

### 3.10 Coding Tracker Page

**Tracking Elements**:
- Problems solved count
- Topics covered
- Difficulty distribution
- Progress over time
- Practice consistency

### 3.11 Gamification System

**Gamification Elements**:
- XP points earned for completed activities
- Daily streak tracking
- Achievement badges for milestones
- Leaderboards for competitive ranking
- Level progression system
- Rewards for consistency

### 3.12 Leaderboard Page

**Display**:
- User rankings based on XP points
- Top performers showcase
- User's current position
- Filtering options by timeframe

### 3.13 Notifications System

**Notification Types**:
- Daily reminders for study tasks
- Study recommendations from AI
- Placement alerts and deadlines
- Motivation messages

### 3.14 Community Section

**Features**:
- Share progress updates
- Compete on leaderboard
- Join preparation challenges
- Discuss preparation tips with other users

### 3.15 Profile Settings Page

**User Management**:
- Edit profile information
- Update placement persona details
- Manage notification preferences
- Toggle dark/light mode
- View account statistics

### 3.16 AI Chatbot Assistant

**Integration**: Available across all pages of the application

**Capabilities**:
- Answer user queries
- Provide guidance on using features
- Offer study tips and motivation
- Assist with navigation

## 4. Business Rules and Logic

### 4.1 Personalization Logic

- AI generates personalized roadmaps based on user's placement persona inputs (dream company, skill level, preferred role, weak subjects, confidence level, placement timeline)
- Study planner adapts schedules based on available study hours, weak topics, upcoming deadlines, and user mood
- Mood-based system adjusts task difficulty and motivation style according to selected mood state

### 4.2 Progress Tracking

- User progress data (completed tasks, study hours, quiz scores, coding problems solved) stored in Supabase database
- Dashboard aggregates progress metrics from all modules
- Analytics visualizations update in real-time based on user activity

### 4.3 Gamification Rules

- XP points awarded for: completing daily tasks, finishing quizzes, solving coding problems, maintaining study streaks, uploading resumes, completing mock interviews
- Daily streak increments when user completes at least one activity per day
- Achievement badges unlocked upon reaching specific milestones
- User level increases based on accumulated XP points
- Leaderboard rankings update based on total XP points

### 4.4 AI Integration

- Google Gemini API used for: generating personalized roadmaps, analyzing resumes, creating mock interview questions and feedback, providing AI recommendations, powering chatbot responses
- AI responses personalized based on user's placement persona and historical data

### 4.5 Notification Triggers

- Daily reminders sent at user-specified times
- Study recommendations triggered when user falls behind schedule
- Placement alerts sent when deadlines approach
- Motivation messages sent during low activity periods

### 4.6 Community Interaction

- Users can share progress updates visible to community
- Leaderboard displays top users by XP points
- Challenges allow multiple users to compete on specific goals
- Discussion threads enable peer-to-peer knowledge sharing

## 5. Exceptions and Boundary Conditions

| Scenario | Handling |
|----------|----------|
| User uploads invalid resume format | Display error message indicating supported formats (PDF/DOC) |
| AI API request fails | Show fallback message and retry option |
| User skips placement persona setup | Prompt to complete setup before accessing personalized features |
| No internet connection | Display offline message and disable AI-dependent features |
| User selects mood but no tasks available | Generate new tasks based on mood and available content |
| Interview simulator receives unclear user response | AI generates clarifying follow-up question |
| User attempts to access premium features (if any) | Redirect to upgrade page or display feature lock message |
| Leaderboard has insufficient users | Display message encouraging user to invite friends |
| User completes all available daily challenges | Display congratulations message and suggest exploring other features |
| Resume upload exceeds storage limit | Display error message with storage limit information |

## 6. Acceptance Criteria

1. User successfully registers using email/password or Google authentication
2. User completes AI placement persona setup and receives personalized roadmap with daily tasks and weekly goals
3. User accesses dashboard and views study streak, resume score, upcoming tasks, interview readiness score, and daily goals
4. User uploads resume (PDF/DOC), receives ATS score analysis with improvement suggestions and missing skills identification
5. User completes AI-powered mock interview (HR/Technical/Behavioral/Coding), receives AI feedback with confidence score and communication analysis
6. User completes at least one aptitude quiz or coding problem, earns XP points, and sees updated progress on coding tracker
7. User views leaderboard showing rankings and their current position
8. User successfully logs out and logs back in to see persistent data (progress, streak, XP points)

## 7. Features Not Included in This Release

- Real-time video interview simulation
- Integration with external job portals
- Paid premium subscription tiers
- Mobile native applications (iOS/Android)
- Offline mode functionality
- Multi-language support
- Advanced analytics and reporting exports
- Integration with LinkedIn profiles
- Peer-to-peer mentorship matching
- Company-specific preparation modules beyond user-specified dream company
- Calendar integration with external apps
- Email digest reports
- Custom badge creation by users
- Private study groups
- Voice-based interview practice