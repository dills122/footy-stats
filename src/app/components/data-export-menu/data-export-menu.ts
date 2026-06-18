import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  buildCsv,
  buildJson,
  buildTxt,
  sanitizeExportFilename,
  type ExportFormat,
  type ExportRow,
  type ExportSummary,
} from '@app/utils/data-export';

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: string;
  mimeType: string;
}

const EXPORT_OPTIONS: readonly ExportOption[] = [
  { format: 'txt', label: 'TXT', icon: 'description', mimeType: 'text/plain;charset=utf-8' },
  { format: 'csv', label: 'CSV', icon: 'table_chart', mimeType: 'text/csv;charset=utf-8' },
  { format: 'json', label: 'JSON', icon: 'data_object', mimeType: 'application/json' },
];

@Component({
  selector: 'app-data-export-menu',
  imports: [CommonModule, MatIconModule],
  templateUrl: './data-export-menu.html',
  styleUrl: './data-export-menu.scss',
})
export class DataExportMenu {
  title = input('FootyStats export');
  filename = input('footy-stats-export');
  summary = input<ExportSummary | null>(null);
  rows = input<readonly ExportRow[]>([]);
  data = input<unknown>(undefined);

  protected readonly exportOptions = EXPORT_OPTIONS;
  protected readonly hasExportData = computed(
    () =>
      this.rows().length > 0 ||
      Object.keys(this.summary() ?? {}).length > 0 ||
      this.data() !== undefined
  );

  protected download(format: ExportFormat) {
    if (!this.hasExportData()) {
      return;
    }

    const generatedAt = new Date().toISOString();
    const dataset = {
      title: this.title(),
      generatedAt,
      summary: this.summary(),
      rows: this.rows(),
      data: this.data(),
    };
    const option = EXPORT_OPTIONS.find((candidate) => candidate.format === format)!;
    const content =
      format === 'csv'
        ? buildCsv(this.rows())
        : format === 'json'
          ? buildJson(dataset)
          : buildTxt(dataset);
    const blob = new Blob([content], { type: option.mimeType });
    const url = globalThis.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${sanitizeExportFilename(this.filename())}.${format}`;
    anchor.click();
    globalThis.URL.revokeObjectURL(url);
  }
}
