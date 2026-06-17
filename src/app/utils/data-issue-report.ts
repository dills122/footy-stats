export const DATA_ISSUE_WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export interface DataIssueReportContext {
  pageTitle?: string;
  sourcePath?: string;
  clubName?: string;
  season?: number;
  competition?: string;
}

export interface DataIssueReportForm extends DataIssueReportContext {
  issueType: string;
  reporterName: string;
  reporterEmail: string;
  summary: string;
  expectedValue: string;
  source: string;
}

export interface Web3FormsResponse {
  success: boolean;
  message?: string;
}

export function buildDataIssueWeb3FormsPayload(
  form: DataIssueReportForm,
  accessKey: string
): Record<string, string | boolean> {
  return {
    access_key: accessKey,
    subject: buildDataIssueSubject(form),
    from_name: 'FootyStats data issue report',
    name: form.reporterName || 'FootyStats visitor',
    ...(form.reporterEmail ? { email: form.reporterEmail } : {}),
    message: buildDataIssueReportMessage(form),
    botcheck: false,
    'Issue type': form.issueType || 'Not sure',
    'Page or feature': form.pageTitle || 'Not sure',
    'Link or screen': form.sourcePath || 'Not sure',
    'Club or team': form.clubName || 'Not sure',
    'Season or year': form.season?.toString() || 'Not sure',
    'League or competition': form.competition || 'Not sure',
    'Correct value or source': form.expectedValue || form.source || 'Not provided',
  };
}

export function buildDataIssueReportMessage(form: DataIssueReportForm): string {
  return `Data issue report

What should we fix?
${form.summary || 'Not provided'}

Correct value or source
${form.expectedValue || form.source || 'Not provided'}

Issue type: ${form.issueType || 'Not sure'}
Page or feature: ${form.pageTitle || 'Not sure'}
Link or screen: ${form.sourcePath || 'Not sure'}
Club or team: ${form.clubName || 'Not sure'}
Season or year: ${form.season?.toString() || 'Not sure'}
League or competition: ${form.competition || 'Not sure'}

Reporter name: ${form.reporterName || 'Not provided'}
Reporter email: ${form.reporterEmail || 'Not provided'}`;
}

function buildDataIssueSubject(form: DataIssueReportForm): string {
  if (form.clubName && form.season) {
    return `FootyStats data issue: ${form.clubName} (${form.season})`;
  }

  if (form.clubName) {
    return `FootyStats data issue: ${form.clubName}`;
  }

  if (form.season && form.competition) {
    return `FootyStats data issue: ${form.season} ${form.competition}`;
  }

  return 'FootyStats data issue';
}
