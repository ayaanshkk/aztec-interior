// CREATE THIS FILE: src/app/auth-status/page.tsx
// This page has NO ProtectedRoute wrapper - pure diagnostic

"use client";

import { useEffect, useState } from "react";

export default function AuthStatusPage() {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    // Check localStorage directly
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    setStatus({
      hasToken: !!token,
      hasUser: !!user,
      tokenLength: token?.length || 0,
      user: user,
      timestamp: new Date().toISOString(),
    });

    console.log("🔍 Auth Status Page - Raw State:", {
      token: token?.substring(0, 50) + "...",
      user,
    });
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auth Status (Raw)</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <h2 className="text-xl font-semibold mb-4">LocalStorage State</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = "/login"}
              className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.href = "/dashboard/default"}
              className="px-4 py-2 bg-green-500 text-white rounded mr-2"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                alert("Cleared! Reload page.");
              }}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Clear All & Reset
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-2">Diagnosis:</h3>
          {status.hasToken && status.hasUser ? (
            <p className="text-green-600">✅ You have valid auth data in localStorage. If dashboard still redirects, the problem is in ProtectedRoute or AuthContext.</p>
          ) : (
            <p className="text-red-600">❌ No auth data found. Login is not saving properly.</p>
          )}
        </div>
      </div>
    </div>
  );
}