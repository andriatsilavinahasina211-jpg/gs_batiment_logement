import React from "react";

type InfoRowProps = {
  label: string;
  value: string;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="baux-info-row">
      <span className="baux-info-label">{label}</span>
      <span className="baux-info-value">{value}</span>
    </div>
  );
}