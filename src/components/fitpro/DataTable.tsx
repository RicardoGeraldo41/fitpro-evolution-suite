import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyExtractor,
  searchable = false,
  searchKeys,
  empty,
  className,
}: {
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode; className?: string }[];
  rows: T[];
  keyExtractor: (row: T) => string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  empty?: React.ReactNode;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !query.trim() || !searchKeys?.length) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((k) => {
        const v = row[k];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, query, searchable, searchKeys]);

  return (
    <div className={cn("fp-data-table-wrap", className)}>
      {searchable && (
        <input
          type="text"
          className="fp-input fp-table-search"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {filtered.length === 0 ? (
        empty ?? <p className="fp-empty-table">Nenhum registro encontrado.</p>
      ) : (
        <div className="fp-table-scroll">
          <table className="fp-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.className}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={keyExtractor(row)}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
