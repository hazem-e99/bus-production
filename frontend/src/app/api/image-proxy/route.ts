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

    // Prevent SSRF to localhost
    const decoded = decodeURIComponent(target)
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(decoded)) {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
    }

    const resp = await fetch(decoded, {
      // Avoid caching broken responses for long
      cache: 'no-store',
    })

    if (!resp.ok) {
      return NextResponse.redirect(new URL('/logo2.png', req.url))
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
