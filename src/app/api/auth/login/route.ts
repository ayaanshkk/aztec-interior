// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aztec-interior.onrender.com';

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
    console.error('🚨 Login proxy error:', error);
    
    // ✅ Better error messages for different scenarios
    if (error.message.includes('timeout') || error.message.includes('cold start')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend is waking up (cold start). Please wait 30 seconds and try again.' 
        },
        { status: 504 } // Gateway Timeout
      );
    }
    
    if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { success: false, error: 'Backend server is not responding. Please try again in a moment.' },
        { status: 503 }
      );
    }
    
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect to backend. Please check your internet connection.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Login failed due to server error. Please try again.' },
      { status: 500 }
    );
  }
}

export const GET = () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });