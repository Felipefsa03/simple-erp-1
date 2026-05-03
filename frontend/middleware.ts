// INFRA-02: Vercel Edge Middleware — Rate limit básico na camada edge
// Protege contra DDoS via proxy Vercel antes de chegar no Render

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limit simples por IP usando Map em memória da edge function
const rateMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 60; // 60 req/min por IP na edge

export function middleware(request: NextRequest) {
  // Apenas proteger rotas de API proxied
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  let entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    rateMap.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests from edge' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Limpar entries antigas periodicamente (a cada 1000 requests)
  if (entry.count % 1000 === 0) {
    for (const [key, val] of rateMap.entries()) {
      if (now > val.resetAt) rateMap.delete(key);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
