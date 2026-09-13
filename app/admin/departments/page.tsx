'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  parentId: string | null;
  level: 'main' | 'sub';
  children?: Department[];
  createdAt: string;
}

type Tab = 'main' | 'sub';

export default function DepartmentsPage() {
  const router = useRouter();

  const [mainDepartments, setMainDepartments] = useState<Department[]>([]);
  const [orphans, setOrphans] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<Tab>('main');

  // Main department modal
  const [showMainModal, setShowMainModal] = useState(false);
  const [editingMain, setEditingMain] = useState<Department | null>(null);
  const [mainForm, setMainForm] = useState({ name: '', code: '', description: '' });

  // Sub department (class) modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Department | null>(null);
  const [subForm, setSubForm] = useState({ name: '', code: '', description: '', parentId: '' });

  useEffect(() => {
    checkAuth();
    fetchDepartments();
  }, []);

  const checkAuth = async () => {
    try {
      await axios.get('/auth/me');
    } catch (error) {
      router.push('/admin/login');
    }
  };

  // ========== FETCH (handles the { departments, orphans } shape) ==========
  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/departments');
      console.log('📋 Raw /departments response:', res.data);

      let departments: Department[] = [];
      let orphaned: Department[] = [];

      if (Array.isArray(res.data)) {
        // Old flat-array shape fallback
        console.warn('⚠️ Old backend shape detected (plain array)');
        departments = res.data;
      } else if (res.data && Array.isArray(res.data.departments)) {
        departments = res.data.departments;
        orphaned = res.data.orphans || [];
      } else {
        console.error('❌ Unexpected /departments response shape:', res.data);
        toast.error('Unexpected response from server');
        return;
      }

      console.log('📋 Main departments:', departments.map(d => ({
        name: d.name,
        level: d.level,
        childCount: d.children?.length || 0,
      })));

      if (orphaned.length > 0) {
        console.warn('⚠️ Orphaned sub-departments:', orphaned);
      }

      setMainDepartments(departments);
      setOrphans(orphaned);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ========== MAIN DEPARTMENT FLOW ==========
  const openAddMain = () => {
    setEditingMain(null);
    setMainForm({ name: '', code: '', description: '' });
    setShowMainModal(true);
  };

  const openEditMain = (dept: Department) => {
    setEditingMain(dept);
    setMainForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowMainModal(true);
  };

  const submitMain = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: mainForm.name.trim(),
      code: mainForm.code.trim().toUpperCase(),
      description: mainForm.description || '',
      level: 'main',
      parentId: null,
    };
    console.log('📤 Submitting MAIN payload:', payload);
    try {
      if (editingMain) {
        await axios.put(`/departments/${editingMain._id}`, payload);
        toast.success('Main department updated');
      } else {
        await axios.post('/departments', payload);
        toast.success('Main department created');
      }
      setShowMainModal(false);
      fetchDepartments();
    } catch (error: any) {
      console.error('Submit main error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  // ========== SUB DEPARTMENT (CLASS) FLOW ==========
  const openAddSub = (presetParentId?: string) => {
    setEditingSub(null);
    setSubForm({ name: '', code: '', description: '', parentId: presetParentId || '' });
    setShowSubModal(true);
  };

  const openEditSub = (dept: Department) => {
    setEditingSub(dept);
    setSubForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      parentId: dept.parentId || '',
    });
    setShowSubModal(true);
  };

  const submitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.parentId) {
      toast.error('Please select a parent department');
      return;
    }
    const payload = {
      name: subForm.name.trim(),
      code: subForm.code.trim().toUpperCase(),
      description: subForm.description || '',
      level: 'sub',
      parentId: subForm.parentId,
    };
    console.log('📤 Submitting SUB payload:', payload);
    try {
      if (editingSub) {
        await axios.put(`/departments/${editingSub._id}`, payload);
        toast.success('Class updated');
      } else {
        await axios.post('/departments', payload);
        toast.success('Class created');
      }
      setShowSubModal(false);
      setExpanded((prev) => new Set(prev).add(subForm.parentId));
      fetchDepartments();
    } catch (error: any) {
      console.error('Submit sub error:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  // ========== DELETE ==========
  const handleDelete = async (dept: Department) => {
    const hasChildren = dept.children && dept.children.length > 0;
    let confirmMessage = `Are you sure you want to delete "${dept.name}"?`;
    if (hasChildren) {
      const childrenNames = dept.children!.map((c) => c.name).join(', ');
      confirmMessage = `"${dept.name}" has ${dept.children!.length} class(es): ${childrenNames}. Delete those first, then this department.`;
    }
    if (!confirm(confirmMessage)) return;

    try {
      const response = await axios.delete(`/departments/${dept._id}`);
      toast.success(response.data.message || 'Deleted successfully');
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const allSubDepartments: Department[] = mainDepartments.flatMap((m) =>
    (m.children || []).map((c) => ({ ...c, _parentName: m.name } as any))
  );

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
          <button onClick={() => router.push('/admin/dashboard')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Dashboard</button>
          <button onClick={() => router.push('/admin/students')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Students</button>
          <button onClick={() => router.push('/admin/departments')} className="w-full text-left px-6 py-3 bg-gray-800 transition">Departments</button>
          <button onClick={() => router.push('/admin/courses')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Courses</button>
          <button onClick={() => router.push('/admin/questions')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Questions</button>
          <button onClick={() => router.push('/admin/results')} className="w-full text-left px-6 py-3 hover:bg-gray-800 transition">Results</button>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button onClick={async () => { await axios.post('/auth/logout'); router.push('/admin/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition">Logout</button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Departments</h1>
          <p className="text-gray-600 mt-1">Manage main departments and their classes independently</p>
        </div>

        {orphans.length > 0 && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4">
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{orphans.length} class(es) have no matching main department</p>
              <p className="text-sm mt-1">
                {orphans.map((o) => o.name).join(', ')} — edit these and re-select a parent department.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'main' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Main Departments ({mainDepartments.length})
          </button>
          <button
            onClick={() => setActiveTab('sub')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'sub' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Classes ({allSubDepartments.length})
          </button>
        </div>

        {/* MAIN DEPARTMENTS TAB */}
        {activeTab === 'main' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={openAddMain} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <Plus size={20} /> Add Main Department
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {mainDepartments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No main departments yet. Click "Add Main Department" to create one.</div>
              ) : (
                mainDepartments.map((dept) => {
                  const isExpanded = expanded.has(dept._id);
                  const hasChildren = dept.children && dept.children.length > 0;
                  return (
                    <div key={dept._id}>
                      <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {hasChildren ? (
                            <button onClick={() => toggleExpand(dept._id)} className="text-gray-500 hover:text-gray-700">
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          ) : (
                            <span className="w-[18px]" />
                          )}
                          <div>
                            <span className="font-medium text-gray-900">{dept.name}</span>
                            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{dept.code}</span>
                            {hasChildren && (
                              <span className="ml-2 text-xs text-gray-500">{dept.children!.length} class(es)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAddSub(dept._id)}
                            className="text-xs px-2 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                            title="Add a class under this department"
                          >
                            + Class
                          </button>
                          <button onClick={() => openEditMain(dept)} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
                          <button onClick={() => handleDelete(dept)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      {isExpanded && hasChildren && (
                        <div>
                          {dept.children!.map((child) => (
                            <div key={child._id} className="flex items-center justify-between py-2 pl-14 pr-4 border-b border-gray-100 bg-gray-50">
                              <div>
                                <span className="text-gray-600">└─ {child.name}</span>
                                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{child.code}</span>
                                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Class</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => openEditSub(child)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(child)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CLASSES TAB */}
        {activeTab === 'sub' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openAddSub()}
                disabled={mainDepartments.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={mainDepartments.length === 0 ? 'Create a main department first' : ''}
              >
                <Plus size={20} /> Add Class
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {allSubDepartments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {mainDepartments.length === 0
                    ? 'Create a main department first, then add classes under it.'
                    : 'No classes yet. Click "Add Class" to create one.'}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-sm text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Parent Department</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubDepartments.map((sub: any) => (
                      <tr key={sub._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{sub.code}</td>
                        <td className="px-4 py-3 text-gray-600">{sub._parentName}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditSub(sub)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(sub)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MAIN DEPARTMENT MODAL */}
      {showMainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">{editingMain ? 'Edit Main Department' : 'Add Main Department'}</h2>
            <form onSubmit={submitMain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department Name *</label>
                <input
                  type="text"
                  value={mainForm.name}
                  onChange={(e) => setMainForm({ ...mainForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Science"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department Code *</label>
                <input
                  type="text"
                  value={mainForm.code}
                  onChange={(e) => setMainForm({ ...mainForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., SCI"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={mainForm.description}
                  onChange={(e) => setMainForm({ ...mainForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingMain ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowMainModal(false)} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASS (SUB DEPARTMENT) MODAL */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">{editingSub ? 'Edit Class' : 'Add Class'}</h2>
            <form onSubmit={submitSub} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Parent Department *</label>
                <select
                  value={subForm.parentId}
                  onChange={(e) => setSubForm({ ...subForm, parentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Parent Department</option>
                  {mainDepartments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class Name *</label>
                <input
                  type="text"
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Grade 9 - Section B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class Code *</label>
                <input
                  type="text"
                  value={subForm.code}
                  onChange={(e) => setSubForm({ ...subForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., G9B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={subForm.description}
                  onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingSub ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowSubModal(false)} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}