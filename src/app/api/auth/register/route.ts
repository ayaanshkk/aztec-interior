// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.aztec.techmynt.com';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const { email, password, first_name, last_name, role, phone, department } = userData;
    
    console.log('🔄 Proxying registration to backend:', { email, first_name, last_name });
    
    // ✅ Call your REAL backend register endpoint
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        first_name,
        last_name,
        role,
        phone,
        department
      }),
    });

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
      console.log('❌ Backend registration failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Registration failed' },
        { status: response.status }
      );
    }

    console.log('✅ Backend registration successful');

    // ✅ Return user from backend
    return NextResponse.json({
      success: true,
      message: 'Registration successful!',
      user: data.user,
    }, { status: 200 });

  } catch (error: any) {
    console.error('🚨 Registration proxy error:', error);
    
    // Handle network errors
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, error: 'Cannot connect to backend server. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed due to server error' },
      { status: 500 }
    );
  }
}

// Optional: Block GET
export const GET = () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });