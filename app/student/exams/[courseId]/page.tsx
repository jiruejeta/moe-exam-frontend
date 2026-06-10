'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

interface Question {
  _id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface StudentInfo {
  fullName: string;
  username: string;
  department: string;
  institution: string;
  institutionId: string;
  examCentre: string;
  enrollmentType: string;
  gender: string;
  blindStatus: string;
}

interface ExamAttempt {
  attemptId: string;
  courseCode: string;
  courseName: string;
  totalQuestions: number;
  examDuration: number;
  startTime: string;
}

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [courseName, setCourseName] = useState('');
  const [showTimer, setShowTimer] = useState(true);
  const [showQuizNav, setShowQuizNav] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load exam data
  useEffect(() => {
    loadExamData();
  }, [courseId]);

  const loadExamData = async () => {
    try {
      const stored = localStorage.getItem('examAttempt');
      if (!stored) {
        toast.error('No exam session found');
        router.push('/student/dashboard');
        return;
      }

      let examData: ExamAttempt;
      try {
        examData = JSON.parse(stored) as ExamAttempt;
      } catch (parseError) {
        console.error('Error parsing examAttempt:', parseError);
        localStorage.removeItem('examAttempt');
        toast.error('Invalid exam session');
        router.push('/student/dashboard');
        return;
      }

      setAttemptId(examData.attemptId);
      setTimeLeft(examData.examDuration * 60);
      setCourseName(examData.courseName);

      const studentStored = localStorage.getItem('studentInfo');
      if (studentStored) {
        try {
          setStudent(JSON.parse(studentStored));
        } catch (parseError) {
          console.error('Error parsing studentInfo:', parseError);
        }
      }

      const res = await axios.get(`/questions/course/${courseId}`);
      const shuffledQuestions = [...res.data].sort(() => Math.random() - 0.5);
      setQuestions(shuffledQuestions);

      setLoading(false);
    } catch (error) {
      console.error('Load exam error:', error);
      toast.error('Failed to load exam');
      router.push('/student/dashboard');
    }
  };

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || loading || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, submitted]);

  // Auto-save answers
  useEffect(() => {
    if (!attemptId || Object.keys(answers).length === 0 || submitted) return;

    const saveTimeout = setTimeout(async () => {
      const currentQuestion = questions[currentIndex];
      if (currentQuestion && answers[currentQuestion._id]) {
        await saveAnswer(currentQuestion._id, answers[currentQuestion._id]);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [answers, currentIndex, submitted]);

  const saveAnswer = async (questionId: string, selectedAnswer: string) => {
    try {
      const question = questions.find(q => q._id === questionId);
      await axios.post('/exams/save-answer', {
        attemptId,
        questionId,
        selectedAnswer,
        questionText: question?.text,
      });
    } catch (error) {
      console.error('Failed to save answer');
    }
  };

  const autoSubmit = async () => {
    await submitExam(true);
  };

  const submitExam = async (isAutoSubmit = false) => {
    if (submitted) return;
    
    setSubmitted(true);
    
    try {
      const stored = localStorage.getItem('examAttempt');
      let examData: ExamAttempt | null = null;
      try {
        examData = stored ? (JSON.parse(stored) as ExamAttempt) : null;
      } catch (parseError) {
        console.error('Error parsing examAttempt on submit:', parseError);
      }
      
      const currentAttemptId = examData?.attemptId;
      const startTime = examData?.startTime;
      const timeSpent = startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 60000) : 0;

      // Check if it's a temp ID (for testing/backward compatibility)
      if (currentAttemptId && currentAttemptId.startsWith('temp_')) {
        console.log('Temp ID detected, skipping database save');
        toast.success('Exam submitted successfully!');
        localStorage.removeItem('examAttempt');
        localStorage.removeItem('studentInfo');
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        router.push('/student/dashboard');
        return;
      }

      await axios.post('/exams/submit', {
        attemptId: currentAttemptId,
        violations: 0,
        timeSpent,
      });

      localStorage.removeItem('examAttempt');
      localStorage.removeItem('studentInfo');
      
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      
      toast.success(isAutoSubmit ? 'Time\'s up! Exam submitted.' : 'Exam submitted successfully!');
      router.push('/student/dashboard');
    } catch (error: any) {
      console.error('Submit exam error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit exam');
      setSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (answer: string) => {
    if (submitted) return;
    const currentQuestion = questions[currentIndex];
    setAnswers(prev => ({ ...prev, [currentQuestion._id]: answer }));
  };

  const clearAnswer = () => {
    if (submitted) return;
    const currentQuestion = questions[currentIndex];
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentQuestion._id];
      return newAnswers;
    });
  };

  const toggleFlag = () => {
    if (submitted) return;
    const currentQuestion = questions[currentIndex];
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion._id)) {
        newSet.delete(currentQuestion._id);
      } else {
        newSet.add(currentQuestion._id);
      }
      return newSet;
    });
  };

  const goToQuestion = (index: number) => {
    if (submitted) return;
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d3b8e]"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            <img 
              src="https://cte.moe.gov.et/Logo.png"
              alt="MoE Logo" 
              className="w-7 h-7 object-contain"
            />
            <span className="text-lg font-semibold text-[#0d3b8e]">MoEEP</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-5xl">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#0d3b8e] px-6 py-2">
                <h2 className="text-white font-semibold text-lg text-center">Basic Information</h2>
              </div>

              <div className="p-4">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 w-1/3 font-semibold text-gray-700 text-sm">Full Name</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.fullName || 'N/A'}</td>
                          <td className="py-2 w-1/3 font-semibold text-gray-700 text-sm">Institution</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.institution || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 font-semibold text-gray-700 text-sm">Is Blind / Is Deaf</td>
                          <td className="py-2 text-gray-800 text-sm">No / No</td>
                          <td className="py-2 font-semibold text-gray-700 text-sm">Institution ID</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.institutionId || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 font-semibold text-gray-700 text-sm">Exam Center</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.examCentre || 'N/A'}</td>
                          <td className="py-2 font-semibold text-gray-700 text-sm">Enrollment Type</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.enrollmentType || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 font-semibold text-gray-700 text-sm">Department</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.department || 'N/A'}</td>
                          <td className="py-2 font-semibold text-gray-700 text-sm">Gender</td>
                          <td className="py-2 text-gray-800 text-sm">{student?.gender || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`transition-all duration-300 ${showQuizNav ? 'lg:w-2/3' : 'lg:w-full'}`}>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{courseName}</h1>

            <div className="flex gap-4">
              <div className="w-52 flex-shrink-0">
                <div className="bg-[#e5e5e5] rounded-lg p-3 border border-gray-300 shadow-sm">
                  <h2 className="text-md font-bold text-gray-800">Question {currentIndex + 1}</h2>
                  <p className="text-xs text-gray-600 mt-1">Not yet answered</p>
                  <p className="text-xs text-gray-500">Marked out of 1.00</p>
                  
                  <button
                    onClick={toggleFlag}
                    className={`mt-2 text-xs transition flex items-center gap-1 ${
                      flagged.has(currentQuestion._id) 
                        ? 'text-blue-600 font-semibold' 
                        : 'text-blue-500 hover:text-blue-700'
                    }`}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className={`inline-block transition-transform duration-200 ${flagged.has(currentQuestion._id) ? 'rotate-45' : ''}`}
                    >
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    <span>{flagged.has(currentQuestion._id) ? 'Flagged' : 'Flag question'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-end items-center gap-3 mb-3">
                  {showTimer ? (
                    <div className="flex items-center gap-2 border border-red-500 rounded-md px-3 py-1 bg-white">
                      <span className="text-sm text-gray-600">Time left:</span>
                      <span className="text-sm font-mono font-bold text-red-600">{formatTime(timeLeft)}</span>
                      <button
                        onClick={() => setShowTimer(false)}
                        className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                      >
                        Hide
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTimer(true)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Show Timer
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowQuizNav(!showQuizNav)}
                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center shadow-md transition-all"
                    title={showQuizNav ? "Hide Quiz Navigation" : "Show Quiz Navigation"}
                  >
                    <span className="text-gray-700 font-bold text-lg">
                      {showQuizNav ? '→' : '←'}
                    </span>
                  </button>
                </div>

                <div className="bg-green-100 rounded-lg p-6">
                  <div className="mb-5">
                    <p className="text-gray-800 text-base leading-relaxed">{currentQuestion?.text}</p>
                  </div>

                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-start p-2 rounded cursor-pointer transition hover:bg-green-200`}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={answers[currentQuestion?._id] === option}
                          onChange={() => handleAnswer(option)}
                          className="w-3.5 h-3.5 text-green-700 mt-0.5 mr-3"
                        />
                        <span className="text-gray-700 text-sm">
                          {currentQuestion?.options[option as keyof typeof currentQuestion.options]}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={clearAnswer}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Clear my choice
                    </button>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    disabled={currentIndex === 0}
                    className="px-5 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition text-sm"
                  >
                    ← Previous page
                  </button>
                  
                  {currentIndex === questions.length - 1 ? (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      disabled={submitted}
                      className="px-5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition text-sm"
                    >
                      Submit Exam
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      disabled={submitted}
                      className="px-5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition text-sm"
                    >
                      Next page →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showQuizNav && (
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden sticky top-6">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800 text-sm">Quiz navigation</h3>
                </div>
                
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-1.5 max-h-[450px] overflow-y-auto pb-2">
                    {questions.map((q, idx) => {
                      const isAnswered = answers[q._id];
                      const isFlagged = flagged.has(q._id);
                      const isCurrent = currentIndex === idx;
                      
                      return (
                        <div key={q._id} className="relative">
                          <button
                            onClick={() => goToQuestion(idx)}
                            disabled={submitted}
                            className={`
                              w-10 h-10 rounded-md font-semibold text-xs border-2 relative overflow-hidden
                              ${isCurrent ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'}
                              hover:scale-105 hover:shadow-md transition-all bg-white
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {isAnswered && (
                              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gray-800"></div>
                            )}
                            <span className={`relative z-10 ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
                              {idx + 1}
                            </span>
                          </button>
                          {isFlagged && (
                            <div className="absolute -top-1 -right-1 w-4 h-0.5 bg-red-500 rotate-45 origin-center"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && !submitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4">
            <div className="bg-[#0d3b8e] px-6 py-4 rounded-t-lg">
              <h2 className="text-white text-xl font-bold">Submit Examination</h2>
              <p className="text-blue-200 text-sm mt-1">Review all your answers before submitting</p>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const selectedAnswer = answers[q._id];
                  const isFlagged = flagged.has(q._id);
                  
                  return (
                    <div 
                      key={q._id} 
                      className={`flex items-center justify-between py-2 px-3 border rounded-lg ${
                        isFlagged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-700 w-12">Q{idx + 1}</span>
                        <span className="text-gray-600">
                          Answer: <span className="font-semibold text-blue-600">{selectedAnswer || 'Not answered'}</span>
                        </span>
                      </div>
                      {isFlagged && (
                        <span className="text-yellow-600 text-sm flex items-center gap-1">
                          🚩 Flagged
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  Total Questions: <span className="font-semibold text-gray-800">{questions.length}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Answered: <span className="font-semibold text-green-600">{answeredCount}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Not Answered: <span className="font-semibold text-red-600">{unansweredCount}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Flagged: <span className="font-semibold text-yellow-600">{flagged.size}</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ You have {unansweredCount} unanswered question(s). You can still submit, but these questions will be marked incorrect.
                  </p>
                </div>
              )}

              <p className="text-red-600 text-xs mb-4 text-center">
                ⚠️ Once submitted, you cannot return to the exam.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => submitExam(false)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
                >
                  Yes, Submit Exam
                </button>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}