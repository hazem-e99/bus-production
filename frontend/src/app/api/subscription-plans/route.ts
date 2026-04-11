import { NextRequest, NextResponse } from 'next/server';

function disabled() {
  return NextResponse.json({
    success: false,
    message: 'Subscription plans API is temporarily disabled',
  }, { status: 503 });
}

export async function GET(_req: NextRequest) {
  return disabled();
}

export async function POST(_req: NextRequest) {
  return disabled();
}

export async function PUT(_req: NextRequest) {
  return disabled();
}

export async function PATCH(_req: NextRequest) {
  return disabled();
}

export async function DELETE(_req: NextRequest) {
  return disabled();
}


