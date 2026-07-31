export type CsvColumn<T> = { header: string; value: (row: T) => string | number | null | undefined };

function escapeCell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v);
  // Prevent CSV/formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const head = columns.map((c) => escapeCell(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(";"));
  return [head, ...body].join("\r\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = "\uFEFF" + toCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
