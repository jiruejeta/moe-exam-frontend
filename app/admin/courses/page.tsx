'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { Plus, Edit, Trash2, Eye, X } from 'lucide-react';

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  departmentId: string;
  examDuration: number;
  examCodes: string[];
  examPassword: string;
  createdAt: string;
}

interface Department {
  _id: string;
  name: string;
  code: string;
  level: 'main' | 'sub';
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showCodes, setShowCodes] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    examDuration: 60,
    examPassword: 'EXAM123',
  });

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/courses');
      setCourses(res.data);
    } catch (error) {
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/departments');
      const data = Array.isArray(res.data) ? res.data : res.data.departments || [];
      // Only main departments
      setDepartments(
        data
          .filter((d: Department) => d.level === 'main')
          .map((d: Department) => ({ _id: d._id, name: d.name, code: d.code, level: 'main' }))
      );
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.departmentId) {
      toast.error('Select a main department');
      return;
    }
    try {
      if (editingCourse) {
        await axios.put(`/courses/${editingCourse._id}`, formData);
        toast.success('Course updated');
      } else {
        const res = await axios.post('/courses', formData);
        toast.success(`Course created! Exam password: ${res.data.examPassword}`);
      }
      setShowModal(false);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this course?')) {
      try {
        await axios.delete(`/courses/${id}`);
        toast.success('Course deleted');
        fetchCourses();
      } catch {
        toast.error('Failed to delete');
      }
    }
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      code: '',
      departmentId: '',
      examDuration: 60,
      examPassword: 'EXAM123',
    });
  };

  const editCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      departmentId: course.departmentId || '',
      examDuration: course.examDuration,
      examPassword: course.examPassword || 'EXAM123',
    });
    setShowModal(true);
  };

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
          <button onClick={() => router.push('/admin/dashboard')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Dashboard</button>
          <button onClick={() => router.push('/admin/students')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Students</button>
          <button onClick={() => router.push('/admin/departments')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Departments</button>
          <button onClick={() => router.push('/admin/courses')} className="w-full text-left px-6 py-3 bg-gray-800">Courses</button>
          <button onClick={() => router.push('/admin/questions')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Questions</button>
          <button onClick={() => router.push('/admin/results')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Results</button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={async () => { await axios.post('/auth/logout'); router.push('/admin/login'); }} className="w-full px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700">Logout</button>
        </div>
      </div>

      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Courses</h1>
            <p className="text-gray-600 mt-1">Courses belong to a main department — every class under it shares the same course.</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus size={20} /> Add Course
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            No courses yet. Click "Add Course" to create one.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg">
                <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4">
                  <h3 className="text-lg font-bold text-white">{course.name}</h3>
                  <p className="text-purple-200 text-sm">Code: {course.code}</p>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-gray-600"><span className="font-semibold">Department:</span> {course.department}</p>
                  <p className="text-sm text-gray-600"><span className="font-semibold">Duration:</span> {course.examDuration} min</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Exam Password:</span>
                    <button onClick={() => setShowPassword(showPassword === course._id ? null : course._id)} className="ml-2 text-blue-600 hover:underline">
                      {showPassword === course._id ? 'Hide' : 'Show'}
                    </button>
                    {showPassword === course._id && <span className="ml-2 font-mono text-green-600">{course.examPassword}</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Exam Codes:</span>
                    <button onClick={() => setShowCodes(showCodes === course._id ? null : course._id)} className="ml-2 text-blue-600 hover:underline">
                      {showCodes === course._id ? 'Hide' : 'Show'}
                    </button>
                  </p>
                  {showCodes === course._id && (
                    <div className="bg-gray-50 p-2 rounded">
                      {course.examCodes.map((c, i) => <p key={i} className="text-xs font-mono">{c}</p>)}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <button onClick={() => editCourse(course)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"><Edit size={14} /> Edit</button>
                    <button onClick={() => handleDelete(course._id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingCourse ? 'Edit Course' : 'Add Course'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Code *</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department (Main) *</label>
                <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">All classes under this department share this course.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exam Duration (minutes) *</label>
                <input type="number" value={formData.examDuration} onChange={(e) => setFormData({ ...formData, examDuration: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" min="1" max="180" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exam Password *</label>
                <input type="text" value={formData.examPassword} onChange={(e) => setFormData({ ...formData, examPassword: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">{editingCourse ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}