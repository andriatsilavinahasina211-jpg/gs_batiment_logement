'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import styles from './page.module.css';
import { loginUser, isAuthenticated, getDashboardRouteForRole } from '../lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirection si déjà connecté
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Veuillez renseigner votre adresse email.');
      return;
    }

    if (!password) {
      setErrorMessage('Veuillez renseigner votre mot de passe.');
      return;
    }

    try {
      setLoading(true);
      const authData = await loginUser(email.trim(), password, rememberMe);

      // Redirection selon le rôle de l'utilisateur ou la destination demandée
      if (fromParam && fromParam.startsWith('/dashboard')) {
        router.push(fromParam);
      } else {
        const targetRoute = getDashboardRouteForRole(authData.user.role);
        router.push(targetRoute);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Identifiants invalides ou service indisponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftSide}>
        <form onSubmit={handleSubmit} className={styles.formWrapper}>
          <div className={styles.logo}>
            <Image
              src="/logo_mef.png"
              alt="Logo MEF"
              width={100}
              height={100}
              className={styles.logoImage}
              priority
            />
          </div>

          <h1 className={styles.title}>SERVICE REGIONAL DU BUDGET</h1>
          <p className={styles.subtitle}>Haute Matsiatra</p>

          {/* Social Google Login */}
          <div className={styles.socialButtons}>
            <Link href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google}/auth/google`} className={styles.socialBtn}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Se Connecter avec Google
            </Link>
          </div>

          <div className={styles.divider}>Ou</div>

          {/* Error message alert */}
          {errorMessage && (
            <div className={styles.errorAlert} role="alert">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email input */}
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <div className={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                placeholder="votre.email@mef.mg"
                className={styles.inputField}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className={styles.inputGroup}>
            <label htmlFor="password">Mot de passe</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className={styles.inputField}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <svg
                className={styles.eyeIcon}
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: 'pointer' }}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </>
                ) : (
                  <>
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* Options Row */}
          <div className={styles.optionsRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Se souvenir de moi
            </label>
            <Link href="#" className={styles.forgotPassword}>
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Submit button */}
          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Vérification des accès...
              </>
            ) : (
              'Se Connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className={styles.container}>Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
