'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

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

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  examDuration: number;
  examPassword: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Change Password States
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Exam Password States
  const [examPassword, setExamPassword] = useState('');
  const [showExamPasswordInput, setShowExamPasswordInput] = useState(false);

  useEffect(() => {
    const studentInfo = localStorage.getItem('studentInfo');
    
    if (!studentInfo) {
      toast.error('Please login again');
      router.push('/student/login');
      return;
    }
    
    try {
      const parsedStudent = JSON.parse(studentInfo);
      setStudent(parsedStudent);
    } catch (error) {
      console.error('Error parsing student info:', error);
      router.push('/student/login');
      return;
    }
    
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/courses');
      setCourses(res.data);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Change (Frontend only)
  const handleChangePassword = () => {
    if (!passwordData.currentPassword) {
      toast.error('Please enter current password');
      return;
    }
    if (!passwordData.newPassword) {
      toast.error('Please enter new password');
      return;
    }
    if (!passwordData.confirmPassword) {
      toast.error('Please confirm new password');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    
    toast.success('Password changed successfully!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowChangePassword(false);
  };

  // Handle Exam Start - Call backend to get real attempt ID
  const handleStartExam = async () => {
    if (!examPassword) {
      toast.error('Please enter exam password');
      return;
    }
    
    // Check against the selected course's password
    if (examPassword !== selectedCourse?.examPassword) {
      toast.error('Invalid exam password');
      return;
    }
    
    try {
      // Call backend to start the exam and get real attempt ID
      const response = await axios.post('/exams/start', {
        courseCode: selectedCourse.code,
      });
      
      const { attempt, totalQuestions, examDuration } = response.data;
      
      // Save the REAL attemptId from the database (not a temp one)
      localStorage.setItem('examAttempt', JSON.stringify({
        attemptId: attempt._id,  // This is the real MongoDB ObjectId
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        totalQuestions: totalQuestions,
        examDuration: examDuration,
        startTime: new Date().toISOString(),
      }));
      
      toast.success('Exam started! Redirecting...');
      
      // Redirect to the exam page
      router.push(`/student/exams/${selectedCourse.code}`);
    } catch (error: any) {
      console.error('Start exam error:', error);
      toast.error(error.response?.data?.message || 'Failed to start exam');
    }
  };

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowExamPasswordInput(true);
    setExamPassword('');
  };

  const filteredCourses = courses.filter(c => c.department === student?.department);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d3b8e]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Basic Information Card - Right side */}
        <div className="flex justify-end mb-12">
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

        {/* Bottom Section */}
        <div>
          {!selectedCourse ? (
            // Course Selection - Show available courses
            filteredCourses.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-lg">No exams available for your department.</p>
                <p className="text-gray-400 text-sm mt-2">Please contact your administrator.</p>
              </div>
            ) : (
              filteredCourses.map((course) => (
                <div key={course._id} className="mb-6">
                  <h2 className="text-4xl font-bold text-gray-800 mb-6 -ml-6">{course.name}</h2>
                  
                  {/* Centered Buttons */}
                  <div className="flex justify-center items-center gap-8">
                    <div className="relative">
                      <button
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="px-6 py-2 text-gray-700 hover:text-[#0d3b8e] font-medium border-b-2 border-transparent hover:border-[#0d3b8e] transition"
                      >
                        Change Password
                      </button>
                      
                      {/* Change Password Popup */}
                      {showChangePassword && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-5 bg-white rounded-lg border border-gray-200 shadow-xl z-20 w-96">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] focus:border-[#0d3b8e] outline-none"
                              placeholder="Enter current password"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] focus:border-[#0d3b8e] outline-none"
                              placeholder="Enter new password"
                            />
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] focus:border-[#0d3b8e] outline-none"
                              placeholder="Confirm new password"
                            />
                          </div>
                          
                          <button
                            onClick={handleChangePassword}
                            className="w-full bg-[#0d3b8e] text-white py-2 rounded-md hover:bg-blue-900 transition font-medium"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => selectCourse(course)}
                      className="px-6 py-2 bg-[#0d3b8e] text-white rounded-md hover:bg-blue-900 transition"
                    >
                      Select Exam
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            // Exam Password Entry
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-4xl font-bold text-gray-800 -ml-6">{selectedCourse.name}</h2>
                <div className="relative">
                  <button
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="text-sm text-gray-600 hover:text-[#0d3b8e] font-medium"
                  >
                    Change Password
                  </button>
                  {showChangePassword && (
                    <div className="absolute right-0 mt-2 p-5 bg-white rounded-lg border border-gray-200 shadow-xl z-20 w-96">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] outline-none"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] outline-none"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] outline-none"
                        />
                      </div>
                      <button
                        onClick={handleChangePassword}
                        className="w-full bg-[#0d3b8e] text-white py-2 rounded-md hover:bg-blue-900 font-medium"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <p className="text-gray-700 mb-4">Enter exam password to continue:</p>
                <input
                  type="password"
                  placeholder="Exam Password"
                  value={examPassword}
                  onChange={(e) => setExamPassword(e.target.value)}
                  className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleStartExam}
                    className="px-6 py-2 bg-[#0d3b8e] text-white rounded-md hover:bg-blue-900 transition"
                  >
                    Start Exam
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setShowExamPasswordInput(false);
                      setExamPassword('');
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}