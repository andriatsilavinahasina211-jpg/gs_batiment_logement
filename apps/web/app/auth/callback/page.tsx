'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');

        if (token) {
            // 1. On crée le cookie "token" (celui que le middleware attend)
            document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

            // 2. (Optionnel) on le garde aussi en localStorage
            localStorage.setItem('access_token', token);

            // 3. Cookie du rôle, puis redirection vers le dashboard
            if (role) {
                document.cookie = `user_role=${role}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
            }
            router.replace('/dashboard');
        } else {
            router.replace('/login?error=no_token');
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Connexion en cours...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <p>Chargement...</p>
                </div>
            }
        >
            <CallbackContent />
        </Suspense>
    );
}