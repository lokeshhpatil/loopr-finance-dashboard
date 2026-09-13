export const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const buildCSV = (
  rows: Record<string, any>[],
  cols: { label: string; field: string; format?: (v: any) => string }[],
): string => {
  const header = cols.map((c) => escapeCSV(c.label)).join(",");
  const body = rows
    .map((row) =>
      cols
        .map((c) => {
          const raw = row[c.field];
          const val = c.format ? c.format(raw) : raw;
          return escapeCSV(val);
        })
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
};

export const buildFilename = (startDate?: string, endDate?: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = startDate ?? "all";
  const to = endDate ?? today;
  return `transactions_${from}_${to}.csv`;
};


