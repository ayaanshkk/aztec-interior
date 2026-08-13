// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const { username, password, email } = await request.json();

    const loginUsername = username || email;

    console.log('🔄 Proxying login to backend:', {
      username: loginUsername,
      backend: BACKEND_URL,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: loginUsername,
        password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 Backend response status:', response.status);

    let data;

    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse backend response:', e);

      return NextResponse.json(
        {
          success: false,
          error: 'Backend returned invalid response',
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, {
        status: response.status,
      });
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error: any) {
    console.error('Login proxy error:', error);

    if (error?.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Backend request timed out',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to connect to backend',
        details: error?.message,
      },
      { status: 502 }
    );
  }
}