/**
 * Minimal CSV helpers for bulk-import endpoints.
 * Supports quoted fields and header-aware or positional rows.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    // Skip fully empty rows
    if (row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };

  const input = text.replace(/^\uFEFF/, ""); // strip BOM
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  pushField();
  pushRow();
  return rows;
}

export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Normalize header keys: trim, lower-case, strip spaces/underscores. */
export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_]+/g, "");
}

/**
 * Parse CSV into objects keyed by normalized headers.
 * If the first row does not look like headers for `expectedHeaders`, treat all rows as positional
 * using `expectedHeaders` as column order.
 */
export function parseCsvTable(text: string, expectedHeaders: string[]): CsvTable {
  const matrix = parseCsv(text);
  if (matrix.length === 0) return { headers: expectedHeaders, rows: [] };

  const expectedNorm = expectedHeaders.map(normalizeHeader);
  const firstNorm = matrix[0].map(normalizeHeader);
  const looksLikeHeader = expectedNorm.some((h) => firstNorm.includes(h));

  if (looksLikeHeader) {
    const headers = matrix[0];
    const headerKeys = headers.map(normalizeHeader);
    const rows = matrix.slice(1).map((cols) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < expectedNorm.length; i++) {
        const key = expectedNorm[i];
        const idx = headerKeys.indexOf(key);
        obj[expectedHeaders[i]] = idx >= 0 ? (cols[idx] ?? "") : "";
      }
      return obj;
    });
    return { headers: expectedHeaders, rows };
  }

  // Positional
  const rows = matrix.map((cols) => {
    const obj: Record<string, string> = {};
    expectedHeaders.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj;
  });
  return { headers: expectedHeaders, rows };
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}
