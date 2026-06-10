'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  examDuration: number;
}

export default function AvailableExams() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const studentInfo = localStorage.getItem('studentInfo');
    if (!studentInfo) {
      router.push('/student/login');
      return;
    }
    setStudent(JSON.parse(studentInfo));
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/courses');
      setCourses(res.data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const startExam = (course: Course) => {
    setSelectedCourse(course);
    setShowConfirm(true);
  };

  const confirmStartExam = async () => {
    if (!selectedCourse) return;
    
    try {
      const res = await axios.post('/exams/start', {
        courseCode: selectedCourse.code,
      });
      
      const { attempt, totalQuestions, examDuration } = res.data;
      
      localStorage.setItem('examAttempt', JSON.stringify({
        attemptId: attempt._id,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        totalQuestions,
        examDuration,
        startTime: new Date().toISOString(),
      }));
      
      // FIXED: Changed from '/student/exam/' to '/student/exams/'
      router.push(`/student/exams/${selectedCourse.code}`);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start exam');
    }
    setShowConfirm(false);
  };

  const filteredCourses = courses.filter(c => c.department === student?.department);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Available Examinations</h1>
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{student?.fullName}</span> | Department: {student?.department}
          </p>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No exams available for your department.</p>
            <p className="text-gray-400 text-sm mt-2">Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredCourses.map((course) => (
              <div key={course._id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <h3 className="text-xl font-bold text-white">{course.name}</h3>
                  <p className="text-blue-100 text-sm">Code: {course.code}</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{course.examDuration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>100 Questions</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startExam(course)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Start Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <div className="inline-block p-3 bg-yellow-100 rounded-full mb-3">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Confirm Exam Start</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Course: <strong>{selectedCourse.name}</strong>
            </p>
            <p className="text-gray-600 mb-2">
              Duration: <strong>{selectedCourse.examDuration} minutes</strong>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">
                ⚠️ Important Rules:
              </p>
              <ul className="text-red-600 text-xs mt-2 space-y-1">
                <li>• The exam will be in fullscreen mode</li>
                <li>• Leaving fullscreen will be counted as a violation</li>
                <li>• Tab switching is strictly prohibited</li>
                <li>• Copy/Paste is disabled</li>
                <li>• After 3 violations, exam will auto-submit</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmStartExam}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                I Understand, Start Exam
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}