"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info" | "delete";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms
  createdAt: number;
}

export interface ConfirmDeleteOptions {
  title?: string;
  itemName?: string;
  itemType?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  warningNote?: string;
}

export interface ConfirmActionOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "danger" | "warning" | "info";
  input?: {
    label: string;
    placeholder?: string;
    initialValue?: string;
  };
}

interface FeedbackContextValue {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    delete: (title: string, message?: string, duration?: number) => void;
  };
  confirmDelete: (options: ConfirmDeleteOptions) => Promise<boolean>;
  confirmAction: (options: ConfirmActionOptions) => Promise<boolean>;
  promptAction: (options: ConfirmActionOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────
export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return ctx;
}

export function useToast() {
  return useFeedback().toast;
}

export function useConfirm() {
  const { confirmDelete, confirmAction, promptAction } = useFeedback();
  return { confirmDelete, confirmAction, promptAction };
}

// ── Feedback Provider ─────────────────────────────────────────────────
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmDeleteOptions & {
      type?: "danger" | "warning" | "info";
      input?: ConfirmActionOptions["input"];
    };
    resolve: (val: boolean | string | null) => void;
  } | null>(null);

  // ── Toast methods ──
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const toastMethods = {
    success: useCallback(
      (title: string, msg?: string, dur?: number) => addToast("success", title, msg, dur),
      [addToast]
    ),
    error: useCallback(
      (title: string, msg?: string, dur?: number) => addToast("error", title, msg, dur),
      [addToast]
    ),
    warning: useCallback(
      (title: string, msg?: string, dur?: number) => addToast("warning", title, msg, dur),
      [addToast]
    ),
    info: useCallback(
      (title: string, msg?: string, dur?: number) => addToast("info", title, msg, dur),
      [addToast]
    ),
    delete: useCallback(
      (title: string, msg?: string, dur?: number) => addToast("delete", title, msg, dur),
      [addToast]
    ),
  };

  // ── Confirm Delete method ──
  const confirmDelete = useCallback((options: ConfirmDeleteOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options: {
          ...options,
          type: "danger",
          title: options.title || "Confirmer la suppression",
          confirmLabel: options.confirmLabel || "Supprimer définitivement",
          cancelLabel: options.cancelLabel || "Annuler",
          warningNote:
            options.warningNote ||
            "Cette action est irréversible. Les données et documents associés seront supprimés.",
        },
        resolve: (result) => resolve(result === true),
      });
    });
  }, []);

  // ── Confirm Action method ──
  const confirmAction = useCallback((options: ConfirmActionOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options: {
          title: options.title,
          message: options.message,
          type: options.type || "warning",
          confirmLabel: options.confirmLabel || "Confirmer",
          cancelLabel: options.cancelLabel || "Annuler",
        },
        resolve: (result) => resolve(result === true),
      });
    });
  }, []);

  const promptAction = useCallback((options: ConfirmActionOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options: {
          title: options.title,
          message: options.message,
          type: options.type || "warning",
          confirmLabel: options.confirmLabel || "Confirmer",
          cancelLabel: options.cancelLabel || "Annuler",
          input: options.input,
        },
        resolve: (result) => resolve(typeof result === "string" ? result : null),
      });
    });
  }, []);

  const handleConfirm = (inputValue?: string) => {
    if (confirmModal) {
      confirmModal.resolve(inputValue ?? true);
      setConfirmModal(null);
    }
  };

  const handleCancel = () => {
    if (confirmModal) {
      confirmModal.resolve(confirmModal.options.input ? null : false);
      setConfirmModal(null);
    }
  };

  return (
    <FeedbackContext.Provider
      value={{
        toast: toastMethods,
        confirmDelete,
        confirmAction,
        promptAction,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Modern Confirmation / Deletion Dialog */}
      {confirmModal && confirmModal.isOpen && (
        <ConfirmDialogModal
          options={confirmModal.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </FeedbackContext.Provider>
  );
}

// ── Toast Container & Toast Cards ─────────────────────────────────────
function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
        width: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4500;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  }, [onClose]);

  useEffect(() => {
    const startTime = Date.now();
    const intervalMs = 25;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPct);
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      triggerClose();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [duration, triggerClose]);

  // Color configurations per type
  const config = {
    success: {
      border: "#10b981",
      bgGradient: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(240,253,244,0.98))",
      accent: "#059669",
      accentBg: "#ecfdf5",
      badgeText: "Succès",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      border: "#ef4444",
      bgGradient: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(254,242,242,0.98))",
      accent: "#dc2626",
      accentBg: "#fee2e2",
      badgeText: "Erreur",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      border: "#f59e0b",
      bgGradient: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(254,252,232,0.98))",
      accent: "#d97706",
      accentBg: "#fef3c7",
      badgeText: "Attention",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    delete: {
      border: "#dc2626",
      bgGradient: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(254,242,242,0.98))",
      accent: "#b91c1c",
      accentBg: "#fee2e2",
      badgeText: "Suppression",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    info: {
      border: "#3b82f6",
      bgGradient: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
      accent: "#2563eb",
      accentBg: "#dbeafe",
      badgeText: "Information",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }[toast.type];

  return (
    <div
      style={{
        pointerEvents: "auto",
        position: "relative",
        background: config.bgGradient,
        borderRadius: 14,
        border: `1px solid rgba(226, 232, 240, 0.9)`,
        borderLeft: `5px solid ${config.border}`,
        boxShadow: "0 12px 35px -8px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.05)",
        backdropFilter: "blur(14px)",
        padding: "14px 16px 14px 14px",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: isClosing ? "translateX(110%) scale(0.95)" : "translateX(0) scale(1)",
        opacity: isClosing ? 0 : 1,
        animation: "slideInRight 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: config.accentBg,
          color: config.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `inset 0 0 0 1px ${config.border}33`,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontWeight: 700,
              color: config.accent,
            }}
          >
            {config.badgeText}
          </span>
        </div>
        <h4
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "#0f172a",
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {toast.title}
        </h4>
        {toast.message && (
          <p
            style={{
              fontSize: 12.5,
              color: "#475569",
              margin: "4px 0 0 0",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={triggerClose}
        title="Fermer"
        style={{
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          padding: 4,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s, background-color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#0f172a";
          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#94a3b8";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Countdown progress line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          width: `${progress}%`,
          background: config.border,
          transition: "width 25ms linear",
          borderTopRightRadius: 2,
        }}
      />
    </div>
  );
}

// ── Modern Confirmation Dialog Modal ──────────────────────────────────
function ConfirmDialogModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmDeleteOptions & {
    type?: "danger" | "warning" | "info";
    input?: ConfirmActionOptions["input"];
  };
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState(options.input?.initialValue || "");

  // Keyboard navigation: Escape cancels, Enter confirms
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleConfirmClick = () => {
    setSubmitting(true);
    onConfirm(options.input ? inputValue : undefined);
  };

  const isDanger = options.type === "danger" || !options.type;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow:
            "0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          animation: "scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top colored accent bar */}
        <div
          style={{
            height: 4,
            background: isDanger
              ? "linear-gradient(90deg, #ef4444, #dc2626, #b91c1c)"
              : "linear-gradient(90deg, #C9A227, #f59e0b)",
          }}
        />

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Header with Icon and Title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {/* Pulsing Icon Bubble */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: isDanger ? "#fee2e2" : "#fef3c7",
                color: isDanger ? "#dc2626" : "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: isDanger
                  ? "0 0 0 6px rgba(239, 68, 68, 0.12)"
                  : "0 0 0 6px rgba(201, 162, 39, 0.15)",
              }}
            >
              {isDanger ? (
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ) : (
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  color: isDanger ? "#dc2626" : "#d97706",
                  marginBottom: 4,
                }}
              >
                {isDanger ? "Confirmation requise" : "Vérification"}
              </span>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {options.title}
              </h3>
            </div>
          </div>

          {/* Item details card if provided */}
          {options.itemName && (
            <div
              style={{
                marginTop: 18,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {options.itemType || "Élément sélectionné"}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1e293b",
                  wordBreak: "break-word",
                }}
              >
                « {options.itemName} »
              </span>
            </div>
          )}

          {/* Explanation message */}
          {options.message && (
            <p
              style={{
                marginTop: options.itemName ? 14 : 16,
                fontSize: 13.5,
                color: "#475569",
                lineHeight: 1.55,
                margin: options.itemName ? "12px 0 0 0" : "16px 0 0 0",
              }}
            >
              {options.message}
            </p>
          )}

          {options.input && (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                marginTop: 16,
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {options.input.label}
              <textarea
                autoFocus
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={options.input.placeholder}
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 9,
                  color: "#1e293b",
                  font: "inherit",
                  resize: "vertical",
                }}
              />
            </label>
          )}

          {/* Warning callout for destructive delete */}
          {options.warningNote && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                borderRadius: 10,
                background: isDanger ? "#fff1f2" : "#fffbeb",
                border: `1px solid ${isDanger ? "#fecdd3" : "#fde68a"}`,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke={isDanger ? "#e11d48" : "#d97706"}
                strokeWidth={2}
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  color: isDanger ? "#9f1239" : "#92400e",
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}
              >
                {options.warningNote}
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "16px 28px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#475569",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
                e.currentTarget.style.borderColor = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }
            }}
          >
            {options.cancelLabel || "Annuler"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirmClick}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#ffffff",
              background: isDanger
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #C9A227, #A67C00)",
              border: "none",
              boxShadow: isDanger
                ? "0 4px 14px rgba(220, 38, 38, 0.35)"
                : "0 4px 14px rgba(201, 162, 39, 0.35)",
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              transform: submitting ? "scale(0.98)" : "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.filter = "brightness(1.08)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {submitting ? (
              <>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    opacity="0.25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Traitement...</span>
              </>
            ) : (
              <>
                {isDanger && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
                <span>{options.confirmLabel || "Confirmer"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
