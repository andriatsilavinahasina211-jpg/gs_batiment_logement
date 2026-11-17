export type UserRole = 'ADMINISTRATEUR' | 'CHEF_SRB' | 'AGENT';

export interface AuthUser {
  id: number;
  matricule?: string | null;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole | string;
  avatar?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

// Set cookie helper with expiration and secure options
function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// Delete cookie helper
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Get cookie helper
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return matches && matches[1] ? decodeURIComponent(matches[1]) : null;
}

/**
 * Connecte un utilisateur via l'API NestJS
 */
export async function loginUser(email: string, password: string, rememberMe = true): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || 'Échec de la connexion';
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  const authData = data as AuthResponse;

  // Stocker dans le client (localStorage et cookies pour le middleware)
  storeAuthData(authData, rememberMe);

  return authData;
}

/**
 * Enregistre les données d'authentification dans localStorage et cookies
 */
export function storeAuthData(data: AuthResponse, rememberMe = true) {
  if (typeof window === 'undefined') return;

  const durationDays = rememberMe ? 30 : 1;

  // LocalStorage
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  // Cookies pour Next.js Middleware
  setCookie('token', data.access_token, durationDays);
  setCookie('user_role', data.user.role, durationDays);
  setCookie('user_email', data.user.email, durationDays);
}

/**
 * Déconnecte l'utilisateur
 */
export function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    deleteCookie('token');
    deleteCookie('user_role');
    deleteCookie('user_email');
    window.location.href = '/login';
  }
}

/**
 * Récupère le token actuel
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || getCookie('token');
}

/**
 * Récupère l'utilisateur connecté actuel
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (userJson) {
    try {
      return JSON.parse(userJson) as AuthUser;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

/**
 * Retourne la route de redirection adaptée selon le rôle de l'utilisateur
 */
export function getDashboardRouteForRole(role?: string): string {
  switch (role) {
    case 'ADMINISTRATEUR':
      return '/dashboard?view=admin';
    case 'CHEF_SRB':
      return '/dashboard?view=chef';
    case 'AGENT':
      return '/dashboard?view=agent';
    default:
      return '/dashboard';
  }
}
