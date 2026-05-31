import { NextRequest, NextResponse } from 'next/server'

// Simple image proxy to reliably serve remote avatars through the same origin
// Usage: /api/image-proxy?url=https%3A%2F%2Fhost%2Fpath.jpg
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('url')
    if (!target) {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
    }

    const decoded = decodeURIComponent(target)
    let targetUrl: URL;
    try {
      targetUrl = new URL(decoded);
    } catch {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
    }

    // Resolve allowed backend hostname from environment variables
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:7126/api';
    let allowedBackendHost = 'localhost';
    try {
      allowedBackendHost = new URL(backendBaseUrl).hostname;
    } catch {}

    // Allow requests only to backend, localhost, or 127.0.0.1 for safety
    const isAllowedHost = 
      targetUrl.hostname === allowedBackendHost ||
      targetUrl.hostname === 'localhost' ||
      targetUrl.hostname === '127.0.0.1';

    if (!isAllowedHost) {
      return NextResponse.json({ error: 'Forbidden host' }, { status: 403 })
    }

    const resp = await fetch(decoded, {
      // Avoid caching broken responses for long
      cache: 'no-store',
    })

    if (!resp.ok) {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
    }

    // Validate Content-Length before downloading (limit to 5MB)
    const contentLength = Number(resp.headers.get('content-length') || 0);
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    // Copy content type and stream body
    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await resp.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Short cache to reduce refetching while allowing updates
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.redirect(new URL('/logo2.png', req.url))
  }
}
