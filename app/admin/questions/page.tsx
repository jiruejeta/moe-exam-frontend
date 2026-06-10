'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { Plus, Edit, Trash2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Question {
  _id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  courseCode: string;
  department: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const questionsPerPage = 10;

  const [formData, setFormData] = useState({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A',
    courseCode: '',
    department: '',
  });

  useEffect(() => {
    checkAuth();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchQuestions();
    }
  }, [selectedCourse]);

  const checkAuth = async () => {
    try {
      await axios.get('/auth/me');
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/courses');
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedCourse(res.data[0].code);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch courses');
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`/questions/course/${selectedCourse}`);
      setQuestions(res.data);
      setCurrentPage(1);
    } catch (error) {
      toast.error('Failed to fetch questions');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await axios.put(`/questions/${editingQuestion._id}`, formData);
        toast.success('Question updated successfully');
      } else {
        await axios.post('/questions', formData);
        toast.success('Question added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkUpload = async () => {
    try {
      const lines = bulkQuestions.split('\n');
      const questions = [];
      
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split('|');
          if (parts.length === 6) {
            questions.push({
              text: parts[0].trim(),
              options: {
                A: parts[1].trim(),
                B: parts[2].trim(),
                C: parts[3].trim(),
                D: parts[4].trim(),
              },
              correctAnswer: parts[5].trim().toUpperCase(),
            });
          }
        }
      }
      
      if (questions.length === 0) {
        toast.error('No valid questions found. Format: Question|A|B|C|D|Answer');
        return;
      }
      
      await axios.post('/questions/bulk', {
        questions,
        courseCode: selectedCourse,
        department: courses.find(c => c.code === selectedCourse)?.department,
      });
      
      toast.success(`${questions.length} questions uploaded successfully`);
      setShowBulkModal(false);
      setBulkQuestions('');
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await axios.delete(`/questions/${id}`);
        toast.success('Question deleted successfully');
        fetchQuestions();
      } catch (error) {
        toast.error('Failed to delete question');
      }
    }
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      courseCode: selectedCourse,
      department: courses.find(c => c.code === selectedCourse)?.department || '',
    });
  };

  const editQuestion = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      courseCode: question.courseCode,
      department: question.department,
    });
    setShowModal(true);
  };

  // Pagination
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = questions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="ml-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6"><h1 className="text-2xl font-bold">Exam Portal</h1><p className="text-sm text-gray-400 mt-1">Admin Panel</p></div>
        <nav className="mt-6">
          <button onClick={() => router.push('/admin/dashboard')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Dashboard</button>
          <button onClick={() => router.push('/admin/students')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Students</button>
          <button onClick={() => router.push('/admin/departments')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Departments</button>
          <button onClick={() => router.push('/admin/courses')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Courses</button>
          <button onClick={() => router.push('/admin/questions')} className="w-full text-left px-6 py-3 bg-gray-800 transition">Questions</button>
          <button onClick={() => router.push('/admin/results')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Results</button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={async () => { await axios.post('/auth/logout'); router.push('/admin/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Questions</h1>
            <p className="text-gray-600 mt-1">Manage exam questions</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { resetForm(); setShowBulkModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <Upload size={20} /> Bulk Upload
            </button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
              <Plus size={20} /> Add Question
            </button>
          </div>
        </div>

        {/* Course Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 w-full md:w-64"
          >
            {courses.map(course => (
              <option key={course._id} value={course.code}>{course.name} ({course.code})</option>
            ))}
          </select>
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentQuestions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No questions found for this course. Click "Add Question" to create one.</td></tr>
                ) : (
                  currentQuestions.map((question, idx) => (
                    <tr key={question._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{indexOfFirstQuestion + idx + 1}</td>
                      <td className="px-6 py-4 max-w-md">
                        <div className="truncate" title={question.text}>{question.text.length > 60 ? question.text.substring(0, 60) + '...' : question.text}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div><span className="font-semibold">A:</span> {question.options.A.substring(0, 30)}...</div>
                          <div><span className="font-semibold">B:</span> {question.options.B.substring(0, 30)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          {question.correctAnswer}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => editQuestion(question)} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
                          <button onClick={() => handleDelete(question._id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 border-t">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronLeft size={20} /></button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronRight size={20} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question Text *</label>
                <textarea value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Option A *</label><input type="text" value={formData.options.A} onChange={(e) => setFormData({ ...formData, options: { ...formData.options, A: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Option B *</label><input type="text" value={formData.options.B} onChange={(e) => setFormData({ ...formData, options: { ...formData.options, B: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Option C *</label><input type="text" value={formData.options.C} onChange={(e) => setFormData({ ...formData, options: { ...formData.options, C: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Option D *</label><input type="text" value={formData.options.D} onChange={(e) => setFormData({ ...formData, options: { ...formData.options, D: e.target.value } })} className="w-full px-3 py-2 border rounded-lg" required /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correct Answer *</label>
                <select value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })} className="px-3 py-2 border rounded-lg">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700">{editingQuestion ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Bulk Upload Questions</h2>
              <button onClick={() => { setShowBulkModal(false); setBulkQuestions(''); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800 font-semibold">Format Instructions:</p>
              <p className="text-sm text-blue-700 mt-1">Each line: Question|Option A|Option B|Option C|Option D|Answer</p>
              <p className="text-sm text-blue-700 mt-1">Example: What is 2+2?|1|2|3|4|C</p>
            </div>
            <textarea value={bulkQuestions} onChange={(e) => setBulkQuestions(e.target.value)} placeholder="Enter questions one per line..." className="w-full px-3 py-2 border rounded-lg" rows={10} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleBulkUpload} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Upload</button>
              <button onClick={() => { setShowBulkModal(false); setBulkQuestions(''); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}