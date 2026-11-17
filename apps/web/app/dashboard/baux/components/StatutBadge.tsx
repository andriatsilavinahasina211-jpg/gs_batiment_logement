import React from "react";
import type { StatutBail } from "../types";
import { statutConfig } from "../constants";

type StatutBadgeProps = {
  statut: StatutBail;
};

export function StatutBadge({ statut }: StatutBadgeProps) {
  const st = statutConfig[statut];
  return (
    <span
      className="baux-badge"
      style={{ background: st.bg, color: st.color }}
    >
      {st.label}
    </span>
  );
}