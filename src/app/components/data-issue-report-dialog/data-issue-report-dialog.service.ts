import { Injectable, signal } from '@angular/core';
import type { DataIssueReportContext } from '@app/utils/data-issue-report';

interface DataIssueReportOpenRequest {
  id: number;
  context: DataIssueReportContext;
}

@Injectable({ providedIn: 'root' })
export class DataIssueReportDialogService {
  private nextRequestId = 0;
  private readonly openRequestSignal = signal<DataIssueReportOpenRequest | null>(null);

  readonly openRequest = this.openRequestSignal.asReadonly();

  open(context: DataIssueReportContext) {
    this.openRequestSignal.set({
      id: ++this.nextRequestId,
      context,
    });
  }
}
