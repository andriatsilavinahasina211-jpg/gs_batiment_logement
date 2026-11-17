import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccess } from './src/lib/permissions';

const VIEW_TO_MODULE: Record<string, string> = {
  biens: 'biens',
  occupants: 'occupants',
  occupations: 'occupations',
  liberations: 'liberations',
  bail: 'bail',
  demandes: 'demandes',
  attestations: 'attestations',
  recensement: 'recensement',
  travaux: 'travaux',
  notifications: 'notifications',
  'pieces-jointes': 'pieces-jointes',
  audit: 'audit',
  ia: 'ia',
  users: 'users',
};

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  const { pathname, searchParams } = request.nextUrl;

  // 1. Protection des routes Dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérification des privilèges par module si spécifié dans l'URL
    const view = searchParams.get('view');
    if (view && VIEW_TO_MODULE[view] && userRole) {
      const moduleKey = VIEW_TO_MODULE[view];
      if (!canAccess(userRole, moduleKey)) {
        const forbiddenUrl = new URL('/dashboard?error=forbidden', request.url);
        return NextResponse.redirect(forbiddenUrl);
      }
    }
  }

  // 2. Si l'utilisateur est déjà connecté et visite la page de connexion
  if (pathname === '/login' || pathname === '/') {
    if (token) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
};
