'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';

export default function StudentLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await axios.post(
      '/auth/student/login',
      formData,
      { withCredentials: true }
    );

    toast.success('Login successful!');

    const student = response.data?.student;

    const studentData = {
      fullName: student?.fullName,
      username: student?.username,
      department: student?.department,
      institution: student?.institution,
      institutionId: student?.institutionId,
      examCentre: student?.examCentre,
      enrollmentType: student?.enrollmentType,
      gender: student?.gender,
      blindStatus: student?.blindStatus || 'No',
    };

    localStorage.setItem('studentInfo', JSON.stringify(studentData));
    router.push('/student/dashboard');

  } catch (error: any) {
    console.error(error);
    toast.error(error.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-[400px]">
        <div className="border border-gray-300 rounded-lg p-8 bg-white">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="https://cte.moe.gov.et/Logo.png"
                alt="Ministry of Education - CTE Logo" 
                className="w-[80px] h-[80px] object-contain"
              />
            </div>
            <h1 className="text-[#0d3b8e] text-2xl font-bold">MoE - Exit Exam</h1>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] focus:border-[#0d3b8e] transition outline-none text-base"
                  placeholder="Username"
                  required
                />
              </div>
              
              <div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0d3b8e] focus:border-[#0d3b8e] transition outline-none text-base"
                  placeholder="Password"
                  required
                />
              </div>
              
              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-32 bg-[#0d3b8e] text-white py-2.5 rounded-md hover:bg-blue-900 transition duration-200 font-medium text-base disabled:opacity-50 cursor-pointer"
                >
                  {loading ? '...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}