import { NextResponse } from 'next/server';
import { getActionToken } from '@/lib/admin/session';

// يجدد جلسة المدير ويرجعه للصفحة اللي كان فيها
export async function GET(request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/admin';
  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';

  const token = await getActionToken();
  const target = token ? safeNext : '/admin/login';
  return NextResponse.redirect(new URL(target, url.origin), { status: 303 });
}
