import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import {
  buildDataIssueWeb3FormsPayload,
  DATA_ISSUE_WEB3FORMS_ENDPOINT,
  type DataIssueReportContext,
  type DataIssueReportForm,
  type Web3FormsResponse,
} from '@app/utils/data-issue-report';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error' | 'missing-key';

type ReportField =
  | 'issueType'
  | 'reporterName'
  | 'reporterEmail'
  | 'summary'
  | 'expectedValue'
  | 'source'
  | 'clubName'
  | 'season'
  | 'competition';

@Component({
  selector: 'app-data-issue-report-dialog',
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './data-issue-report-dialog.html',
  styleUrl: './data-issue-report-dialog.scss',
})
export class DataIssueReportDialog {
  triggerLabel = input('Report data issue');
  triggerStyle = input<'button' | 'link'>('button');
  context = input<DataIssueReportContext>({});
  accessKey = input(environment.web3FormsAccessKey);

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly isOpen = signal(false);
  protected readonly form = signal<DataIssueReportForm>(this.buildInitialForm());
  protected readonly submitState = signal<SubmitState>('idle');
  protected readonly errorMessage = signal('');
  protected readonly isConfigured = computed(() => Boolean(this.accessKey().trim()));
  protected readonly canSubmit = computed(
    () =>
      Boolean(this.form().summary.trim()) &&
      this.isConfigured() &&
      this.submitState() !== 'sending' &&
      this.submitState() !== 'sent'
  );
  protected readonly isPrimaryActionDisabled = computed(
    () => this.submitState() !== 'sent' && !this.canSubmit()
  );
  protected readonly primaryActionLabel = computed(() => {
    if (this.submitState() === 'sending') {
      return 'Sending...';
    }

    if (this.submitState() === 'sent') {
      return 'Close';
    }

    return 'Send report';
  });
  protected readonly disabledReason = computed(() => {
    if (this.submitState() === 'sending') {
      return 'Sending the report now.';
    }

    if (!this.isConfigured()) {
      return 'Report submissions are not configured yet.';
    }

    if (!this.form().summary.trim()) {
      return 'Add a short description of what should be fixed.';
    }

    return '';
  });

  open() {
    this.form.set(this.buildInitialForm());
    this.submitState.set(this.isConfigured() ? 'idle' : 'missing-key');
    this.errorMessage.set('');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  updateField(field: ReportField, value: string) {
    if (this.submitState() === 'sent' || this.submitState() === 'error') {
      this.submitState.set(this.isConfigured() ? 'idle' : 'missing-key');
      this.errorMessage.set('');
    }

    this.form.update((current) => ({
      ...current,
      [field]: field === 'season' ? this.parseSeason(value) : value,
    }));
  }

  submit() {
    if (!this.form().summary.trim()) {
      return;
    }

    const accessKey = this.accessKey().trim();

    if (!accessKey) {
      this.submitState.set('missing-key');
      return;
    }

    this.submitState.set('sending');
    this.errorMessage.set('');

    this.http
      .post<Web3FormsResponse>(
        DATA_ISSUE_WEB3FORMS_ENDPOINT,
        buildDataIssueWeb3FormsPayload(this.form(), accessKey),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.submitState.set('sent');
            return;
          }

          this.submitState.set('error');
          this.errorMessage.set(response.message || 'The report could not be sent.');
        },
        error: () => {
          this.submitState.set('error');
          this.errorMessage.set('The report could not be sent. Please try again.');
        },
      });
  }

  handlePrimaryAction() {
    if (this.submitState() === 'sent') {
      this.close();
      return;
    }

    this.submit();
  }

  private buildInitialForm(): DataIssueReportForm {
    const context = this.context();
    return {
      issueType: 'Data looks wrong',
      reporterName: '',
      reporterEmail: '',
      summary: '',
      expectedValue: '',
      source: '',
      pageTitle: context.pageTitle,
      pageUrl: context.pageUrl ?? this.currentPageUrl(),
      sourcePath: context.sourcePath,
      clubName: context.clubName ?? '',
      season: context.season,
      competition: context.competition ?? '',
    };
  }

  private parseSeason(value: string): number | undefined {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private currentPageUrl(): string {
    return globalThis.location?.href || this.router.url;
  }
}
