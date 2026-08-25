"use client";

// Opens the browser's own print dialog, where "Save as PDF" is a destination.
// No PDF library ships with the app: the markdown export is the real shareable
// file, and this is the pretty view on paper.
export default function PrintButton() {
  return (
    <button type="button" className="report-action" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
