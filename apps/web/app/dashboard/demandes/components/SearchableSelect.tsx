"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

export type SearchableOption = {
  id: string;
  label: string;
  searchText?: string;
  subLabel?: string;
};

interface SearchableSelectProps {
  label: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  value: string;
  displayValue?: string;
  options: SearchableOption[];
  emptyMessage?: string;
  onSelect: (id: string) => void;
  onClear?: () => void;
  className?: string;
}

export function SearchableSelect({
  label,
  required = false,
  disabled = false,
  loading = false,
  placeholder = "Rechercher…",
  value,
  displayValue,
  options,
  emptyMessage = "Aucun résultat",
  onSelect,
  onClear,
  className = "",
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const inputValue = open || !value ? query : displayValue || query;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => {
        const text = `${o.label} ${o.searchText || ""} ${o.subLabel || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 40);
  }, [options, query]);

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

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery("");
    setOpen(false);
    setHighlightIndex(0);
  };

  const handleClear = () => {
    onClear?.();
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      if (value && displayValue) setQuery("");
    }
  };

  return (
    <div className={`searchable-select ${className}`} ref={containerRef}>
      <label className="searchable-select-label">
        {label}
        {required && <span className="searchable-select-required"> *</span>}
      </label>

      <div className="searchable-select-input-wrap">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          disabled={disabled || loading}
          required={required && !value}
          placeholder={loading ? "Chargement…" : placeholder}
          value={inputValue}
          className="searchable-select-input"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIndex(0);
            if (!e.target.value.trim() && value) {
              onClear?.();
            }
          }}
          onFocus={() => {
            setOpen(true);
            if (value && displayValue) setQuery("");
          }}
          onKeyDown={handleKeyDown}
        />

        {value && !disabled && (
          <button
            type="button"
            className="searchable-select-clear"
            onClick={handleClear}
            tabIndex={-1}
            title="Effacer"
          >
            ×
          </button>
        )}

        <span className="searchable-select-chevron" aria-hidden>
          ▾
        </span>
      </div>

      {open && !loading && (
        <ul className="searchable-select-dropdown" ref={listRef}>
          {filtered.length === 0 ? (
            <li className="searchable-select-empty">{emptyMessage}</li>
          ) : (
            filtered.map((opt, idx) => (
              <li key={opt.id}>
                <button
                  type="button"
                  className={`searchable-select-option${
                    opt.id === value ? " selected" : ""
                  }${idx === highlightIndex ? " highlighted" : ""}`}
                  onClick={() => handleSelect(opt.id)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  <span className="searchable-select-option-label">
                    {opt.label}
                  </span>
                  {opt.subLabel && (
                    <span className="searchable-select-option-sub">
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}