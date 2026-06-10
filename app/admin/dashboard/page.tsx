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
  ChevronRight
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

  useEffect(() => {
    fetchStats();
    checkAuth();
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
      const [students, departments, courses, questions, results] = await Promise.all([
        axios.get('/students'),
        axios.get('/departments'),
        axios.get('/courses'),
        axios.get('/questions/course/ALL'),
        axios.get('/results'),
      ]);
      
      setStats({
        totalStudents: students.data.length,
        totalDepartments: departments.data.length,
        totalCourses: courses.data.length,
        totalQuestions: questions.data.length || 0,
        totalResults: results.data.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats');
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Exam Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-800 transition group"
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span>{item.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count > 0 && (
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                    {item.count}
                  </span>
                )}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
              </div>
            </button>
          ))}
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

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/admin/students')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Users className="mx-auto mb-2 text-blue-500" size={32} />
              <p className="font-semibold">Add New Student</p>
              <p className="text-sm text-gray-500">Register students manually</p>
            </button>
            <button
              onClick={() => router.push('/admin/questions')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition"
            >
              <HelpCircle className="mx-auto mb-2 text-yellow-500" size={32} />
              <p className="font-semibold">Upload Questions</p>
              <p className="text-sm text-gray-500">Add exam questions in bulk</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}