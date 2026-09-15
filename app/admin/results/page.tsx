'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import {
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

interface Result {
  _id: string;
  studentName: string;
  studentUsername: string;
  department: string;
  className: string;
  courseCode: string;
  courseName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  violations: number;
  completedAt: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [filtered, setFiltered] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Dropdown sources
  const [departments, setDepartments] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [courses, setCourses] = useState<{ code: string; name: string }[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const resultsPerPage = 10;

  useEffect(() => {
    checkAuth();
    fetchResults();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedDepartment, selectedClass, selectedCourse, results]);

  const checkAuth = async () => {
    try {
      await axios.get('/auth/me');
    } catch {
      router.push('/admin/login');
    }
  };

  const fetchResults = async () => {
    try {
      const res = await axios.get('/results');
      setResults(res.data);
      setFiltered(res.data);

      const depts = Array.from(
        new Set(res.data.map((r: Result) => r.department).filter(Boolean))
      ) as string[];
      const cls = Array.from(
        new Set(res.data.map((r: Result) => r.className).filter(Boolean))
      ) as string[];

      // Courses: unique by courseCode, keep one name
      const courseMap = new Map<string, string>();
      res.data.forEach((r: Result) => {
        if (r.courseCode) courseMap.set(r.courseCode, r.courseName || r.courseCode);
      });
      const courseList = Array.from(courseMap.entries()).map(([code, name]) => ({
        code,
        name,
      }));

      setDepartments(depts);
      setClasses(cls);
      setCourses(courseList);
    } catch {
      toast.error('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...results];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(q) ||
          r.studentUsername?.toLowerCase().includes(q) ||
          r.courseName?.toLowerCase().includes(q)
      );
    }
    if (selectedDepartment)
      list = list.filter((r) => r.department === selectedDepartment);
    if (selectedClass) list = list.filter((r) => r.className === selectedClass);
    if (selectedCourse) list = list.filter((r) => r.courseCode === selectedCourse);

    setFiltered(list);
    setCurrentPage(1);
  };

  // =========================================================
  // Server-side Excel export
  // mode: 'by-course' | 'by-class' | 'flat'
  // Passes department, className, courseCode so the server can
  // build the exact Department → Class → Course hierarchy.
  // =========================================================
  const exportFromServer = async (
    mode: 'by-course' | 'by-class' | 'flat' = 'by-course'
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('mode', mode);
      if (selectedDepartment) params.set('department', selectedDepartment);
      if (selectedClass) params.set('className', selectedClass);
      if (selectedCourse) params.set('courseCode', selectedCourse);

      const res = await axios.get(
        `/results/export/excel?${params.toString()}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel file downloaded');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Export failed');
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-blue-600 bg-blue-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const indexOfLast = currentPage * resultsPerPage;
  const indexOfFirst = indexOfLast - resultsPerPage;
  const current = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / resultsPerPage);

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
          <button onClick={() => router.push('/admin/courses')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Courses</button>
          <button onClick={() => router.push('/admin/questions')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Questions</button>
          <button onClick={() => router.push('/admin/results')} className="w-full text-left px-6 py-3 bg-gray-800">Results</button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={async () => { await axios.post('/auth/logout'); router.push('/admin/login'); }} className="w-full px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700">Logout</button>
        </div>
      </div>

      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Results</h1>
            <p className="text-gray-600 mt-1">
              Filter by Department → Class → Course, then export the exact view
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportFromServer('by-course')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              title="One sheet per course"
            >
              <FileSpreadsheet size={18} /> Export by Course
            </button>
            <button
              onClick={() => exportFromServer('by-class')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              title="One sheet per class"
            >
              <FileSpreadsheet size={18} /> Export by Class
            </button>
            <button
              onClick={() => exportFromServer('flat')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title="Single grouped sheet"
            >
              <Download size={18} /> Export All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, username, or course"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => { setSelectedDepartment(e.target.value); setSelectedClass(''); }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Total Exams Taken</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-2xl font-bold">
              {filtered.length ? Math.round(filtered.reduce((a, b) => a + b.percentage, 0) / filtered.length) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Pass Rate (&gt;50%)</p>
            <p className="text-2xl font-bold">
              {filtered.length
                ? Math.round((filtered.filter((r) => r.percentage >= 50).length / filtered.length) * 100)
                : 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Total Violations</p>
            <p className="text-2xl font-bold">{filtered.reduce((a, b) => a + (b.violations || 0), 0)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {current.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No results found</td></tr>
                ) : (
                  current.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.studentName}</div>
                        <div className="text-xs text-gray-500">{r.studentUsername}</div>
                      </td>
                      <td className="px-4 py-3">{r.department}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{r.className || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.courseName}</div>
                        <div className="text-xs text-gray-500">{r.courseCode}</div>
                      </td>
                      <td className="px-4 py-3">{r.score}/{r.totalQuestions}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPercentageColor(r.percentage)}`}>
                          {r.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.timeSpent || 0} min</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${r.violations > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {r.violations || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(r.completedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedResult(r)} className="text-blue-600 hover:text-blue-800"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 border-t">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronLeft size={20} /></button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100"><ChevronRight size={20} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Result Details</h2>
              <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div><p className="text-sm text-gray-500">Student</p><p className="font-semibold">{selectedResult.studentName}</p></div>
              <div><p className="text-sm text-gray-500">Username</p><p className="font-semibold">{selectedResult.studentUsername}</p></div>
              <div><p className="text-sm text-gray-500">Department</p><p className="font-semibold">{selectedResult.department}</p></div>
              <div><p className="text-sm text-gray-500">Class</p><p className="font-semibold">{selectedResult.className || '—'}</p></div>
              <div><p className="text-sm text-gray-500">Course</p><p className="font-semibold">{selectedResult.courseName} ({selectedResult.courseCode})</p></div>
              <div className="border-t pt-3"><p className="text-sm text-gray-500">Score</p><p className="text-2xl font-bold">{selectedResult.score}/{selectedResult.totalQuestions}</p></div>
              <div><p className="text-sm text-gray-500">Percentage</p><p className="text-xl font-semibold text-blue-600">{selectedResult.percentage.toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-500">Correct / Incorrect</p><p>{selectedResult.correctAnswers} / {selectedResult.incorrectAnswers}</p></div>
              <div><p className="text-sm text-gray-500">Time Spent</p><p>{selectedResult.timeSpent || 0} minutes</p></div>
              <div><p className="text-sm text-gray-500">Violations</p><p className={selectedResult.violations > 0 ? 'text-red-600' : 'text-green-600'}>{selectedResult.violations || 0}</p></div>
              <div><p className="text-sm text-gray-500">Completed On</p><p>{new Date(selectedResult.completedAt).toLocaleString()}</p></div>
            </div>
            <button onClick={() => setSelectedResult(null)} className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}