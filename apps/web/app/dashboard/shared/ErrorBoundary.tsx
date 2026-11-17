"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { C } from "./constants";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message ||
        "Une erreur inattendue est survenue lors de l'affichage de ce module.";

      return (
        <div
          style={{
            margin: "24px 0",
            padding: "32px 28px",
            background: "#ffffff",
            border: "1px solid #fee2e2",
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(220, 38, 38, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 620,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {/* Icon alert */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              marginBottom: 16,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 8,
              letterSpacing: "-.3px",
            }}
          >
            {this.props.fallbackTitle || "Une anomalie est survenue"}
          </h3>

          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.6,
              marginBottom: 18,
              maxWidth: 480,
            }}
          >
            Le système a intercepté une erreur d&apos;exécution pour protéger votre session de travail.
          </p>

          {/* Error message detail box */}
          <div
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#b91c1c",
              textAlign: "left",
              marginBottom: 20,
              overflowX: "auto",
              wordBreak: "break-all",
            }}
          >
            {errorMessage}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 9,
                border: "none",
                background: C.gold,
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(201, 162, 39, .3)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Réessayer ce composant
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "9px 18px",
                borderRadius: 9,
                border: `1px solid ${C.border}`,
                background: "#ffffff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Actualiser toute la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

