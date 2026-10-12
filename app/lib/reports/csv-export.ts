export type CsvCell = string | number | null;

function escapeCsvCell(value: CsvCell): string {
  if (value === null) return '""';

  let text = String(value);
  if (
    typeof value === "string" &&
    /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text)
  ) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function serializeCsv(
  rows: readonly (readonly CsvCell[])[],
): string {
  return rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
}
