// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('🔄 Proxying login to backend:', { email, backend: BACKEND_URL });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for localhost
    
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('📡 Backend response status:', response.status);

    if (response.status === 502 || response.status === 503) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend server is not responding. Make sure Flask is running on port 5000.' 
        },
        { status: 502 }
      );
    }

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
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request timeout. Is Flask running on port 5000?' },
        { status: 504 }
      );
    }
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect to Flask backend. Start it with: python run.py' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Login failed due to server error' },
      { status: 500 }
    );
  }
}

export const GET = () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });