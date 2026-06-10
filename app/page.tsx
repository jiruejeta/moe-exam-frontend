'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.user.role === 'admin') {
            router.push('/admin/dashboard');
          } else if (data.user.role === 'student') {
            router.push('/student/dashboard');
          } else {
            router.push('/student/login');
          }
        } else {
          // No active session, show selection page
          setChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setChecking(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  // Show login selection page
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://cte.moe.gov.et/Logo.png"
            alt="MoE Logo" 
            className="w-24 h-24 mx-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-[#0d3b8e] mt-4">MoE Exit Exam Portal</h1>
          <p className="text-gray-500 mt-2">Please select your login type</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => router.push('/student/login')}
            className="w-64 px-6 py-3 bg-[#0d3b8e] text-white rounded-lg hover:bg-blue-900 transition block mx-auto"
          >
            Student Login
          </button>
          <button
            onClick={() => router.push('/admin/login')}
            className="w-64 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition block mx-auto"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}