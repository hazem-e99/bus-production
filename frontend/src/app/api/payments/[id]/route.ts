import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface Payment {
  id: string;
  studentId: string;
  tripId: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  updatedAt: string;
}

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { payments?: Payment[] };
    
    const payment = (db.payments || []).find((payment: Payment) => payment.id === id);
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(payment);
  } catch (error: unknown) {
    console.error('Error reading payment data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json() as Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>;
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { payments?: Payment[] };
    
    // Ensure payments array exists
    if (!db.payments) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    const paymentIndex = db.payments.findIndex((payment: Payment) => payment.id === id);
    if (paymentIndex === -1) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Update only the provided fields
    db.payments[paymentIndex] = {
      ...db.payments[paymentIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(db.payments[paymentIndex]);
  } catch (error: unknown) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { payments?: Payment[] };
    
    // Ensure payments array exists
    if (!db.payments) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    const paymentIndex = db.payments.findIndex((payment: Payment) => payment.id === id);
    if (paymentIndex === -1) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    db.payments.splice(paymentIndex, 1);
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
