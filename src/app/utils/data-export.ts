export type ExportFormat = 'txt' | 'csv' | 'json';
export type ExportRow = Record<string, unknown>;
export type ExportSummary = Record<string, unknown>;

export interface ExportDataset {
  title: string;
  summary?: ExportSummary | null;
  rows: readonly ExportRow[];
  generatedAt?: string;
  data?: unknown;
}

export function buildCsv(rows: readonly ExportRow[]): string {
  const columns = exportColumns(rows);
  if (!columns.length) {
    return '';
  }

  return [
    columns.map(escapeCsvCell).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(',')),
  ].join('\n');
}

export function buildJson(dataset: ExportDataset): string {
  return JSON.stringify(
    {
      title: dataset.title,
      generatedAt: dataset.generatedAt,
      summary: dataset.summary ?? {},
      rows: dataset.rows,
      ...(dataset.data === undefined ? {} : { data: dataset.data }),
    },
    null,
    2
  );
}

export function buildTxt(dataset: ExportDataset): string {
  const lines = [dataset.title];
  if (dataset.generatedAt) {
    lines.push(`Generated: ${dataset.generatedAt}`);
  }

  const summary = dataset.summary ?? {};
  const summaryEntries = Object.entries(summary);
  if (summaryEntries.length) {
    lines.push('', 'Summary');
    summaryEntries.forEach(([key, value]) =>
      lines.push(`${humanizeKey(key)}: ${formatCell(value)}`)
    );
  }

  const columns = exportColumns(dataset.rows);
  if (columns.length) {
    lines.push('', `Rows (${dataset.rows.length})`, columns.map(humanizeKey).join('\t'));
    dataset.rows.forEach((row) => {
      lines.push(columns.map((column) => formatCell(row[column])).join('\t'));
    });
  } else {
    lines.push('', 'Rows: 0');
  }

  return `${lines.join('\n')}\n`;
}

export function exportColumns(rows: readonly ExportRow[]): string[] {
  const columns = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => columns.add(key)));
  return Array.from(columns);
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(formatCell).join('; ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function sanitizeExportFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'footy-stats-export';
}

function escapeCsvCell(value: unknown): string {
  const cell = formatCell(value);
  return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}
