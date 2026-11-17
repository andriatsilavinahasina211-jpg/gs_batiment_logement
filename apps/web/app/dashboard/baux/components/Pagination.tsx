import React from "react";
import { ITEMS_PER_PAGE } from "../constants";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <>
      <div className="baux-pagination">
        <button
          type="button"
          className="baux-page-btn"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ← Précédent
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`baux-page-num${page === currentPage ? " active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="baux-page-btn"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Suivant →
        </button>
      </div>

      <div className="baux-pagination-info">
        Page {currentPage} sur {totalPages} — Affichage de {startIndex + 1} à{" "}
        {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} sur {totalItems}
      </div>
    </>
  );
}