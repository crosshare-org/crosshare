import { LRUMap } from 'mnemonist';
import { type NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new LRUMap<string, { count: number; lastReset: number }>(
  1000
);
const limitPerWindow = 100;
const windowMs = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const ipData = rateLimitMap.get(ip);

  if (!ipData) {
    rateLimitMap.set(ip, {
      count: 1,
      lastReset: Date.now(),
    });
    return false;
  }

  if (Date.now() - ipData.lastReset > windowMs) {
    ipData.count = 1;
    ipData.lastReset = Date.now();
    return false;
  }

  if (ipData.count >= limitPerWindow) {
    // Restart the clock on any request
    ipData.lastReset = Date.now();
    return true;
  }

  ipData.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const browser = request.headers.get('user-agent');
  if (browser?.toLowerCase().includes('scrapy')) {
    console.log('blocking', browser);
    return Response.json(
      { success: false, message: 'please stop' },
      { status: 403 }
    );
  }

  const ip = request.headers.get('x-forwarded-for');
  if (ip !== null && isRateLimited(ip)) {
    console.log('blocking', ip);
    return Response.json(
      { success: false, message: 'rate limit' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}
