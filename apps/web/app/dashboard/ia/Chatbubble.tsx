"use client";

import { useEffect, useRef, useState } from "react";

import { iaApi, ApiError, type Analyse, type Indicateurs } from "../ia/iaapi";
import {
  repondre,
  SCENARIOS,
  suggestionsSuivantes,
  type Contexte,
} from "../ia/iautils";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
  suggestions?: string[];
};

type Donnees = Contexte & { chargeLe: number };

// Les données sont rechargées si elles datent de plus de 2 minutes
const DUREE_DONNEES = 2 * 60 * 1000;

const OR = "var(--gold, #b7791f)";
const OR_CLAIR = "var(--gold-bg, #fef3c7)";
const BORDURE = "var(--border, #e2e8f0)";
const TEXTE = "var(--text, #1e293b)";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "bot",
      text:
        "Bonjour. Je suis l'assistant SRB. Je réponds à partir des données actuelles : chantiers, quitus, occupations et biens. Posez une question ou choisissez un scénario.",
      suggestions: SCENARIOS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const donneesRef = useRef<Donnees | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Défilement vers le dernier message
  useEffect(() => {
    if (open) finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  // Focus sur le champ à l'ouverture
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function assurerDonnees(): Promise<Donnees> {
    const actuelles = donneesRef.current;
    if (actuelles && Date.now() - actuelles.chargeLe < DUREE_DONNEES) {
      return actuelles;
    }

    const [ind, ana] = await Promise.allSettled([
      iaApi.getIndicateurs(),
      iaApi.getAnalyse(),
    ]);

    const indicateurs: Indicateurs | null =
      ind.status === "fulfilled" ? ind.value : null;
    const analyse: Analyse | null = ana.status === "fulfilled" ? ana.value : null;

    if (!indicateurs && !analyse) {
      const erreurIndicateurs =
        ind.status === "rejected" && ind.reason instanceof Error
          ? ind.reason.message
          : "indicateurs indisponibles";
      const erreurAnalyse =
        ana.status === "rejected" && ana.reason instanceof Error
          ? ana.reason.message
          : "rapport détaillé indisponible";
      throw new Error(
        `Impossible de charger les données d'aide à la décision. ${erreurIndicateurs}. ${erreurAnalyse}`
      );
    }

    const donnees: Donnees = {
      indicateurs,
      analyse,
      analyseRestreinte:
        ana.status === "rejected" &&
        ana.reason instanceof ApiError &&
        ana.reason.status === 403,
      chargeLe: Date.now(),
    };

    // On ne garde pas en mémoire un chargement entièrement raté
    if (indicateurs || analyse) donneesRef.current = donnees;

    return donnees;
  }

  async function envoyer(texte: string) {
    const q = texte.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: q }]);
    setInput("");
    setLoading(true);

    let reponse: string;
    let suggestions = SCENARIOS.slice(0, 3);
    try {
      const donnees = await assurerDonnees();
      reponse = repondre(q, donnees);
      suggestions = suggestionsSuivantes(q, donnees);
    } catch (e) {
      reponse =
        e instanceof Error
          ? e.message
          : "Une erreur est survenue pendant l'analyse. Réessayez dans un instant.";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        role: "bot",
        text: reponse,
        suggestions,
      },
    ]);
    setLoading(false);
  }

  return (
    <>
      {/* Panneau de discussion */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant SRB"
          style={{
            position: "fixed",
            right: 24,
            bottom: 92,
            zIndex: 1000,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(540px, calc(100vh - 120px))",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            border: `1px solid ${BORDURE}`,
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.22)",
            overflow: "hidden",
          }}
        >
          {/* En-tête */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: OR,
              color: "#ffffff",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Assistant SRB</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                Répond à partir de vos données en direct
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le chat"
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: 20,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#f8fafc",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    padding: "9px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: m.role === "user" ? "#ffffff" : TEXTE,
                    background: m.role === "user" ? OR : "#ffffff",
                    border: m.role === "user" ? "none" : `1px solid ${BORDURE}`,
                  }}
                >
                  {m.text}
                </div>
                {m.role === "bot" && m.suggestions && m.suggestions.length > 0 && (
                  <div
                    aria-label="Questions de suivi suggérées"
                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                  >
                    {m.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => envoyer(suggestion)}
                        disabled={loading}
                        style={{
                          textAlign: "left",
                          padding: "6px 9px",
                          fontSize: 11,
                          lineHeight: 1.35,
                          color: "var(--gold-dark, #92400e)",
                          background: OR_CLAIR,
                          border: `1px solid var(--gold-light, #fde68a)`,
                          borderRadius: 999,
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.6 : 1,
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "9px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  color: "var(--muted, #64748b)",
                  background: "#ffffff",
                  border: `1px solid ${BORDURE}`,
                }}
              >
                Analyse en cours…
              </div>
            )}

            <div ref={finRef} />
          </div>

          {/* Saisie */}
          <div
            style={{
              padding: 10,
              borderTop: `1px solid ${BORDURE}`,
              background: "#ffffff",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") envoyer(input);
                }}
                placeholder="Posez une question…"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontSize: 13,
                  color: TEXTE,
                  border: `1px solid ${BORDURE}`,
                  borderRadius: 10,
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={() => envoyer(input)}
                disabled={loading || !input.trim()}
                style={{
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#ffffff",
                  background: loading || !input.trim() ? "#cbd5e1" : OR,
                  border: "none",
                  borderRadius: 10,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                }}
              >
                Envoyer
              </button>
            </div>

            <div style={{ fontSize: 10, color: "var(--muted, #64748b)", marginTop: 6 }}>
              Réponses calculées sur les données actuelles, sans IA générative.
            </div>
          </div>
        </div>
      )}

      {/* Bulle flottante (côté droit) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le chat IA" : "Ouvrir le chat IA"}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1001,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: OR,
          color: "#ffffff",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(183, 121, 31, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? "×" : "💬"}
      </button>
    </>
  );
}