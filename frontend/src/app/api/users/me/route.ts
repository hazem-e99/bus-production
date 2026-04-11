import { NextResponse } from 'next/server';

// Server-side cannot access localStorage. We read user from a cookie 'user' (JSON-serialized)
// which our demo app can set on login in the future. If cookie not found, return 401.
export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )user=([^;]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const raw = decodeURIComponent(match[1]);
    const user = JSON.parse(raw);
    return NextResponse.json(user);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as any)?.message || 'Failed' }, { status: 500 });
  }
}


