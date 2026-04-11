import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  avatar?: string;
  updatedAt?: string;
}

// POST: رفع صورة جديدة للطالب
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPG, PNG, and GIF are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 2MB.' 
      }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `avatar_${studentId}_${timestamp}.${fileExtension}`;
    
    // Create avatars directory if it doesn't exist
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    try {
      await fs.access(avatarsDir);
    } catch {
      await fs.mkdir(avatarsDir, { recursive: true });
    }

    // Save file to public/avatars directory
    const filePath = path.join(avatarsDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Update db.json with new avatar path
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find student index
    const studentIndex = db.users?.findIndex((user: User) => user.id.toString() === studentId);

    if (studentIndex === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update student avatar
    const avatarPath = `/avatars/${filename}`;
    db.users[studentIndex].avatar = avatarPath;
    db.users[studentIndex].updatedAt = new Date().toISOString();

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({
      success: true,
      avatar: avatarPath,
      message: 'Avatar updated successfully'
    });

  } catch {
    console.error('Error uploading avatar:', Error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

// DELETE: حذف صورة الطالب
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Read db.json
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find student
    const studentIndex = db.users?.findIndex((user: User) => user.id.toString() === studentId);

    if (studentIndex === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const currentAvatar = db.users[studentIndex].avatar;

    // Remove avatar file if it exists
    if (currentAvatar && currentAvatar.startsWith('/avatars/')) {
      try {
        const avatarPath = path.join(process.cwd(), 'public', currentAvatar);
        await fs.unlink(avatarPath);
      } catch {
        console.log('Avatar file not found, skipping deletion');
      }
    }

    // Update db.json to remove avatar
    db.users[studentIndex].avatar = null;
    db.users[studentIndex].updatedAt = new Date().toISOString();

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully'
    });

  } catch {
    console.error('Error removing avatar:', Error);
    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}
