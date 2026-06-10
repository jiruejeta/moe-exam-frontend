'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { Download, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Result {
  _id: string;
  studentName: string;
  studentUsername: string;
  department: string;
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
  const [filteredResults, setFilteredResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const resultsPerPage = 10;

  useEffect(() => {
    checkAuth();
    fetchResults();
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterResults();
  }, [searchTerm, selectedDepartment, results]);

  const checkAuth = async () => {
    try {
      await axios.get('/auth/me');
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchResults = async () => {
    try {
      const res = await axios.get('/results');
      setResults(res.data);
      setFilteredResults(res.data);
    } catch (error) {
      toast.error('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/departments');
      setDepartments(res.data.map((d: any) => d.name));
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const filterResults = () => {
    let filtered = [...results];
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedDepartment) {
      filtered = filtered.filter(r => r.department === selectedDepartment);
    }
    
    setFilteredResults(filtered);
    setCurrentPage(1);
  };

  const exportToCSV = async () => {
    try {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/results/export/csv`, '_blank');
      toast.success('Export started');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-blue-600 bg-blue-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Pagination
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = filteredResults.slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);

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
          <button onClick={() => router.push('/admin/questions')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Questions</button>
          <button onClick={() => router.push('/admin/results')} className="w-full text-left px-6 py-3 bg-gray-800 transition">Results</button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={async () => { await axios.post('/auth/logout'); router.push('/admin/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition">Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Results</h1>
            <p className="text-gray-600 mt-1">View and export exam results</p>
          </div>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            <Download size={20} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search by student name, username, or course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500">
                <option value="">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-500">Total Exams Taken</p><p className="text-2xl font-bold">{filteredResults.length}</p></div>
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-500">Average Score</p><p className="text-2xl font-bold">{filteredResults.length ? Math.round(filteredResults.reduce((a,b) => a + b.percentage, 0) / filteredResults.length) : 0}%</p></div>
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-500">Pass Rate (&gt;50%)</p><p className="text-2xl font-bold">{filteredResults.length ? Math.round((filteredResults.filter(r => r.percentage >= 50).length / filteredResults.length) * 100) : 0}%</p></div>
          <div className="bg-white rounded-lg shadow-md p-4"><p className="text-sm text-gray-500">Total Violations</p><p className="text-2xl font-bold">{filteredResults.reduce((a,b) => a + (b.violations || 0), 0)}</p></div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentResults.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No results found</td></tr>
                ) : (
                  currentResults.map((result) => (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{result.studentName}</div>
                        <div className="text-sm text-gray-500">{result.studentUsername}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{result.courseName}</div>
                        <div className="text-sm text-gray-500">{result.courseCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.score}/{result.totalQuestions}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPercentageColor(result.percentage)}`}>
                          {result.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.timeSpent} min</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${result.violations > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {result.violations || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(result.completedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => setSelectedResult(result)} className="text-blue-600 hover:text-blue-800"><Eye size={18} /></button>
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

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Result Details</h2>
              <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div><p className="text-sm text-gray-500">Student Name</p><p className="font-semibold">{selectedResult.studentName}</p></div>
              <div><p className="text-sm text-gray-500">Username</p><p className="font-semibold">{selectedResult.studentUsername}</p></div>
              <div><p className="text-sm text-gray-500">Course</p><p className="font-semibold">{selectedResult.courseName} ({selectedResult.courseCode})</p></div>
              <div><p className="text-sm text-gray-500">Department</p><p className="font-semibold">{selectedResult.department}</p></div>
              <div className="border-t pt-3"><p className="text-sm text-gray-500">Score</p><p className="text-2xl font-bold">{selectedResult.score}/{selectedResult.totalQuestions}</p></div>
              <div><p className="text-sm text-gray-500">Percentage</p><p className="text-xl font-semibold text-blue-600">{selectedResult.percentage.toFixed(1)}%</p></div>
              <div><p className="text-sm text-gray-500">Correct / Incorrect</p><p>{selectedResult.correctAnswers} / {selectedResult.incorrectAnswers}</p></div>
              <div><p className="text-sm text-gray-500">Time Spent</p><p>{selectedResult.timeSpent} minutes</p></div>
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