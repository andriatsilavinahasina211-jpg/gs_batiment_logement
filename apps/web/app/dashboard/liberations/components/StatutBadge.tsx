import React from "react";
import { statutConfig } from "../../occupations/constants";

type StatutBadgeProps = {
  statut: string;
};

export function StatutBadge({ statut }: StatutBadgeProps) {
  const cfg = (statutConfig as Record<string, { label: string; color: string; bg: string }>)[
    statut
  ] ?? {
    label: statut,
    color: "#64748b",
    bg: "#f1f5f9",
  };

  return (
    <span
      className="occupations-badge"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}