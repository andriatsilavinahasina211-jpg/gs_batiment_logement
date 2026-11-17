"use client";

import { C } from "./shared/constants";

export default function NotificationsPage() {
  return (
    <div style={{
      background: C.card,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "28px 32px",
      boxShadow: "0 1px 4px rgba(0,0,0,.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Notifications</h2>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Alertes et messages système</p>
        </div>
        <button style={{
          background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
          padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          Tout marquer comme lu
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { title: "Nouveau bail à signer", time: "Il y a 2 heures", unread: true },
          { title: "Demande d’attribution validée", time: "Hier", unread: true },
          { title: "Rappel : recensement Ambalavao", time: "17/08/2026", unread: false },
        ].map((n, i) => (
          <div key={i} style={{
            padding: "14px 16px",
            borderRadius: 10,
            background: n.unread ? C.goldBg : C.bg,
            border: `1px solid ${n.unread ? C.goldLight : C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{n.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{n.time}</div>
            </div>
            {n.unread && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}