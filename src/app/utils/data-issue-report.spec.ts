import {
  buildDataIssueReportMessage,
  buildDataIssueWeb3FormsPayload,
  DATA_ISSUE_WEB3FORMS_ENDPOINT,
} from './data-issue-report';

describe('data issue report helpers', () => {
  it('builds a Web3Forms payload with contextual subject and message', () => {
    const payload = buildDataIssueWeb3FormsPayload(
      {
        issueType: 'Wrong table value',
        reporterName: 'Alex',
        reporterEmail: 'alex@example.com',
        summary: 'The points total looks wrong.',
        expectedValue: 'Should be 42 points.',
        source: 'Club handbook',
        pageTitle: 'Club profile',
        pageUrl: 'https://footystats.example/teams/example-fc?tab=records',
        sourcePath: '/teams/example-fc',
        clubName: 'Example FC',
        season: 1999,
        competition: 'Championship',
      },
      'test-access-key'
    );

    expect(DATA_ISSUE_WEB3FORMS_ENDPOINT).toBe('https://api.web3forms.com/submit');
    expect(payload['access_key']).toBe('test-access-key');
    expect(payload['subject']).toBe('FootyStats data issue: Example FC (1999)');
    expect(payload['email']).toBe('alex@example.com');
    expect(payload['Problem summary']).toBe('The points total looks wrong.');
    expect(payload['Reported page URL']).toBe(
      'https://footystats.example/teams/example-fc?tab=records'
    );
    expect(payload['Report context']).toBe(
      'Club: Example FC / Season: 1999 / League: Championship / Screen: /teams/example-fc'
    );
    expect(payload['Reporter email']).toBe('alex@example.com');
    expect(payload['message']).toContain('The points total looks wrong.');
    expect(payload['message']).toContain('Problem summary: The points total looks wrong.');
    expect(payload['message']).toContain(
      'Reported page URL: https://footystats.example/teams/example-fc?tab=records'
    );
    expect(payload['Correct value or source']).toBe('Should be 42 points.');
  });

  it('uses friendly fallback text for unknown fields', () => {
    const message = buildDataIssueReportMessage({
      issueType: '',
      reporterName: '',
      reporterEmail: '',
      summary: '',
      expectedValue: '',
      source: '',
    });

    expect(message).toContain('What should we fix?\nNot provided');
    expect(message).toContain('Problem summary: Not provided');
    expect(message).toContain('Report context: Not sure');
    expect(message).toContain('Correct value or source\nNot provided');
    expect(message).toContain('Reporter email: Not provided');
  });
});
