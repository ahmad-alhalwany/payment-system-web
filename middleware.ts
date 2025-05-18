import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const directorRoutes = [
  '/dashboard/director',
  '/dashboard/branches',
  '/dashboard/employees',
  '/dashboard/reports',
];
const branchManagerRoutes = [
  '/branch-dashboard',
  // أضف مسارات مدير الفرع هنا
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // حماية صفحات المدير
  if (directorRoutes.some(route => pathname.startsWith(route))) {
    if (!token || userRole !== 'director') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  // حماية صفحات مدير الفرع
  if (branchManagerRoutes.some(route => pathname.startsWith(route))) {
    if (!token || userRole !== 'branch_manager') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/branch-dashboard/:path*',
  ],
}; 