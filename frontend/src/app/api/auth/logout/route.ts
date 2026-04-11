// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  try {
    // Clear authentication cookies/tokens
    const response = NextResponse.json({ 
      message: "Logged out successfully" 
    });
    
    // Clear any authentication cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
