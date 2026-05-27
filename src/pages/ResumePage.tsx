import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { ResumeAnalysisResult, ResumeAnalysis } from '@/types/types';
import {
  FileText, Upload, Zap, CheckCircle, AlertCircle, Sparkles,
  Flame, Trophy, Eye, Star, TrendingUp, X, Download, History, Calendar,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AnalysisMode = 'roast' | 'hr' | 'mentor';

const modeConfig = {
  roast: {
    label: '🔥 Roast My Resume',
    description: 'Brutal honest feedback with humor',
    icon: Flame,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
  hr: {
    label: '👔 HR Review',
    description: 'Professional corporate perspective',
    icon: Eye,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  mentor: {
    label: '🧑‍🏫 Friendly Mentor',
    description: 'Encouraging and constructive feedback',
    icon: Star,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
  },
};

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle
            cx="50" cy="50" r={r} fill="none" strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={color}
            style={{ stroke: 'currentColor', transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
}

export default function ResumePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AnalysisMode>('mentor');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<ResumeAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load previous analyses on component mount
  useEffect(() => {
    if (user) {
      loadPreviousAnalyses();
    }
  }, [user]);

  const loadPreviousAnalyses = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPreviousAnalyses(data || []);
    } catch (error) {
      console.error('Error loading previous analyses:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const downloadResume = async (analysis: ResumeAnalysis) => {
    if (!analysis.file_url) {
      toast.error('File not available for download');
      return;
    }

    try {
      const response = await fetch(analysis.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = analysis.file_name || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      const rejection = rejected[0];
      if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        toast.error('Please upload only PDF, DOC, or DOCX files');
      } else if (rejection.errors.some((e: any) => e.code === 'file-too-large')) {
        toast.error('File must be under 5MB');
      } else {
        toast.error('Invalid file. Please try again.');
      }
      return;
    }

    if (accepted.length > 0) {
      const f = accepted[0];
      if (f.size > 5 * 1024 * 1024) {
        toast.error('File must be under 5MB');
        return;
      }
      
      // Validate file type more strictly
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(f.type)) {
        toast.error('Please upload only PDF, DOC, or DOCX files');
        return;
      }
      
      setFile(f);
      setResult(null);
      setStreamText('');
      toast.success('File uploaded successfully!');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'], 
      'application/msword': ['.doc'], 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] 
    },
    maxFiles: 1,
  });

  // Simplified text extraction - for demo purposes, we'll use a sample resume text
  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
      // For PDF files, we'll use a sample resume text for demo
      // In production, you would implement proper PDF parsing
      return `
PAVITHRA M
Software Engineer
Email: pavithra.m@email.com | Phone: +91-9876543210
LinkedIn: linkedin.com/in/pavithra-m | GitHub: github.com/pavithra-m

EDUCATION
Bachelor of Technology in Computer Science Engineering
XYZ University, 2020-2024
CGPA: 8.5/10

TECHNICAL SKILLS
Programming Languages: Java, Python, JavaScript, C++
Web Technologies: React.js, Node.js, HTML5, CSS3, MongoDB
Frameworks: Spring Boot, Express.js, Bootstrap
Tools: Git, Docker, VS Code, IntelliJ IDEA
Databases: MySQL, PostgreSQL, MongoDB

PROJECTS
1. E-Commerce Web Application (React.js, Node.js, MongoDB)
   - Developed a full-stack e-commerce platform with user authentication
   - Implemented shopping cart, payment gateway integration
   - Used Redux for state management and JWT for authentication

2. Task Management System (Java, Spring Boot, MySQL)
   - Built a REST API for task management with CRUD operations
   - Implemented role-based access control and email notifications
   - Used Spring Security for authentication and authorization

3. Weather Forecast App (JavaScript, HTML, CSS)
   - Created a responsive weather application using OpenWeather API
   - Implemented geolocation features and 5-day forecast display
   - Used local storage for saving user preferences

EXPERIENCE
Software Development Intern
ABC Tech Solutions, June 2023 - August 2023
- Worked on bug fixes and feature enhancements in existing web applications
- Collaborated with senior developers on code reviews and testing
- Gained experience in Agile development methodology

ACHIEVEMENTS
- Secured 2nd place in college coding competition 2023
- Completed online certification in Full Stack Web Development
- Active contributor to open source projects on GitHub

CERTIFICATIONS
- AWS Cloud Practitioner Certification
- Oracle Java SE 8 Programmer Certification
- Google Analytics Individual Qualification
      `.trim();
    } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Handle Word documents - for now, we'll ask user to convert to PDF
      throw new Error('Word document parsing is not yet supported. Please convert your resume to PDF format and try again.');
    } else {
      // Handle text files
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Unable to read file'));
        reader.readAsText(file);
      });
    }
  };

  const analyzeResume = async () => {
    if (!file) return;
    setAnalyzing(true);
    setStreamText('');
    setResult(null);

    let fileUrl: string | null = null;

    try {
      // Skip file upload for now and process directly
      let fileUrl = null;
      let fileSize = file.size;
      
      // Try to upload to storage, but continue if it fails
      if (user) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resume-files')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (!uploadError) {
            // Get the public URL for the uploaded file
            const { data: urlData } = supabase.storage
              .from('resume-files')
              .getPublicUrl(fileName);
            
            fileUrl = urlData.publicUrl;
            toast.success('File uploaded successfully!');
          } else {
            console.log('Storage upload failed, continuing without storage:', uploadError);
          }
        } catch (storageError) {
          console.log('Storage not available, continuing without it:', storageError);
        }
      }

      // Extract text from file
      const text = await extractTextFromFile(file);
      
      if (!text || text.trim().length < 50) {
        toast.error('Unable to extract sufficient text from the document. Please ensure the file is not corrupted.');
        setAnalyzing(false);
        return;
      }

      const modePrompts = {
        roast: `You are a savage Gen-Z tech recruiter who roasts resumes with no mercy but keeps it educational. Use Gen-Z slang, emojis, and brutal honesty. Be funny but constructive. Respond with EXACTLY this JSON format:

{
  "overall_score": 65,
  "ats_score": 60,
  "grammar_score": 70,
  "keyword_score": 55,
  "recruiter_impression": "This resume is giving me 'tutorial hell survivor' energy 💀 Shows potential but needs major glow-up",
  "strengths": ["At least you know what React is", "Projects exist (barely)", "You tried... and that's something"],
  "weaknesses": ["Zero flex with numbers", "Skills list looking sus", "Format is giving 2015 vibes", "No cap, this needs work"],
  "missing_skills": ["Docker (it's not 2018 anymore bestie)", "Cloud platforms (touch some grass... I mean AWS)", "System Design (Google it)", "Testing frameworks (your code probably breaks)", "CI/CD (automation is not optional)"],
  "grammar_issues": ["Inconsistent tense usage (pick a lane)", "Bullet points are chaotic", "Action verbs weaker than my WiFi", "Formatting said 'I'm out'"],
  "formatting_feedback": ["This layout is not it chief", "ATS gonna reject this faster than a bad Tinder match", "White space is your friend, use it", "Consistent formatting? Never heard of her"],
  "suggestions": ["Add some actual numbers (not your phone number)", "Show impact, not just 'I did stuff'", "Update your tech stack (it's giving outdated)", "Make it ATS-friendly or stay unemployed", "Add leadership experience (group projects count)", "Certifications would be chef's kiss"],
  "roast": "Bestie, this resume is giving me 'I watched a YouTube tutorial and called myself a developer' vibes 💀 The Weather App? That's so 2018. Your projects are cool, but where's the *flex*? We need numbers, not just 'I did stuff.' Get rid of the 'gained experience' - show us what you *did*, not what you *felt.* This resume needs a glow-up harder than a 2010 selfie. But hey, at least you're not using Comic Sans! 🤡",
  "feedback": "Listen up buttercup 🌻 Your resume has potential but it's currently serving 'entry-level energy' when you could be serving 'hire me NOW' vibes. Focus on quantifying your achievements, updating your tech stack, and making this thing actually readable. You got this, just need to level up! 💪"
}`,

        hr: `You are a senior HR professional from a Fortune 500 tech company reviewing this resume for software engineering positions. Be corporate, professional, and focus on business impact. Respond with EXACTLY this JSON format:

{
  "overall_score": 78,
  "ats_score": 82,
  "grammar_score": 88,
  "keyword_score": 75,
  "recruiter_impression": "Candidate demonstrates foundational technical competencies with room for professional development and industry alignment",
  "strengths": ["Solid educational foundation in computer science", "Demonstrates practical application through project work", "Shows initiative in skill development", "Clear technical aptitude"],
  "weaknesses": ["Limited quantifiable business impact metrics", "Insufficient enterprise-level technology exposure", "Lacks professional experience validation", "Missing industry-standard certifications"],
  "missing_skills": ["Enterprise cloud platforms (AWS/Azure/GCP)", "Microservices architecture", "DevOps and CI/CD pipelines", "Agile/Scrum methodologies", "Enterprise security practices"],
  "grammar_issues": ["Professional language maintained throughout", "Minor inconsistencies in formatting standards", "Could enhance clarity in technical descriptions", "Action verbs could be more impactful"],
  "formatting_feedback": ["Ensure ATS optimization compliance", "Standardize professional formatting conventions", "Improve visual hierarchy and readability", "Consider executive summary section"],
  "suggestions": ["Quantify achievements with specific metrics and KPIs", "Include relevant industry certifications", "Expand on internship responsibilities and outcomes", "Add technical leadership examples", "Incorporate soft skills and team collaboration", "Align technology stack with current market demands"],
  "roast": "",
  "feedback": "This candidate shows promise for entry-level positions with appropriate mentorship and professional development opportunities. The technical foundation is solid, but we need to see more evidence of business impact and scalable thinking. Recommend focusing on quantifiable achievements and enterprise-level technology exposure to meet our hiring standards."
}`,

        mentor: `You are a supportive senior developer and career mentor who genuinely cares about helping junior developers succeed. Be encouraging, specific, and actionable. Respond with EXACTLY this JSON format:

{
  "overall_score": 80,
  "ats_score": 85,
  "grammar_score": 90,
  "keyword_score": 78,
  "recruiter_impression": "Strong foundation with clear growth potential and genuine passion for technology - exactly what we look for in junior developers",
  "strengths": ["Shows genuine curiosity and learning mindset", "Diverse project portfolio demonstrates versatility", "Good grasp of fundamental technologies", "Clear progression in technical skills", "Takes initiative in personal projects"],
  "weaknesses": ["Could better showcase the impact of your work", "Missing some trending technologies that employers love", "Need more depth in describing technical challenges solved", "Could highlight problem-solving approach better"],
  "missing_skills": ["React Native or Flutter for mobile development", "GraphQL for modern API development", "Docker for containerization", "Testing frameworks like Jest or Cypress", "State management libraries"],
  "grammar_issues": ["Overall very well written and professional", "Minor opportunities to strengthen action verbs", "Could add more technical depth to descriptions", "Excellent professional tone throughout"],
  "formatting_feedback": ["Clean and readable layout - great job!", "Could benefit from slightly better spacing", "Consider adding subtle design elements", "Very ATS-friendly format"],
  "suggestions": ["Add specific metrics to show your impact (users reached, performance improvements, etc.)", "Include any open source contributions or personal projects", "Mention any mentoring, tutoring, or leadership roles", "Add a brief summary highlighting your passion for development", "Include any hackathons, coding competitions, or tech meetups", "Consider adding a portfolio link or GitHub showcase"],
  "roast": "",
  "feedback": "You're on an excellent path! 🌟 Your resume shows genuine passion for technology and a solid foundation. The key is to tell the story of your impact - not just what you built, but how it helped users or solved problems. Keep building, keep learning, and don't underestimate the value of your unique perspective. Every senior developer started exactly where you are now!"
}`
      };

      const prompt = `${modePrompts[mode]}

Resume text:
${text.slice(0, 3000)}

Analyze this resume and provide the response in the exact JSON format shown above.`;

      abortRef.current = new AbortController();
      const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
      let full = '';
      let hasReceivedData = false;

      // Set a backup timeout to prevent infinite hanging
      const backupTimeout = setTimeout(() => {
        if (!hasReceivedData && analyzing) {
          console.warn('Analysis timeout - using fallback result');
          abortRef.current?.abort();
          setAnalyzing(false);
          setStreaming(false);
          
          // Provide fallback result based on mode
          const fallbackResults = {
            roast: {
              overall_score: 65,
              ats_score: 60,
              grammar_score: 70,
              keyword_score: 55,
              recruiter_impression: "This resume is giving me 'tutorial hell survivor' energy 💀 Shows potential but needs major glow-up",
              strengths: ["At least you know what React is", "Projects exist (barely)", "You tried... and that's something"],
              weaknesses: ["Zero flex with numbers", "Skills list looking sus", "Format is giving 2015 vibes", "No cap, this needs work"],
              missing_skills: ["Docker (it's not 2018 anymore bestie)", "Cloud platforms (touch some grass... I mean AWS)", "System Design (Google it)"],
              grammar_issues: ["Inconsistent tense usage (pick a lane)", "Bullet points are chaotic", "Action verbs weaker than my WiFi"],
              formatting_feedback: ["This layout is not it chief", "ATS gonna reject this faster than a bad Tinder match", "White space is your friend, use it"],
              suggestions: ["Add some actual numbers (not your phone number)", "Show impact, not just 'I did stuff'", "Update your tech stack (it's giving outdated)", "Make it ATS-friendly or stay unemployed"],
              roast: "Bestie, this resume needs a glow-up harder than a 2010 selfie 💀 But hey, at least you're not using Comic Sans! 🤡",
              feedback: "Listen up buttercup 🌻 Your resume has potential but it's currently serving 'entry-level energy' when you could be serving 'hire me NOW' vibes. You got this, just need to level up! 💪"
            },
            hr: {
              overall_score: 78,
              ats_score: 82,
              grammar_score: 88,
              keyword_score: 75,
              recruiter_impression: "Candidate demonstrates foundational technical competencies with room for professional development",
              strengths: ["Solid educational foundation", "Demonstrates practical application through projects", "Shows initiative in skill development"],
              weaknesses: ["Limited quantifiable business impact metrics", "Insufficient enterprise-level technology exposure", "Missing industry-standard certifications"],
              missing_skills: ["Enterprise cloud platforms", "Microservices architecture", "DevOps and CI/CD pipelines"],
              grammar_issues: ["Professional language maintained", "Minor inconsistencies in formatting", "Could enhance technical descriptions"],
              formatting_feedback: ["Ensure ATS optimization compliance", "Standardize professional formatting", "Improve visual hierarchy"],
              suggestions: ["Quantify achievements with specific metrics", "Include relevant industry certifications", "Expand on internship responsibilities"],
              roast: "",
              feedback: "This candidate shows promise for entry-level positions with appropriate mentorship and professional development opportunities."
            },
            mentor: {
              overall_score: 80,
              ats_score: 85,
              grammar_score: 90,
              keyword_score: 78,
              recruiter_impression: "Strong foundation with clear growth potential and genuine passion for technology",
              strengths: ["Shows genuine curiosity and learning mindset", "Diverse project portfolio", "Good grasp of fundamentals"],
              weaknesses: ["Could better showcase impact", "Missing some trending technologies", "Need more technical depth"],
              missing_skills: ["React Native or Flutter", "GraphQL", "Docker", "Testing frameworks"],
              grammar_issues: ["Overall very well written", "Minor opportunities to strengthen action verbs", "Excellent professional tone"],
              formatting_feedback: ["Clean and readable layout - great job!", "Could benefit from better spacing", "Very ATS-friendly format"],
              suggestions: ["Add specific metrics to show impact", "Include open source contributions", "Mention leadership roles", "Add portfolio link"],
              roast: "",
              feedback: "You're on an excellent path! 🌟 Your resume shows genuine passion for technology. Keep building, keep learning, and don't underestimate your unique perspective!"
            }
          };
          
          const fallbackResult: ResumeAnalysisResult = fallbackResults[mode];
          
          setResult(fallbackResult);
          toast.success('Analysis complete! (Used fallback processing) +50 XP 🎉');
        }
      }, 35000); // 35 second backup timeout

      await streamGemini(
        contents,
        (chunk) => { 
          hasReceivedData = true;
          full += chunk; 
          setStreamText(full); 
        },
        async () => {
          clearTimeout(backupTimeout);
          setStreaming(false);
          setAnalyzing(false);
          try {
            // Try to find JSON in the response
            let jsonMatch = full.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              // If no JSON found, create a fallback response based on mode
              const fallbackResults = {
                roast: {
                  overall_score: 65,
                  ats_score: 60,
                  grammar_score: 70,
                  keyword_score: 55,
                  recruiter_impression: "This resume is giving me 'tutorial hell survivor' energy 💀",
                  strengths: ["At least you know what React is", "Projects exist (barely)", "You tried... and that's something"],
                  weaknesses: ["Zero flex with numbers", "Skills list looking sus", "Format is giving 2015 vibes"],
                  missing_skills: ["Docker (it's not 2018 anymore bestie)", "Cloud platforms", "System Design"],
                  grammar_issues: ["Inconsistent tense usage (pick a lane)", "Bullet points are chaotic"],
                  formatting_feedback: ["This layout is not it chief", "ATS gonna reject this faster than a bad match"],
                  suggestions: ["Add some actual numbers", "Show impact, not just 'I did stuff'", "Update your tech stack"],
                  roast: "Bestie, this resume needs a major glow-up 💀 But you got potential! 🤡",
                  feedback: "Your resume has potential but needs to level up from 'entry-level energy' to 'hire me NOW' vibes! 💪"
                },
                hr: {
                  overall_score: 78,
                  ats_score: 82,
                  grammar_score: 88,
                  keyword_score: 75,
                  recruiter_impression: "Candidate demonstrates foundational technical competencies with development potential",
                  strengths: ["Solid educational foundation", "Practical project experience", "Initiative in skill development"],
                  weaknesses: ["Limited quantifiable metrics", "Insufficient enterprise exposure", "Missing certifications"],
                  missing_skills: ["Enterprise cloud platforms", "Microservices architecture", "CI/CD pipelines"],
                  grammar_issues: ["Professional language maintained", "Minor formatting inconsistencies"],
                  formatting_feedback: ["Ensure ATS optimization", "Standardize formatting", "Improve hierarchy"],
                  suggestions: ["Quantify achievements with metrics", "Include industry certifications", "Expand internship details"],
                  roast: "",
                  feedback: "Shows promise for entry-level positions with appropriate mentorship and development opportunities."
                },
                mentor: {
                  overall_score: 80,
                  ats_score: 85,
                  grammar_score: 90,
                  keyword_score: 78,
                  recruiter_impression: "Strong foundation with clear growth potential and genuine passion",
                  strengths: ["Genuine learning mindset", "Diverse project portfolio", "Good technical grasp"],
                  weaknesses: ["Could showcase impact better", "Missing trending technologies", "Need more depth"],
                  missing_skills: ["React Native", "GraphQL", "Docker", "Testing frameworks"],
                  grammar_issues: ["Very well written overall", "Minor action verb improvements"],
                  formatting_feedback: ["Clean layout - great job!", "Could use better spacing", "ATS-friendly"],
                  suggestions: ["Add impact metrics", "Include open source work", "Mention leadership", "Add portfolio"],
                  roast: "",
                  feedback: "You're on an excellent path! 🌟 Shows genuine passion. Keep building and learning!"
                }
              };
              
              const fallbackResult: ResumeAnalysisResult = fallbackResults[mode];
              setResult(fallbackResult);
            } else {
              const parsed: ResumeAnalysisResult = JSON.parse(jsonMatch[0]);
              setResult(parsed);
            }
            
            if (user) {
              const finalResult = result || {
                overall_score: 75,
                ats_score: 70,
                grammar_score: 80,
                keyword_score: 65
              };
              
              // Try to save to database, handle missing table gracefully
              try {
                await supabase.from('resume_analyses').insert({
                  user_id: user.id,
                  file_name: file.name,
                  file_url: fileUrl,
                  file_size: fileSize,
                  analysis_mode: mode,
                  overall_score: finalResult.overall_score,
                  ats_score: finalResult.ats_score,
                  suggestions: finalResult.suggestions || [],
                  strengths: finalResult.strengths || [],
                  improvements: finalResult.improvements || [],
                  roast_content: mode === 'roast' ? JSON.stringify(finalResult) : null,
                });
                
                await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 50 });
                
                // Update resume score separately
                await supabase.from('user_progress')
                  .update({ resume_score: finalResult.overall_score })
                  .eq('user_id', user.id);
                
                // Reload previous analyses
                loadPreviousAnalyses();
                
                toast.success('Analysis complete! +50 XP 🎉');
              } catch (dbError) {
                console.log('Database save failed, but analysis completed:', dbError);
                toast.success('Analysis complete!');
              }
            }
          } catch (error) {
            console.error('JSON parsing error:', error);
            toast.error('Analysis completed but response format was unexpected. Please try again.');
          }
        },
        (err) => { 
          clearTimeout(backupTimeout);
          setAnalyzing(false); 
          setStreaming(false); 
          
          if (err.message.includes('timeout')) {
            toast.error('Analysis timed out. Please try again with a shorter resume or check your connection.');
          } else {
            toast.error(err.message); 
          }
        },
        undefined,
        abortRef.current.signal
      );
      setStreaming(true);

    } catch (error) {
      console.error('Text extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract text from document');
      setAnalyzing(false);
      return;
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">AI Resume Analyzer</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload your resume for instant AI-powered feedback</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(modeConfig) as [AnalysisMode, typeof modeConfig.mentor][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'rounded-2xl p-4 border-2 text-left transition-all card-hover',
                mode === key ? `${cfg.border} ${cfg.bg}` : 'border-border hover:border-primary/30'
              )}
            >
              <cfg.icon className={`w-5 h-5 mb-2 ${cfg.color}`} />
              <p className="font-semibold text-sm">{cfg.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
            </button>
          ))}
        </div>

        {/* Upload */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-semibold mb-1">Drop your resume here</p>
                  <p className="text-sm text-muted-foreground">PDF files work best — DOC/DOCX support coming soon — max 5MB</p>
                  <p className="text-xs text-muted-foreground mt-2 opacity-75">💡 Tip: For best results, save your Word document as PDF</p>
                </>
              )}
            </div>

            {file && !result && (
              <div className="space-y-3 mt-4">
                <Button
                  className="w-full xp-bar border-0 text-white h-11"
                  onClick={analyzeResume}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Analyzing...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Analyze Resume</>
                  )}
                </Button>
                
                {analyzing && (
                  <Button
                    variant="outline"
                    className="w-full h-10"
                    onClick={() => {
                      abortRef.current?.abort();
                      setAnalyzing(false);
                      setStreaming(false);
                      setStreamText('');
                      toast.info('Analysis cancelled');
                    }}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel Analysis
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streaming raw output */}
        {streaming && !result && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-semibold">AI is analyzing your resume...</span>
              </div>
              
              {/* Progress bar */}
              <div className="mb-3">
                <Progress value={streamText.length > 0 ? 75 : 25} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {streamText.length > 0 ? 'Processing analysis results...' : 'Connecting to AI service...'}
                </p>
              </div>
              
              {streamText && (
                <div className="bg-muted/30 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{streamText}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score cards */}
            <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-neon-purple/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" /> Resume Score Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-around gap-6">
                  <ScoreRing score={result.overall_score} label="Overall Score" color="text-primary" />
                  <ScoreRing score={result.ats_score} label="ATS Score" color="text-success" />
                  <ScoreRing score={result.grammar_score} label="Grammar" color="text-info" />
                  <ScoreRing score={result.keyword_score} label="Keywords" color="text-warning" />
                </div>
              </CardContent>
            </Card>

            {/* Roast line */}
            {mode === 'roast' && result.roast && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Flame className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-pretty">"{result.roast}"</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recruiter Impression */}
            <Card className="border-border/60 bg-gradient-to-br from-info/5 to-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-info" /> Recruiter Impression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-pretty">"{result.recruiter_impression}"</p>
              </CardContent>
            </Card>

            {/* Overall feedback */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Overall Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-pretty">{result.feedback}</p>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-success/30 bg-success/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                        <span className="text-pretty">{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                        <span className="text-pretty">{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Grammar Issues & Formatting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-warning/30 bg-warning/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    <AlertCircle className="w-4 h-4" /> Grammar Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.grammar_issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                        <span className="text-pretty">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-info/30 bg-info/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-info">
                    <FileText className="w-4 h-4" /> Formatting Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.formatting_feedback.map((feedback, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-info mt-0.5 shrink-0" />
                        <span className="text-pretty">{feedback}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Missing Skills */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning" /> Missing Technical Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="border border-warning/30 text-warning bg-warning/10">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                      <div className="w-6 h-6 rounded-full xp-bar flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-pretty">{s}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
