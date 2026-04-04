/**
 * Lightweight export utilities — CSV download + browser-print PDF.
 * No heavy third-party dependencies required.
 */

// ── CSV ──────────────────────────────────────────────────────────────────────

export interface ExportColumn<T = any> {
  key: string;
  label: string;
  /** Optional formatter – receives the row object and returns the display value. */
  format?: (row: T) => string | number;
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
) {
  const header = columns.map((c) => escapeCSV(c.label)).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = c.format ? c.format(row) : row[c.key];
        return escapeCSV(val);
      })
      .join(","),
  );

  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

// ── JSON ─────────────────────────────────────────────────────────────────────

export function exportToJSON<T>(data: T[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, "application/json;charset=utf-8;");
}

// ── PDF (browser print) ─────────────────────────────────────────────────────

export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
) {
  const tableRows = data
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => {
            const val = c.format ? c.format(row) : row[c.key] ?? "";
            return `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${String(val)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const headerCells = columns
    .map(
      (c) =>
        `<th style="padding:6px 10px;border-bottom:2px solid #374151;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:left;color:#6b7280">${c.label}</th>`,
    )
    .join("");

  const html = `
    <html><head><title>${title}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;margin:40px;color:#111827}
      h1{font-size:18px;margin-bottom:4px}
      p.sub{font-size:12px;color:#6b7280;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      @media print{body{margin:20px}}
    </style></head><body>
    <h1>${title}</h1>
    <p class="sub">Exported on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    <table><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── Helper ───────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
