import React from "react";
import type { Tab } from "../constants";
import { TABS } from "../constants";

type TabBarProps = {
  activeTab: Tab;
  counts: Record<Tab, number>;
  onChange: (tab: Tab) => void;
};

export function TabBar({ activeTab, counts, onChange }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid #e2e8f0",
        marginBottom: 16,
      }}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: "8px 16px",
            border: "none",
            borderBottom:
              activeTab === key ? "2px solid #C9A227" : "2px solid transparent",
            background: "none",
            cursor: "pointer",
            fontWeight: activeTab === key ? 700 : 500,
            color: activeTab === key ? "#C9A227" : "#64748b",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all .15s",
          }}
        >
          {label}
          {counts[key] > 0 && (
            <span
              style={{
                background: key === "demandes" ? "#d97706" : "#e2e8f0",
                color: key === "demandes" ? "#fff" : "#475569",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {counts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}