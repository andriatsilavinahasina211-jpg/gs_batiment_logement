import React from "react";
import type { Tab } from "../constants";

type TabBannerProps = {
  activeTab: Tab;
};

export function TabBanner({ activeTab }: TabBannerProps) {
  if (activeTab === "en_cours") {
    return (
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: "#92400e",
        }}
      >
        💡 Cliquez sur <strong>« Demander libération »</strong> pour passer une
        occupation en cours au statut de <strong>Demande de libération</strong>.
      </div>
    );
  }

  if (activeTab === "demandes") {
    return (
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: "#1e40af",
        }}
      >
        📋 Ces demandes de libération sont en attente d&apos;approbation. Vous
        pouvez <strong>valider</strong> ou <strong>refuser</strong> la demande.
      </div>
    );
  }

  return null;
}