"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root Error]:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.08)",
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Image
            src="/logo_mef.png"
            alt="MEF Madagascar"
            width={70}
            height={70}
            style={{ objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 20,
            background: "#fee2e2",
            color: "#dc2626",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Erreur d&apos;exécution système
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 10,
          }}
        >
          Une erreur inattendue est survenue
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          L&apos;application a rencontré une difficulté technique. Vos données restent protégées. Vous pouvez relancer le composant ou revenir au tableau de bord.
        </p>

        {error?.message && (
          <div
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#334155",
              textAlign: "left",
              marginBottom: 24,
              wordBreak: "break-all",
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#C9A227",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(201, 162, 39, .3)",
            }}
          >
            Réessayer
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

