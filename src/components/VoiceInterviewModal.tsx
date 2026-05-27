import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { InterviewMessage, InterviewFeedback } from '@/types/types';
import {
  Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  Play, Pause, Square, Camera, Settings, X, Bot,
  Circle, StopCircle, Eye, EyeOff, Timer, Zap,
  MessageCircle, BarChart3, Maximize, Minimize,
  Download, FileText, Award, Sparkles, Users,
  Brain, TrendingUp, Clock, AlertCircle, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewType: string;
  onComplete: (feedback: InterviewFeedback) => void;
}

interface InterviewSession {
  id: string;
  startTime: number;
  endTime?: number;
  transcript: InterviewMessage[];
  behavioralAnalysis: BehavioralMetrics;
  recordingData?: Blob;
}

interface BehavioralMetrics {
  eyeContact: number;
  speakingPace: number;
  confidenceLevel: number;
  professionalismScore: number;
  communicationClarity: number;
  responseTime: number[];
  fillerWords: number;
  pauseAnalysis: {
    averagePauseLength: number;
    nervousPauses: number;
  };
}

interface AIInterviewer {
  name: string;
  role: string;
  avatar: string;
  personality: string;
}

const interviewModes = {
  hr: {
    name: 'Sarah Chen',
    role: 'Senior HR Manager',
    avatar: '👩‍💼',
    personality: 'friendly but professional, focuses on cultural fit and soft skills'
  },
  technical: {
    name: 'Dr. Alex Kumar',
    role: 'Lead Software Engineer',
    avatar: '👨‍💻',
    personality: 'analytical and thorough, asks deep technical questions'
  },
  behavioral: {
    name: 'Maria Rodriguez',
    role: 'Team Lead',
    avatar: '👩‍🏫',
    personality: 'empathetic and insightful, uses STAR method questioning'
  },
  startup: {
    name: 'Jake Thompson',
    role: 'Startup Founder',
    avatar: '🚀',
    personality: 'fast-paced and innovative, looks for adaptability and growth mindset'
  },
  faang: {
    name: 'Dr. Jennifer Liu',
    role: 'Principal Engineer',
    avatar: '🎯',
    personality: 'rigorous and detail-oriented, expects excellence and scalability thinking'
  },
  stress: {
    name: 'Robert Stone',
    role: 'Senior Director',
    avatar: '⚡',
    personality: 'challenging and direct, tests composure under pressure'
  }
};

export function VoiceInterviewModal({ isOpen, onClose, interviewType, onComplete }: VoiceInterviewModalProps) {
  // Core interview state
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewPhase, setInterviewPhase] = useState<'setup' | 'permissions' | 'interview' | 'processing' | 'completed'>('setup');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Enhanced interview features
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [interviewStartTime, setInterviewStartTime] = useState<number>(0);
  const [currentInterviewMode, setCurrentInterviewMode] = useState<keyof typeof interviewModes>('hr');
  const [conversationHistory, setConversationHistory] = useState<InterviewMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  
  // Real-time analysis
  const [voiceAnalysis, setVoiceAnalysis] = useState({
    pace: 50,
    clarity: 50,
    confidence: 50,
    volume: 0,
  });
  
  const [behavioralMetrics, setBehavioralMetrics] = useState<BehavioralMetrics>({
    eyeContact: 75,
    speakingPace: 50,
    confidenceLevel: 50,
    professionalismScore: 75,
    communicationClarity: 50,
    responseTime: [],
    fillerWords: 0,
    pauseAnalysis: {
      averagePauseLength: 0,
      nervousPauses: 0,
    }
  });

  // Session management
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null);

  // Refs for media handling
  const videoRef = useRef<HTMLVideoElement>(null);
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const responseTimerRef = useRef<number>(0);

  // Get current interviewer
  const currentInterviewer = interviewModes[currentInterviewMode] || interviewModes.hr;

  // Initialize media and permissions
  useEffect(() => {
    if (isOpen) {
      setCurrentInterviewMode(interviewType as keyof typeof interviewModes);
      requestPermissions();
    }
    return () => {
      cleanup();
    };
  }, [isOpen, interviewType]);

  // Real-time voice analysis
  useEffect(() => {
    if (interviewPhase === 'interview' && isAudioEnabled) {
      startVoiceAnalysis();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [interviewPhase, isAudioEnabled]);

  // Session recording management
  useEffect(() => {
    if (isRecording && streamRef.current) {
      startSessionRecording();
    }
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const requestPermissions = async () => {
    setInterviewPhase('permissions');
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } : false,
      });
      
      streamRef.current = stream;
      await initializeVideoFeed(stream);
      await initializeSpeechRecognition();
      await initializeAudioAnalysis(stream);
      
      setInterviewPhase('setup');
      toast.success('Camera and microphone ready!');
    } catch (error: any) {
      handlePermissionError(error);
    }
  };

  const initializeVideoFeed = async (stream: MediaStream) => {
    if (videoRef.current && isVideoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      
      try {
        await videoRef.current.play();
      } catch (error) {
        console.error('Video autoplay failed:', error);
        // Retry after user interaction
        setTimeout(async () => {
          if (videoRef.current) {
            try {
              await videoRef.current.play();
            } catch (retryError) {
              console.error('Video retry failed:', retryError);
            }
          }
        }, 1000);
      }
    }
  };

  const initializeSpeechRecognition = async () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 3;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
          analyzeFillerWords(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied. Please allow access and refresh.');
        } else if (event.error === 'no-speech') {
          toast.warning('No speech detected. Please speak clearly.');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening && interviewPhase === 'interview') {
          // Restart recognition if it stops unexpectedly
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      };
    } else {
      toast.error('Speech recognition not supported in this browser.');
    }
  };

  const initializeAudioAnalysis = async (stream: MediaStream) => {
    if (isAudioEnabled && stream.getAudioTracks().length > 0) {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
      } catch (error) {
        console.error('Audio analysis initialization failed:', error);
      }
    }
  };

  const handlePermissionError = (error: any) => {
    let errorMessage = '';
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        errorMessage = 'Camera/microphone permission denied. Please allow access and refresh the page.';
        break;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        errorMessage = 'Camera/microphone is already in use by another application.';
        break;
      case 'OverconstrainedError':
        errorMessage = 'Camera/microphone constraints could not be satisfied.';
        break;
      default:
        errorMessage = 'Unable to access camera/microphone. Please check your device and try again.';
    }
    setPermissionError(errorMessage);
    toast.error(errorMessage);
  };

  const initializeMedia = async () => {
    try {
      setPermissionError(null); // Clear any previous errors
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      });
      
      streamRef.current = stream;
      if (videoRef.current && isVideoEnabled) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Ensure muted for autoplay
        videoRef.current.playsInline = true;
        
        // Force video to play
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Video autoplay failed:', error);
            // Try to play again after user interaction
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
              }
            }, 1000);
          });
        }
      }

      // Initialize speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + ' ' + finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            toast.error('Microphone permission denied. Please allow microphone access and refresh the page.');
          } else {
            toast.error('Speech recognition error. Please try again.');
          }
        };
      }

      // Initialize audio analysis
      if (isAudioEnabled) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        startVoiceAnalysis();
      }
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      let errorMessage = '';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera/microphone permission denied. Please allow access and refresh the page.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      } else {
        errorMessage = 'Unable to access camera/microphone. Please check your device and try again.';
      }
      setPermissionError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const startVoiceAnalysis = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const timeDataArray = new Uint8Array(analyserRef.current.fftSize);
    let analysisStartTime = Date.now();
    let lastVolumeUpdate = 0;
    
    const analyze = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      analyserRef.current.getByteTimeDomainData(timeDataArray);
      
      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < timeDataArray.length; i++) {
        const sample = (timeDataArray[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / timeDataArray.length);
      const volume = Math.round(rms * 100);
      
      // Calculate frequency analysis for clarity
      const lowFreq = dataArray.slice(0, 85).reduce((sum, val) => sum + val, 0) / 85;
      const midFreq = dataArray.slice(85, 170).reduce((sum, val) => sum + val, 0) / 85;
      const highFreq = dataArray.slice(170, 255).reduce((sum, val) => sum + val, 0) / 85;
      
      const now = Date.now();
      if (now - lastVolumeUpdate > 100) { // Update every 100ms
        setVoiceAnalysis(prev => {
          // Enhanced voice analysis with proper bounds
          const newVolume = Math.min(100, Math.max(0, volume));
          
          // Pace: based on volume consistency and speech patterns
          const paceScore = Math.min(100, Math.max(0, 
            volume > 15 ? Math.min(85, prev.pace + (volume > 50 ? -0.5 : 1)) : Math.max(20, prev.pace - 0.3)
          ));
          
          // Clarity: based on frequency distribution and consistency
          const clarityScore = Math.min(100, Math.max(0,
            (midFreq > lowFreq && midFreq > highFreq) ? Math.min(90, prev.clarity + 0.8) : Math.max(25, prev.clarity - 0.4)
          ));
          
          // Confidence: based on volume strength, consistency, and speech patterns
          const confidenceScore = Math.min(100, Math.max(0,
            (volume > 25 && volume < 80) ? Math.min(88, prev.confidence + 0.6) : Math.max(30, prev.confidence - 0.3)
          ));
          
          return {
            volume: newVolume,
            pace: Math.round(paceScore),
            clarity: Math.round(clarityScore),
            confidence: Math.round(confidenceScore),
          };
        });
        
        // Update behavioral metrics
        setBehavioralMetrics(prev => ({
          ...prev,
          speakingPace: Math.round((prev.speakingPace + (volume > 20 ? 75 : 45)) / 2),
          confidenceLevel: Math.round((prev.confidenceLevel + (volume > 30 ? 80 : 50)) / 2),
          communicationClarity: Math.round((prev.communicationClarity + (midFreq > 100 ? 85 : 60)) / 2),
        }));
        
        lastVolumeUpdate = now;
      }

      if (interviewPhase === 'interview') {
        requestAnimationFrame(analyze);
      }
    };
    
    analyze();
  }, [interviewPhase]);

  const analyzeFillerWords = (text: string) => {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
    const words = text.toLowerCase().split(' ');
    const fillerCount = words.filter(word => fillerWords.includes(word.trim())).length;
    
    if (fillerCount > 0) {
      setBehavioralMetrics(prev => ({
        ...prev,
        fillerWords: prev.fillerWords + fillerCount,
        professionalismScore: Math.max(40, prev.professionalismScore - (fillerCount * 2))
      }));
    }
  };

  const startSessionRecording = () => {
    if (!streamRef.current) return;
    
    try {
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      };
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setSessionRecording(blob);
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
    } catch (error) {
      console.error('Recording failed:', error);
      toast.error('Recording failed. Interview will continue without recording.');
    }
  };

  const startInterview = async () => {
    setInterviewPhase('interview');
    setQuestionCount(1);
    setInterviewStartTime(Date.now());
    setIsRecording(true);
    
    // Create interview session
    const session: InterviewSession = {
      id: `interview_${Date.now()}`,
      startTime: Date.now(),
      transcript: [],
      behavioralAnalysis: behavioralMetrics,
    };
    setCurrentSession(session);
    
    // Generate personalized introduction
    const prompt = `You are ${currentInterviewer.name}, a ${currentInterviewer.role}. You are ${currentInterviewer.personality}. 

Start this ${interviewType} interview by:
1. Introducing yourself warmly and professionally
2. Asking for the candidate's name
3. Briefly explaining the interview format
4. Making them feel comfortable

Keep it conversational and under 3 sentences. Be encouraging and set a positive tone.`;
    
    await generateAIResponse(prompt, true);
  };

  const generateAIResponse = async (prompt: string, isIntroduction = false) => {
    setAiTyping(true);
    setIsAISpeaking(true);
    
    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let response = '';

    try {
      await streamGemini(
        contents,
        (chunk) => { 
          response += chunk; 
          setCurrentQuestion(response); 
        },
        async () => {
          setAiTyping(false);
          
          // Add to conversation history
          const aiMessage: InterviewMessage = {
            role: 'interviewer',
            content: response,
            timestamp: new Date().toISOString()
          };
          
          setConversationHistory(prev => [...prev, aiMessage]);
          
          // Speak the response using Speech Synthesis
          await speakAIResponse(response);
          
          if (!isIntroduction) {
            // Start listening for user response after AI finishes speaking
            setTimeout(() => {
              startListening();
            }, 1000);
          } else {
            // For introduction, start listening immediately
            startListening();
          }
        },
        (error) => {
          setAiTyping(false);
          setIsAISpeaking(false);
          toast.error('AI response error: ' + error.message);
        },
        `You are ${currentInterviewer.name}, ${currentInterviewer.personality}. Conduct a professional ${interviewType} interview.`
      );
    } catch (error) {
      setAiTyping(false);
      setIsAISpeaking(false);
      console.error('AI generation error:', error);
    }
  };

  const speakAIResponse = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthRef.current = utterance;
        
        // Configure voice settings
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Try to use a professional voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Microsoft') ||
          voice.lang.startsWith('en')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.onend = () => {
          setIsAISpeaking(false);
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          setIsAISpeaking(false);
          resolve();
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        setIsAISpeaking(false);
        resolve();
      }
    });
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setTranscript('');
      responseTimerRef.current = Date.now();
      
      try {
        recognitionRef.current.start();
        
        // Auto-stop after 3 minutes of silence or 8 minutes total
        setTimeout(() => {
          if (isListening) {
            stopListening();
          }
        }, 480000); // 8 minutes
      } catch (error) {
        console.error('Speech recognition start error:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      if (transcript.trim()) {
        const responseTime = Date.now() - responseTimerRef.current;
        setBehavioralMetrics(prev => ({
          ...prev,
          responseTime: [...prev.responseTime, responseTime]
        }));
        
        processUserResponse();
      }
    }
  };

  const processUserResponse = async () => {
    if (!transcript.trim()) return;

    setInterviewPhase('processing');
    
    // Add user response to conversation history
    const userMessage: InterviewMessage = {
      role: 'candidate',
      content: transcript,
      timestamp: new Date().toISOString()
    };
    
    setConversationHistory(prev => [...prev, userMessage]);
    
    // Generate dynamic follow-up based on conversation history and user response
    const conversationContext = conversationHistory.map(msg => 
      `${msg.role === 'interviewer' ? currentInterviewer.name : 'Candidate'}: ${msg.content}`
    ).join('\n');
    
    const prompt = `
Interview Context:
- Type: ${interviewType}
- Interviewer: ${currentInterviewer.name} (${currentInterviewer.personality})
- Question #: ${questionCount}
- Previous conversation:
${conversationContext}

Candidate's latest response: "${transcript}"

${questionCount === 1 ? 
  'The candidate just provided their name. Thank them warmly and ask the first substantive interview question relevant to the interview type.' :
  questionCount < 7 ? 
    `Analyze their response and ask an intelligent follow-up question or move to the next topic. Be conversational and adaptive. ${questionCount > 3 ? 'Consider asking more challenging questions as the interview progresses.' : ''}` :
    'This should be the final question or closing. Provide a brief, professional closing statement and thank the candidate.'
}

Keep responses natural, conversational, and under 2 sentences unless asking a complex question.`;

    await generateAIResponse(prompt);
    
    if (questionCount < 7) {
      setQuestionCount(prev => prev + 1);
      setInterviewPhase('interview');
    } else {
      // Interview complete
      setTimeout(() => {
        generateFinalFeedback();
      }, 3000);
    }
  };

  const generateFinalFeedback = async () => {
    setInterviewPhase('processing');
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Calculate final behavioral metrics
    const avgResponseTime = behavioralMetrics.responseTime.length > 0 
      ? behavioralMetrics.responseTime.reduce((sum, time) => sum + time, 0) / behavioralMetrics.responseTime.length 
      : 5000;
    
    const interviewDuration = Date.now() - interviewStartTime;
    
    const finalMetrics = {
      ...behavioralMetrics,
      pauseAnalysis: {
        averagePauseLength: avgResponseTime,
        nervousPauses: behavioralMetrics.responseTime.filter(time => time > 8000).length
      }
    };
    
    // Generate comprehensive AI feedback
    const conversationTranscript = conversationHistory.map(msg => 
      `${msg.role === 'interviewer' ? currentInterviewer.name : 'Candidate'}: ${msg.content}`
    ).join('\n\n');
    
    const prompt = `Analyze this comprehensive ${interviewType} interview and provide detailed feedback.

INTERVIEW DETAILS:
- Duration: ${Math.round(interviewDuration / 60000)} minutes
- Interviewer: ${currentInterviewer.name} (${currentInterviewer.role})
- Interview Type: ${interviewType}

CONVERSATION TRANSCRIPT:
${conversationTranscript}

BEHAVIORAL ANALYSIS:
- Average Response Time: ${Math.round(avgResponseTime / 1000)}s
- Filler Words Used: ${finalMetrics.fillerWords}
- Nervous Pauses: ${finalMetrics.pauseAnalysis.nervousPauses}
- Speaking Pace: ${finalMetrics.speakingPace}%
- Communication Clarity: ${finalMetrics.communicationClarity}%
- Confidence Level: ${finalMetrics.confidenceLevel}%

VOICE ANALYSIS:
- Average Volume: ${voiceAnalysis.volume}%
- Speaking Pace: ${voiceAnalysis.pace}%
- Voice Clarity: ${voiceAnalysis.clarity}%
- Voice Confidence: ${voiceAnalysis.confidence}%

Return ONLY valid JSON with comprehensive analysis:
{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "communication_score": <0-100>,
  "technical_score": <0-100>,
  "voice_analysis": {
    "pace_score": <0-100>,
    "clarity_score": <0-100>,
    "volume_score": <0-100>,
    "confidence_score": <0-100>
  },
  "behavioral_analysis": {
    "eye_contact_score": <0-100>,
    "professionalism_score": <0-100>,
    "response_timing_score": <0-100>,
    "composure_score": <0-100>
  },
  "strengths": ["strength1", "strength2", "strength3", "strength4"],
  "improvements": ["improvement1", "improvement2", "improvement3", "improvement4"],
  "voice_feedback": ["voice_tip1", "voice_tip2", "voice_tip3"],
  "behavioral_feedback": ["behavior_tip1", "behavior_tip2", "behavior_tip3"],
  "interview_readiness": <0-100>,
  "summary": "comprehensive feedback paragraph including all aspects analyzed",
  "personalized_roadmap": ["action1", "action2", "action3", "action4"],
  "next_steps": ["step1", "step2", "step3"]
}`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let response = '';

    try {
      await streamGemini(
        contents,
        (chunk) => { response += chunk; },
        () => {
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const feedback: InterviewFeedback = JSON.parse(jsonMatch[0]);
              
              // Enhanced feedback with additional metrics
              const enhancedFeedback = {
                ...feedback,
                interview_duration: Math.round(interviewDuration / 60000),
                session_recording: sessionRecording,
                conversation_transcript: conversationHistory,
                behavioral_metrics: finalMetrics,
                interviewer_info: currentInterviewer
              };
              
              setInterviewPhase('completed');
              onComplete(enhancedFeedback);
              
              // Save session data
              if (currentSession) {
                const completedSession = {
                  ...currentSession,
                  endTime: Date.now(),
                  transcript: conversationHistory,
                  behavioralAnalysis: finalMetrics,
                  recordingData: sessionRecording
                };
                // Here you would save to Supabase
                console.log('Interview session completed:', completedSession);
              }
              
              onClose();
            } else {
              throw new Error('Invalid feedback format');
            }
          } catch (error) {
            console.error('Error parsing feedback:', error);
            useFallbackFeedback();
          }
        },
        (error) => {
          console.error('Feedback generation error:', error);
          useFallbackFeedback();
        }
      );
    } catch (error) {
      console.error('Feedback timeout:', error);
      useFallbackFeedback();
    }
  };

  const useFallbackFeedback = () => {
    const avgScore = Math.round((voiceAnalysis.confidence + voiceAnalysis.clarity + behavioralMetrics.confidenceLevel) / 3);
    
    const fallbackFeedback: InterviewFeedback = {
      overall_score: Math.min(95, Math.max(60, avgScore)),
      confidence_score: behavioralMetrics.confidenceLevel,
      communication_score: voiceAnalysis.clarity,
      technical_score: 75,
      voice_analysis: {
        pace_score: voiceAnalysis.pace,
        clarity_score: voiceAnalysis.clarity,
        volume_score: Math.min(85, voiceAnalysis.volume + 20),
        confidence_score: voiceAnalysis.confidence
      },
      strengths: [
        "Participated actively in the interview",
        "Demonstrated good communication skills",
        "Showed engagement throughout the session",
        "Maintained professional demeanor"
      ],
      improvements: [
        "Practice speaking with more confidence",
        "Work on reducing filler words",
        "Improve response timing",
        "Enhance technical knowledge"
      ],
      voice_feedback: [
        "Speak at a consistent pace",
        "Project your voice clearly",
        "Practice breathing techniques for confidence"
      ],
      summary: `Completed a ${Math.round((Date.now() - interviewStartTime) / 60000)}-minute ${interviewType} interview with ${currentInterviewer.name}. Overall performance shows good potential with room for improvement in confidence and communication clarity.`
    };

    onComplete(fallbackFeedback);
    onClose();
    toast.success('Interview completed with feedback!');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleBackgroundBlur = () => {
    setBackgroundBlur(!backgroundBlur);
  };

  const downloadRecording = () => {
    if (sessionRecording) {
      const url = URL.createObjectURL(sessionRecording);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_${currentInterviewer.name}_${new Date().toISOString().split('T')[0]}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Recording downloaded successfully!');
    }
  };

  const downloadTranscript = () => {
    const transcript = conversationHistory.map(msg => 
      `${msg.role === 'interviewer' ? currentInterviewer.name : 'Candidate'}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded successfully!');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const toggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    if (streamRef.current) {
      // Stop current stream
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reinitialize with new video state
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: newVideoState ? { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      });
      
      streamRef.current = stream;
      if (videoRef.current && newVideoState) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(console.error);
        }
      }
      
      // Reinitialize audio analysis if audio is enabled
      if (isAudioEnabled) {
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        startVoiceAnalysis();
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      setIsVideoEnabled(!newVideoState); // Revert on error
      toast.error('Failed to toggle video. Please check camera permissions.');
    }
  };

  const toggleAudio = async () => {
    const newAudioState = !isAudioEnabled;
    setIsAudioEnabled(newAudioState);
    
    if (streamRef.current) {
      // Stop current stream
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reinitialize with new audio state
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false,
        audio: newAudioState ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      });
      
      streamRef.current = stream;
      if (videoRef.current && isVideoEnabled) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(console.error);
        }
      }
      
      // Reinitialize audio analysis if audio is now enabled
      if (newAudioState) {
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        startVoiceAnalysis();
      } else {
        // Stop audio analysis
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
          analyserRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      setIsAudioEnabled(!newAudioState); // Revert on error
      toast.error('Failed to toggle audio. Please check microphone permissions.');
    }
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black/90 flex items-center justify-center z-50",
      isFullscreen ? "p-0" : "p-4"
    )}>
      <Card className={cn(
        "w-full max-h-[95vh] overflow-hidden mx-auto bg-gradient-to-br from-gray-900 to-black border-gray-700",
        isFullscreen ? "max-w-none h-screen rounded-none" : "max-w-7xl rounded-xl"
      )}>
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border-b border-gray-700">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">AI Video Interview</span>
              <div className="text-sm text-gray-300 font-normal">
                {currentInterviewer.name} • {currentInterviewer.role}
              </div>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Interview Timer */}
            {interviewPhase === 'interview' && (
              <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1">
                <Circle className="w-3 h-3 mr-1 animate-pulse fill-current" />
                {formatTime(Date.now() - interviewStartTime)}
              </Badge>
            )}
            
            {/* Status Indicators */}
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isVideoEnabled ? "bg-green-400" : "bg-red-400"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full",
                isAudioEnabled ? "bg-green-400" : "bg-red-400"
              )} />
            </div>
            
            {/* Controls */}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-gray-300 hover:text-white">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 h-full">
          {/* Permission Request Screen */}
          {interviewPhase === 'permissions' && (
            <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center space-y-4 text-white">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Requesting Permissions</h3>
                <p className="text-gray-300 max-w-md">
                  Please allow camera and microphone access for the best interview experience.
                </p>
              </div>
            </div>
          )}

          {/* Permission Error Screen */}
          {permissionError && (
            <div className="flex items-center justify-center h-96 bg-gradient-to-br from-red-900/20 to-black">
              <div className="text-center space-y-4 p-8 border border-red-500/20 rounded-lg bg-red-500/5 max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-red-300">Permission Required</h3>
                <p className="text-gray-300 text-sm">{permissionError}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={requestPermissions} className="bg-red-500 hover:bg-red-600 text-white">
                    Try Again
                  </Button>
                  <Button onClick={onClose} variant="ghost" className="text-gray-300">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Setup Screen */}
          {interviewPhase === 'setup' && !permissionError && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full bg-gradient-to-br from-gray-900 to-black">
              {/* Video Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Camera Preview
                </h3>
                <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "w-full h-full object-cover",
                      !isVideoEnabled && "hidden",
                      backgroundBlur && "filter blur-sm"
                    )}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <VideoOff className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button
                      size="icon"
                      variant={isVideoEnabled ? "default" : "destructive"}
                      onClick={toggleVideo}
                      className="rounded-full"
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant={isAudioEnabled ? "default" : "destructive"}
                      onClick={toggleAudio}
                      className="rounded-full"
                    >
                      {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={toggleBackgroundBlur}
                      className="rounded-full"
                    >
                      {backgroundBlur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Interview Setup */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Interview Setup</h3>
                  <div className="space-y-4">
                    {/* Interviewer Info */}
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{currentInterviewer.avatar}</span>
                        <div>
                          <div className="font-semibold text-white">{currentInterviewer.name}</div>
                          <div className="text-sm text-gray-300">{currentInterviewer.role}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{currentInterviewer.personality}</p>
                    </div>

                    {/* Interview Mode Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Interview Mode</label>
                      <select
                        value={currentInterviewMode}
                        onChange={(e) => setCurrentInterviewMode(e.target.value as keyof typeof interviewModes)}
                        className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-primary focus:outline-none"
                      >
                        <option value="hr">HR Interview</option>
                        <option value="technical">Technical Interview</option>
                        <option value="behavioral">Behavioral Interview</option>
                        <option value="startup">Startup Interview</option>
                        <option value="faang">FAANG Interview</option>
                        <option value="stress">Stress Interview</option>
                      </select>
                    </div>

                    {/* System Check */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">System Check</label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded bg-gray-800/30">
                          <span className="text-sm text-gray-300">Camera</span>
                          {isVideoEnabled ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-gray-800/30">
                          <span className="text-sm text-gray-300">Microphone</span>
                          {isAudioEnabled ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-gray-800/30">
                          <span className="text-sm text-gray-300">Speech Recognition</span>
                          {recognitionRef.current ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start Interview Button */}
                <Button 
                  onClick={startInterview} 
                  disabled={!isVideoEnabled || !isAudioEnabled}
                  className="w-full h-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold text-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Interview
                </Button>
              </div>
            </div>
          )}

          {/* Active Interview Screen */}
          {interviewPhase === 'interview' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 h-full bg-gradient-to-br from-gray-900 to-black">
              {/* AI Interviewer Panel */}
              <div className="xl:col-span-1 space-y-4">
                {/* AI Avatar/Video */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 aspect-video">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{currentInterviewer.avatar}</div>
                      <div className="text-white font-semibold">{currentInterviewer.name}</div>
                      <div className="text-gray-300 text-sm">{currentInterviewer.role}</div>
                    </div>
                  </div>
                  
                  {/* AI Speaking Indicator */}
                  {isAISpeaking && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-white text-xs">Speaking...</span>
                    </div>
                  )}
                </div>

                {/* Real-time Analytics */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Live Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Voice Metrics */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Voice Confidence</span>
                        <span className="text-white">{voiceAnalysis.confidence}%</span>
                      </div>
                      <Progress value={voiceAnalysis.confidence} className="h-1" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Clarity</span>
                        <span className="text-white">{voiceAnalysis.clarity}%</span>
                      </div>
                      <Progress value={voiceAnalysis.clarity} className="h-1" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300">Speaking Pace</span>
                        <span className="text-white">{voiceAnalysis.pace}%</span>
                      </div>
                      <Progress value={voiceAnalysis.pace} className="h-1" />
                    </div>

                    {/* Behavioral Metrics */}
                    <div className="pt-2 border-t border-gray-600">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-gray-700/50 rounded">
                          <div className="text-white font-semibold">{behavioralMetrics.professionalismScore}%</div>
                          <div className="text-gray-400">Professional</div>
                        </div>
                        <div className="text-center p-2 bg-gray-700/50 rounded">
                          <div className="text-white font-semibold">{behavioralMetrics.fillerWords}</div>
                          <div className="text-gray-400">Filler Words</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Interview Area */}
              <div className="xl:col-span-2 space-y-4">
                {/* User Video Feed */}
                <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "w-full h-full object-cover",
                      !isVideoEnabled && "hidden",
                      backgroundBlur && "filter blur-sm"
                    )}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <VideoOff className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/20 rounded-full px-3 py-1 border border-red-500/30">
                      <Circle className="w-3 h-3 text-red-400 animate-pulse fill-current" />
                      <span className="text-red-300 text-sm font-medium">REC</span>
                    </div>
                  )}

                  {/* Listening Indicator */}
                  {isListening && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/20 rounded-full px-3 py-1 border border-green-500/30">
                      <Mic className="w-3 h-3 text-green-400" />
                      <span className="text-green-300 text-sm font-medium">Listening...</span>
                    </div>
                  )}

                  {/* Video Controls */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button
                      size="icon"
                      variant={isVideoEnabled ? "default" : "destructive"}
                      onClick={toggleVideo}
                      className="rounded-full bg-black/50 hover:bg-black/70"
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant={isAudioEnabled ? "default" : "destructive"}
                      onClick={toggleAudio}
                      className="rounded-full bg-black/50 hover:bg-black/70"
                    >
                      {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Interview Question & Transcript */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Current Question */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Current Question
                        {aiTyping && (
                          <div className="flex gap-1 ml-2">
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-gray-200 text-sm leading-relaxed">
                        <Streamdown parseIncompleteMarkdown isAnimating={aiTyping}>
                          {currentQuestion || "Preparing question..."}
                        </Streamdown>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live Transcript */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Your Response
                        {isListening && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-2" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-gray-200 text-sm leading-relaxed min-h-[100px]">
                        {transcript || (isListening ? "Listening for your response..." : "Click 'Start Speaking' to respond")}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interview Controls */}
                <div className="flex justify-center gap-4">
                  {isListening ? (
                    <Button 
                      onClick={stopListening} 
                      variant="destructive"
                      className="px-6 py-3 rounded-full"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Speaking
                    </Button>
                  ) : (
                    <Button 
                      onClick={startListening} 
                      disabled={isAISpeaking || aiTyping}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white rounded-full"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Start Speaking
                    </Button>
                  )}
                  
                  <Button 
                    onClick={generateFinalFeedback} 
                    variant="outline"
                    className="px-6 py-3 rounded-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    End Interview
                  </Button>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          i < questionCount ? "bg-primary" : "bg-gray-600"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Screen */}
          {interviewPhase === 'processing' && (
            <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center space-y-4 text-white">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-semibold">Processing Response</h3>
                <p className="text-gray-300">
                  AI is analyzing your answer and preparing the next question...
                </p>
              </div>
            </div>
          )}

          {/* Completed Screen */}
          {interviewPhase === 'completed' && (
            <div className="flex items-center justify-center h-96 bg-gradient-to-br from-green-900/20 to-black">
              <div className="text-center space-y-6 text-white max-w-md">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Interview Completed!</h3>
                  <p className="text-gray-300">
                    Great job! Your interview with {currentInterviewer.name} has been completed.
                  </p>
                </div>
                
                {/* Download Options */}
                <div className="flex gap-3 justify-center">
                  {sessionRecording && (
                    <Button onClick={downloadRecording} variant="outline" className="border-gray-600 text-gray-300">
                      <Download className="w-4 h-4 mr-2" />
                      Recording
                    </Button>
                  )}
                  <Button onClick={downloadTranscript} variant="outline" className="border-gray-600 text-gray-300">
                    <FileText className="w-4 h-4 mr-2" />
                    Transcript
                  </Button>
                </div>
                
                <Button onClick={onClose} className="bg-gradient-to-r from-primary to-purple-500 text-white px-8">
                  View Results
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}