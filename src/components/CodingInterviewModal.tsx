import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { InterviewFeedback } from '@/types/types';
import {
  Code2, Clock, CheckCircle, X, Play, RotateCcw,
  Trophy, Zap, Brain, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CodingProblem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  platform: string;
}

interface CodingInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (feedback: InterviewFeedback) => void;
}

export function CodingInterviewModal({ isOpen, onClose, onComplete }: CodingInterviewModalProps) {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [solutions, setSolutions] = useState<string[]>(['', '', '']);
  const [timeSpent, setTimeSpent] = useState<number[]>([0, 0, 0]);
  const [startTime, setStartTime] = useState<number>(0);
  const [phase, setPhase] = useState<'loading' | 'solving' | 'feedback'>('loading');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Programming languages available for coding
  const programmingLanguages = [
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'java', label: 'Java', extension: 'java' },
    { value: 'cpp', label: 'C++', extension: 'cpp' },
    { value: 'c', label: 'C', extension: 'c' },
    { value: 'csharp', label: 'C#', extension: 'cs' },
    { value: 'typescript', label: 'TypeScript', extension: 'ts' },
    { value: 'go', label: 'Go', extension: 'go' },
    { value: 'rust', label: 'Rust', extension: 'rs' },
    { value: 'kotlin', label: 'Kotlin', extension: 'kt' },
    { value: 'swift', label: 'Swift', extension: 'swift' },
    { value: 'php', label: 'PHP', extension: 'php' },
    { value: 'ruby', label: 'Ruby', extension: 'rb' },
  ];

  useEffect(() => {
    if (isOpen) {
      generateProblems();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (phase === 'solving' && startTime > 0) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => {
          const newTimes = [...prev];
          newTimes[currentProblemIndex] = Date.now() - startTime;
          return newTimes;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, startTime, currentProblemIndex]);

  const generateProblems = async () => {
    setPhase('loading');
    
    // Simplified, faster prompt
    const prompt = `Generate 3 coding problems as JSON. Be concise:

{
  "problems": [
    {
      "id": 1,
      "title": "Two Sum",
      "difficulty": "Easy",
      "description": "Given an array of integers and a target, return indices of two numbers that add up to target.",
      "examples": [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}],
      "constraints": ["2 <= nums.length <= 10^4", "Time: O(n)", "Space: O(n)"],
      "platform": "LeetCode"
    },
    {
      "id": 2,
      "title": "Longest Palindromic Substring",
      "difficulty": "Medium", 
      "description": "Find the longest palindromic substring in a string.",
      "examples": [{"input": "s = 'babad'", "output": "'bab'", "explanation": "'aba' is also valid"}],
      "constraints": ["1 <= s.length <= 1000", "Time: O(n^2)", "Space: O(1)"],
      "platform": "LeetCode"
    },
    {
      "id": 3,
      "title": "Merge k Sorted Lists",
      "difficulty": "Hard",
      "description": "Merge k sorted linked lists and return as one sorted list.",
      "examples": [{"input": "lists = [[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]", "explanation": "Merged in sorted order"}],
      "constraints": ["k == lists.length", "Time: O(n log k)", "Space: O(1)"],
      "platform": "LeetCode"
    }
  ]
}`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let response = '';
    let timeoutId: NodeJS.Timeout;

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out after 30 seconds'));
      }, 30000); // 30 second timeout
    });

    try {
      // Race between the API call and timeout
      await Promise.race([
        streamGemini(
          contents,
          (chunk) => { response += chunk; },
          () => {
            clearTimeout(timeoutId);
            try {
              const jsonMatch = response.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.problems && parsed.problems.length === 3) {
                  setProblems(parsed.problems);
                  setPhase('solving');
                  setStartTime(Date.now());
                } else {
                  throw new Error('Invalid problems format');
                }
              } else {
                throw new Error('No valid JSON found');
              }
            } catch (error) {
              console.error('Error parsing problems:', error);
              useFallbackProblems();
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('Gemini error:', error);
            useFallbackProblems();
          },
          'Generate 3 coding problems quickly. Return only valid JSON.'
        ),
        timeoutPromise
      ]);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Generation timeout or error:', error);
      useFallbackProblems();
    }
  };

  // Fallback problems if generation fails
  const useFallbackProblems = () => {
    const fallbackProblems = [
      {
        id: 1,
        title: "Two Sum",
        difficulty: "Easy" as const,
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        examples: [
          {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
          }
        ],
        constraints: [
          "2 <= nums.length <= 10^4",
          "-10^9 <= nums[i] <= 10^9",
          "Only one valid answer exists"
        ],
        platform: "LeetCode"
      },
      {
        id: 2,
        title: "Valid Parentheses",
        difficulty: "Medium" as const,
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets in the correct order.",
        examples: [
          {
            input: "s = '()[]{}'",
            output: "true",
            explanation: "All brackets are properly matched and closed."
          }
        ],
        constraints: [
          "1 <= s.length <= 10^4",
          "s consists of parentheses only '()[]{}'",
          "Time complexity: O(n), Space: O(n)"
        ],
        platform: "LeetCode"
      },
      {
        id: 3,
        title: "Merge k Sorted Lists",
        difficulty: "Hard" as const,
        description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
        examples: [
          {
            input: "lists = [[1,4,5],[1,3,4],[2,6]]",
            output: "[1,1,2,3,4,4,5,6]",
            explanation: "The linked-lists are merged in sorted order."
          }
        ],
        constraints: [
          "k == lists.length",
          "0 <= k <= 10^4",
          "Time complexity: O(n log k)"
        ],
        platform: "LeetCode"
      }
    ];

    setProblems(fallbackProblems);
    setPhase('solving');
    setStartTime(Date.now());
    toast.success('Loaded coding problems successfully!');
  };

  const handleSolutionChange = (value: string) => {
    const newSolutions = [...solutions];
    newSolutions[currentProblemIndex] = value;
    setSolutions(newSolutions);
  };

  const nextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setStartTime(Date.now());
    } else {
      generateFeedback();
    }
  };

  const previousProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
      setStartTime(Date.now());
    }
  };

  const generateFeedback = async () => {
    setIsGeneratingFeedback(true);
    setPhase('feedback');

    const analysisPrompt = `Analyze coding performance. Return ONLY JSON:

{
  "overall_score": 85,
  "coding_analysis": {
    "problem_solving_score": 80,
    "code_quality_score": 90,
    "algorithm_efficiency_score": 75,
    "completion_rate": 85
  },
  "strengths": ["Good problem approach", "Clean code structure", "Efficient solutions"],
  "improvements": ["Add edge case handling", "Optimize time complexity", "Better variable names"],
  "coding_feedback": ["Consider using hash maps", "Break down complex problems", "Test with examples"],
  "summary": "Strong coding performance with room for optimization improvements."
}

Solutions Analysis (Language: ${programmingLanguages.find(l => l.value === selectedLanguage)?.label}):
${problems.map((problem, index) => `
Problem ${index + 1} (${problem.difficulty}): ${problem.title}
Time: ${Math.round(timeSpent[index] / 1000)}s
Code: ${solutions[index]?.substring(0, 200) || 'No solution'}...
`).join('\n')}`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: analysisPrompt }] }];
    let response = '';
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Feedback generation timed out'));
      }, 20000); // 20 second timeout for feedback
    });

    try {
      await Promise.race([
        streamGemini(
          contents,
          (chunk) => { response += chunk; },
          () => {
            clearTimeout(timeoutId);
            setIsGeneratingFeedback(false);
            try {
              const jsonMatch = response.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const feedback: InterviewFeedback = JSON.parse(jsonMatch[0]);
                onComplete(feedback);
                onClose();
              } else {
                throw new Error('No valid JSON found');
              }
            } catch (error) {
              console.error('Error parsing feedback:', error);
              useFallbackFeedback();
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            setIsGeneratingFeedback(false);
            console.error('Feedback generation error:', error);
            useFallbackFeedback();
          }
        ),
        timeoutPromise
      ]);
    } catch (error) {
      clearTimeout(timeoutId);
      setIsGeneratingFeedback(false);
      console.error('Feedback timeout:', error);
      useFallbackFeedback();
    }
  };

  const useFallbackFeedback = () => {
    const completionRate = solutions.filter(sol => sol.trim().length > 0).length;
    const avgTime = timeSpent.reduce((sum, time) => sum + time, 0) / timeSpent.length / 1000;
    
    const fallbackFeedback: InterviewFeedback = {
      overall_score: Math.min(90, 60 + (completionRate * 10)),
      coding_analysis: {
        problem_solving_score: Math.min(95, 50 + (completionRate * 15)),
        code_quality_score: 75,
        algorithm_efficiency_score: avgTime < 300 ? 85 : 70,
        completion_rate: (completionRate / 3) * 100
      },
      strengths: [
        "Attempted multiple problems",
        "Showed coding fundamentals",
        "Worked within time constraints"
      ],
      improvements: [
        "Focus on edge case handling",
        "Optimize algorithm efficiency", 
        "Practice more complex problems"
      ],
      coding_feedback: [
        "Break down problems into smaller steps",
        "Consider time and space complexity",
        "Test solutions with provided examples"
      ],
      summary: `Completed ${completionRate} out of 3 problems. ${avgTime < 300 ? 'Good time management' : 'Consider working faster'}. Focus on algorithm optimization and edge cases.`
    };

    onComplete(fallbackFeedback);
    onClose();
    toast.success('Interview completed with feedback!');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100 border-green-300';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'Hard': return 'text-red-600 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  if (!isOpen) return null;

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden mx-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3 px-6">
          <CardTitle className="flex items-center gap-2 flex-shrink-0">
            <Code2 className="w-5 h-5" />
            <span className="hidden sm:inline">Coding Interview Challenge</span>
            <span className="sm:hidden">Coding Challenge</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            {phase === 'solving' && problems.length > 0 && (
              <Badge variant="outline" className="text-sm font-medium px-2 py-1 border-primary/30 bg-primary/5 whitespace-nowrap">
                Problem {currentProblemIndex + 1} of {problems.length}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6">
          {phase === 'loading' && (
            <div className="text-center space-y-4 py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p>Generating coding problems...</p>
              <p className="text-sm text-muted-foreground">This may take up to 30 seconds</p>
              <Button 
                onClick={useFallbackProblems} 
                variant="outline" 
                className="mt-4"
              >
                Use Sample Problems Instead
              </Button>
            </div>
          )}

          {phase === 'solving' && currentProblem && (
            <>
              {/* Problem Progress Indicator */}
              <div className="flex items-center justify-center mb-4">
                <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                  Problem {currentProblemIndex + 1} of {problems.length}: {currentProblem.title}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
              {/* Problem Description */}
              <div className="space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('border text-xs px-2 py-1', getDifficultyColor(currentProblem.difficulty))}>
                      {currentProblem.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{currentProblem.platform}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg min-w-fit">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="font-mono tabular-nums min-w-[70px] text-center">{formatTime(timeSpent[currentProblemIndex])}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{currentProblem.title}</h3>
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{currentProblem.description}</Streamdown>
                  </div>
                </div>

                {currentProblem.examples && (
                  <div>
                    <h4 className="font-semibold mb-2">Examples:</h4>
                    {currentProblem.examples.map((example, idx) => (
                      <div key={idx} className="bg-muted p-3 rounded-lg mb-2">
                        <div><strong>Input:</strong> {example.input}</div>
                        <div><strong>Output:</strong> {example.output}</div>
                        {example.explanation && (
                          <div><strong>Explanation:</strong> {example.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {currentProblem.constraints && (
                  <div>
                    <h4 className="font-semibold mb-2">Constraints:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {currentProblem.constraints.map((constraint, idx) => (
                        <li key={idx}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Code Editor */}
              <div className="space-y-4">
                {/* Problem Counter - More Prominent */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">Your Solution</h4>
                    <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                      Problem {currentProblemIndex + 1} of {problems.length}
                    </Badge>
                  </div>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {programmingLanguages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={solutions[currentProblemIndex]}
                  onChange={(e) => handleSolutionChange(e.target.value)}
                  placeholder={`Write your ${programmingLanguages.find(l => l.value === selectedLanguage)?.label} solution here...`}
                  className="font-mono text-sm min-h-[400px] resize-none"
                />

                <div className="flex justify-between">
                  <Button
                    onClick={previousProblem}
                    disabled={currentProblemIndex === 0}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  
                  <Button
                    onClick={nextProblem}
                    className="xp-bar text-white"
                  >
                    {currentProblemIndex === problems.length - 1 ? 'Submit All' : 'Next Problem'}
                  </Button>
                </div>
              </div>
            </div>
            </>
          )}

          {phase === 'feedback' && (
            <div className="text-center space-y-4 py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p>Analyzing your coding performance...</p>
            </div>
          )}

          {/* Problem Navigation */}
          {phase === 'solving' && problems.length > 0 && (
            <div className="flex justify-center gap-3 pt-6 pb-2 border-t mt-4">
              {problems.map((problem, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentProblemIndex(index);
                    setStartTime(Date.now());
                  }}
                  className={cn(
                    'w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors shadow-sm hover:shadow-md',
                    index === currentProblemIndex
                      ? 'border-primary bg-primary text-white shadow-primary/25'
                      : solutions[index]
                      ? 'border-green-500 bg-green-100 text-green-700 hover:bg-green-200'
                      : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <span className="flex items-center justify-center">
                    {index + 1}
                    {solutions[index] && index !== currentProblemIndex && (
                      <CheckCircle className="w-3 h-3 ml-0.5" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}