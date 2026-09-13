'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { 
  Users, 
  BookOpen, 
  Building2, 
  HelpCircle, 
  BarChart3, 
  LogOut,
  ChevronRight,
  UserPlus,
  FileQuestion
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalDepartments: number;
  totalCourses: number;
  totalQuestions: number;
  totalResults: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalDepartments: 0,
    totalCourses: 0,
    totalQuestions: 0,
    totalResults: 0,
  });
  const [adminName, setAdminName] = useState('Admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/auth/me');
      setAdminName(res.data.user.username);
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch students
      const studentsRes = await axios.get('/students');
      const students = studentsRes.data;
      
      // Fetch departments - handle hierarchical data
      const deptRes = await axios.get('/departments');
      let departments = deptRes.data;
      
      // Count all departments (including sub-departments)
      let totalDepartments = 0;
      const countAll = (depts: any[]) => {
        depts.forEach((d: any) => {
          totalDepartments++;
          if (d.children) {
            countAll(d.children);
          }
        });
      };
      countAll(departments);
      
      // Fetch courses
      const coursesRes = await axios.get('/courses');
      
      // Fetch questions
      const questionsRes = await axios.get('/questions/course/ALL');
      
      // Fetch results
      const resultsRes = await axios.get('/results');
      
      setStats({
        totalStudents: students.length || 0,
        totalDepartments: totalDepartments || 0,
        totalCourses: coursesRes.data.length || 0,
        totalQuestions: questionsRes.data.length || 0,
        totalResults: resultsRes.data.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Set default values to prevent UI errors
      setStats({
        totalStudents: 0,
        totalDepartments: 0,
        totalCourses: 0,
        totalQuestions: 0,
        totalResults: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      router.push('/admin/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const menuItems = [
    { title: 'Students', icon: Users, href: '/admin/students', color: 'bg-blue-500', count: stats.totalStudents },
    { title: 'Departments', icon: Building2, href: '/admin/departments', color: 'bg-green-500', count: stats.totalDepartments },
    { title: 'Courses', icon: BookOpen, href: '/admin/courses', color: 'bg-purple-500', count: stats.totalCourses },
    { title: 'Questions', icon: HelpCircle, href: '/admin/questions', color: 'bg-yellow-500', count: stats.totalQuestions },
    { title: 'Results', icon: BarChart3, href: '/admin/results', color: 'bg-red-500', count: stats.totalResults },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="ml-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Exam Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
        </div>
        
        <nav className="mt-6">
          <button 
            onClick={() => router.push('/admin/dashboard')} 
            className="w-full text-left px-6 py-3 bg-gray-800 transition flex items-center gap-3"
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => router.push('/admin/students')} 
            className="w-full text-left px-6 py-3 hover:bg-gray-800 transition flex items-center gap-3"
          >
            <Users size={20} />
            Students
          </button>
          <button 
            onClick={() => router.push('/admin/departments')} 
            className="w-full text-left px-6 py-3 hover:bg-gray-800 transition flex items-center gap-3"
          >
            <Building2 size={20} />
            Departments
          </button>
          <button 
            onClick={() => router.push('/admin/courses')} 
            className="w-full text-left px-6 py-3 hover:bg-gray-800 transition flex items-center gap-3"
          >
            <BookOpen size={20} />
            Courses
          </button>
          <button 
            onClick={() => router.push('/admin/questions')} 
            className="w-full text-left px-6 py-3 hover:bg-gray-800 transition flex items-center gap-3"
          >
            <HelpCircle size={20} />
            Questions
          </button>
          <button 
            onClick={() => router.push('/admin/results')} 
            className="w-full text-left px-6 py-3 hover:bg-gray-800 transition flex items-center gap-3"
          >
            <BarChart3 size={20} />
            Results
          </button>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {adminName}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {menuItems.map((item) => (
            <div
              key={item.title}
              onClick={() => router.push(item.href)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <item.icon size={24} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{item.count}</p>
              <p className="text-gray-600 text-sm">{item.title}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/admin/students')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <UserPlus className="mx-auto mb-2 text-blue-500" size={32} />
              <p className="font-semibold text-gray-800">Add New Student</p>
              <p className="text-sm text-gray-500">Register students manually</p>
            </button>
            <button
              onClick={() => router.push('/admin/questions')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition"
            >
              <FileQuestion className="mx-auto mb-2 text-yellow-500" size={32} />
              <p className="font-semibold text-gray-800">Upload Questions</p>
              <p className="text-sm text-gray-500">Add exam questions in bulk</p>
            </button>
          </div>
        </div>

        {/* Recent Activity (Optional) */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Total Departments</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalDepartments}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCourses}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Questions Available</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}