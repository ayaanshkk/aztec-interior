// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Support both env var names for backward compatibility
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://aztec-interior.onrender.com';

// ✅ Helper function with timeout for Render cold starts
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - backend is taking too long (likely cold start)');
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('🔄 Proxying login to backend:', { email, backend: BACKEND_URL });
    console.log('⏳ Note: First request may take 30-60s if backend is sleeping...');
    
    // ============================================
    // DIAGNOSTIC: Pre-flight connectivity check
    // Note: Backend has /health endpoint (not /api/health)
    // ============================================
    const diagnosticStart = Date.now();
    let backendReachable = false;
    try {
      const healthCheck = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });
      backendReachable = healthCheck.ok;
      console.log(`🔍 DIAGNOSTIC: Health check completed in ${Date.now() - diagnosticStart}ms, status: ${healthCheck.status}, reachable: ${backendReachable}`);
    } catch (healthError: any) {
      console.error(`🔍 DIAGNOSTIC: Health check FAILED in ${Date.now() - diagnosticStart}ms:`, {
        error: healthError.message,
        code: healthError.cause?.code,
        name: healthError.name,
        backendUrl: BACKEND_URL,
      });
    }
    
    // ✅ Call backend with 60s timeout for cold starts
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      },
      60000 // 60 second timeout for Render cold starts
    );

    console.log('📡 Backend response status:', response.status);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse backend response:', e);
      return NextResponse.json(
        { success: false, error: 'Backend returned invalid response' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.log('❌ Backend login failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Login failed' },
        { status: response.status }
      );
    }

    console.log('✅ Backend login successful');

    return NextResponse.json({
      success: true,
      message: 'Login successful!',
      token: data.token || data.access_token,
      user: data.user,
    }, { status: 200 });

  } catch (error: any) {
    // ============================================
    // DIAGNOSTIC: Detailed error logging
    // ============================================
    console.error('🚨 Login proxy error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      backendUrl: BACKEND_URL,
      timestamp: new Date().toISOString(),
    });
    
    // ✅ Better error messages for different scenarios
    if (error.message.includes('timeout') || error.message.includes('cold start')) {
      console.error('🔍 DIAGNOSTIC: Timeout detected - backend may be sleeping or overloaded');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend is waking up (cold start). Please wait 30 seconds and try again.' 
        },
        { status: 504 } // Gateway Timeout
      );
    }
    
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      console.error('🔍 DIAGNOSTIC: ECONNREFUSED - backend server is not accepting connections');
      
      // Check if using localhost in production
      if (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1')) {
        console.error('🔍 DIAGNOSTIC: CRITICAL - Using localhost backend URL in production!');
        console.error('🔍 DIAGNOSTIC: Fix: Set NEXT_PUBLIC_BACKEND_URL=https://aztec-interior.onrender.com in Vercel environment variables');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Server configuration error. Please contact support.',
            debug: 'BACKEND_URL is set to localhost - this will not work in production'
          },
          { status: 500 }
        );
      }
      
      console.error('🔍 DIAGNOSTIC: Possible causes: 1) Backend is down, 2) DNS resolution failed, 3) Firewall blocking connection');
      return NextResponse.json(
        { success: false, error: 'Backend server is not responding. Please try again in a moment.' },
        { status: 503 }
      );
    }
    
    if (error.message.includes('fetch')) {
      console.error('🔍 DIAGNOSTIC: Fetch failed - network connectivity issue');
      return NextResponse.json(
        { success: false, error: 'Cannot connect to backend. Please check your internet connection.' },
        { status: 503 }
      );
    }
    
    console.error('🔍 DIAGNOSTIC: Unknown error type');
    return NextResponse.json(
      { success: false, error: 'Login failed due to server error. Please try again.' },
      { status: 500 }
    );
  }
}

export const GET = () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });