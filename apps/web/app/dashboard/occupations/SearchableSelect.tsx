"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";

export function SearchableSelect({
  label,
  required,
  disabled,
  placeholder,
  value,
  displayValue,
  options,
  loading,
  emptyMessage,
  onSelect,
  onClear,
}: {
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder: string;
  value: string;
  displayValue: string;
  options: { id: string; label: string; searchText: string }[];
  loading?: boolean;
  emptyMessage?: string;
  onSelect: (id: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        if (value && displayValue) setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, displayValue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.searchText.toLowerCase().includes(q));
  }, [options, query]);

  const shownText = open ? query : displayValue || query;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label className="occupations-form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="occupations-form-input"
          disabled={disabled || loading}
          required={required && !value}
          placeholder={loading ? "Chargement…" : placeholder}
          value={shownText}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && onClear) onClear();
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onClear?.();
              setQuery("");
              setOpen(false);
            }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 16,
              color: "#94a3b8",
            }}
            title="Effacer"
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              {emptyMessage || "Aucun résultat"}
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onSelect(o.id);
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: o.id === value ? "#f8fafc" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#0f172a",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    o.id === value ? "#f8fafc" : "transparent";
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}