import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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
          maxWidth: 500,
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
            fontSize: 48,
            fontWeight: 900,
            color: "#C9A227",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 10,
          }}
        >
          Page introuvable
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          La page que vous recherchez n&apos;existe pas ou a été déplacée dans le portail SIGLBAHM.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: "#C9A227",
            color: "#ffffff",
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(201, 162, 39, .3)",
          }}
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}

