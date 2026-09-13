'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { Plus, Edit, Trash2, Upload, X, Search } from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  code: string;
  level: 'main' | 'sub';
  parentId: string | null;
  children?: Department[];
}

interface Student {
  _id: string;
  username: string;
  fullName: string;
  departmentId: string;
  classId: string;
  departmentName: string;
  className: string;
  enrollmentType: string;
  gender: string;
  blindStatus: string;
  createdAt: string;
}

type Mode = 'single' | 'bulk';

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [mainDepartments, setMainDepartments] = useState<Department[]>([]);
  const [allClasses, setAllClasses] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<Mode>('single');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    blindStatus: 'No',
    enrollmentType: 'Regular',
    gender: 'Male',
  });

  const [bulkText, setBulkText] = useState('');
  const [bulkDefaults, setBulkDefaults] = useState({
    enrollmentType: 'Regular',
    blindStatus: 'No',
  });

  useEffect(() => {
    checkAuth();
    fetchDepartments();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filterDeptId, filterClassId]);

  const checkAuth = async () => {
    try {
      await axios.get('/auth/me');
    } catch {
      router.push('/admin/login');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/departments');
      const data = Array.isArray(res.data) ? res.data : res.data.departments || [];
      setMainDepartments(data);

      const classes: Department[] = [];
      data.forEach((d: Department) => {
        (d.children || []).forEach((c: Department) => classes.push({ ...c, parentId: d._id }));
      });
      setAllClasses(classes);
    } catch (err) {
      console.error('Fetch departments error:', err);
      toast.error('Failed to load departments');
    }
  };

  const fetchStudents = async () => {
    try {
      const params: any = {};
      if (filterClassId) params.classId = filterClassId;
      else if (filterDeptId) params.departmentId = filterDeptId;

      const res = await axios.get('/students', { params });
      setStudents(res.data);
    } catch (err) {
      console.error('Fetch students error:', err);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const classesForDept = (deptId: string) => allClasses.filter((c) => c.parentId === deptId);

  const resetForms = () => {
    setEditingStudent(null);
    setTargetDeptId('');
    setTargetClassId('');
    setFormData({
      username: '',
      password: '',
      fullName: '',
      blindStatus: 'No',
      enrollmentType: 'Regular',
      gender: 'Male',
    });
    setBulkText('');
    setBulkDefaults({ enrollmentType: 'Regular', blindStatus: 'No' });
    setMode('single');
  };

  const openAdd = () => {
    resetForms();
    setShowModal(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setMode('single');
    setTargetDeptId(s.departmentId);
    setTargetClassId(s.classId);
    setFormData({
      username: s.username,
      password: '',
      fullName: s.fullName,
      blindStatus: s.blindStatus || 'No',
      enrollmentType: s.enrollmentType || 'Regular',
      gender: s.gender || 'Male',
    });
    setShowModal(true);
  };

  const submitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeptId || !targetClassId) {
      toast.error('Select department and class');
      return;
    }
    if (!editingStudent && !formData.password) {
      toast.error('Password is required');
      return;
    }

    const payload: any = { ...formData, departmentId: targetDeptId, classId: targetClassId };
    if (editingStudent && !formData.password) delete payload.password;

    try {
      if (editingStudent) {
        await axios.put(`/students/${editingStudent._id}`, payload);
        toast.success('Student updated');
      } else {
        await axios.post('/students', payload);
        toast.success('Student created');
      }
      setShowModal(false);
      resetForms();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const submitBulk = async () => {
    if (!targetDeptId || !targetClassId) {
      toast.error('Select department and class');
      return;
    }
    if (!bulkText.trim()) {
      toast.error('Paste at least one row');
      return;
    }

    // Format: username,password,fullName,gender,enrollmentType,blindStatus
    const lines = bulkText.trim().split(/\r?\n/).filter(Boolean);
    const students: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, i) => {
      const cells = line.split(',').map((c) => c.trim());
      if (cells.length < 4) {
        errors.push(`Row ${i + 1}: needs at least username,password,fullName,gender`);
        return;
      }
      const [username, password, fullName, gender, enrollmentType, blindStatus] = cells;
      students.push({
        username,
        password,
        fullName,
        gender: gender || 'Male',
        enrollmentType: enrollmentType || bulkDefaults.enrollmentType,
        blindStatus: blindStatus || bulkDefaults.blindStatus,
      });
    });

    if (students.length === 0) {
      toast.error('No valid rows. ' + errors.join(' | '));
      return;
    }

    try {
      const res = await axios.post('/students/bulk', {
        departmentId: targetDeptId,
        classId: targetClassId,
        students,
      });
      const { createdCount, failedCount, failed } = res.data;
      if (failedCount > 0) {
        toast.success(`Created ${createdCount}. ${failedCount} failed.`);
        console.warn('Failed rows:', failed);
      } else {
        toast.success(`Created ${createdCount} student(s)`);
      }
      setShowModal(false);
      resetForms();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk upload failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      await axios.delete(`/students/${id}`);
      toast.success('Deleted');
      fetchStudents();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const visibleStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q)
    );
  });

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
          <button onClick={() => router.push('/admin/students')} className="w-full text-left px-6 py-3 bg-gray-800">Students</button>
          <button onClick={() => router.push('/admin/departments')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Departments</button>
          <button onClick={() => router.push('/admin/courses')} className="w-full text-left px-6 py-3 hover:bg-gray-800">Courses</button>
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
            <h1 className="text-3xl font-bold text-gray-800">Students</h1>
            <p className="text-gray-600 mt-1">Add students to a class individually or in bulk</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Add Student
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
            <select value={filterDeptId} onChange={(e) => { setFilterDeptId(e.target.value); setFilterClassId(''); }} className="w-full px-3 py-2 border rounded-lg">
              <option value="">All Departments</option>
              {mainDepartments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
            <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)} disabled={!filterDeptId} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100">
              <option value="">All Classes</option>
              {classesForDept(filterDeptId).map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name or username" className="w-full pl-9 pr-3 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blind</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleStudents.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No students found</td></tr>
                ) : (
                  visibleStudents.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{s.fullName}</td>
                      <td className="px-4 py-3">{s.username}</td>
                      <td className="px-4 py-3">{s.departmentName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.className}</span>
                      </td>
                      <td className="px-4 py-3">{s.gender}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${s.blindStatus === 'Yes' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                          {s.blindStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => { setShowModal(false); resetForms(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <select value={targetDeptId} onChange={(e) => { setTargetDeptId(e.target.value); setTargetClassId(''); }} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Select Department</option>
                  {mainDepartments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class *</label>
                <select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} disabled={!targetDeptId} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" required>
                  <option value="">Select Class</option>
                  {classesForDept(targetDeptId).map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>

            {!editingStudent && (
              <div className="flex gap-2 mb-6 border-b">
                <button onClick={() => setMode('single')} className={`px-4 py-2 font-medium border-b-2 ${mode === 'single' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                  <Plus size={14} className="inline mr-1" /> Single
                </button>
                <button onClick={() => setMode('bulk')} className={`px-4 py-2 font-medium border-b-2 ${mode === 'bulk' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                  <Upload size={14} className="inline mr-1" /> Bulk
                </button>
              </div>
            )}

            {(mode === 'single' || editingStudent) && (
              <form onSubmit={submitSingle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name *</label>
                    <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password {!editingStudent && '*'}</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder={editingStudent ? 'Leave blank to keep current' : ''} required={!editingStudent} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender *</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Enrollment Type</label>
                    <select value={formData.enrollmentType} onChange={(e) => setFormData({ ...formData, enrollmentType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option>Regular</option><option>Distance</option><option>Extension</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Blind Status</label>
                    <select value={formData.blindStatus} onChange={(e) => setFormData({ ...formData, blindStatus: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option>No</option><option>Yes</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    {editingStudent ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowModal(false); resetForms(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </form>
            )}

            {mode === 'bulk' && !editingStudent && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">CSV format (one student per line):</p>
                  <code className="block bg-white rounded p-2 text-xs">
                    username,password,fullName,gender,enrollmentType,blindStatus
                  </code>
                  <p className="mt-1 text-xs">Only username, password, fullName, gender are required. Blanks fall back to defaults below.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Enrollment Type</label>
                    <select value={bulkDefaults.enrollmentType} onChange={(e) => setBulkDefaults({ ...bulkDefaults, enrollmentType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option>Regular</option><option>Distance</option><option>Extension</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Blind Status</label>
                    <select value={bulkDefaults.blindStatus} onChange={(e) => setBulkDefaults({ ...bulkDefaults, blindStatus: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option>No</option><option>Yes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Paste rows</label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder={'john123,pass123,John Doe,Male\njane456,pass456,Jane Smith,Female'}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={submitBulk} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Upload</button>
                  <button type="button" onClick={() => { setShowModal(false); resetForms(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}