import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { DATA_ISSUE_WEB3FORMS_ENDPOINT } from '@app/utils/data-issue-report';
import { DataIssueReportDialog } from './data-issue-report-dialog';

describe('DataIssueReportDialog', () => {
  let component: DataIssueReportDialog;
  let fixture: ComponentFixture<DataIssueReportDialog>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataIssueReportDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DataIssueReportDialog);
    fixture.componentRef.setInput('accessKey', 'test-access-key');
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('opens the report form from the trigger', () => {
    fixture.nativeElement.querySelector('.report-trigger').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('explains why the report button is disabled', () => {
    component.open();
    fixture.detectChanges();

    const sendAction = fixture.debugElement.query(By.css('.send-action'));
    const sendButton = fixture.nativeElement.querySelector('.send-link') as HTMLButtonElement;
    const tooltip = sendAction.injector.get(MatTooltip);

    expect(sendButton.disabled).toBe(true);
    expect(tooltip.message).toBe('Add a short description of what should be fixed.');
    expect(tooltip.disabled).toBe(false);
  });

  it('submits a data report through Web3Forms', () => {
    component.open();
    component.updateField('summary', 'The season total looks wrong.');
    fixture.detectChanges();

    const sendButton = fixture.nativeElement.querySelector('.send-link') as HTMLButtonElement;
    sendButton.click();

    const request = httpMock.expectOne(DATA_ISSUE_WEB3FORMS_ENDPOINT);
    expect(request.request.method).toBe('POST');
    expect(request.request.body['access_key']).toBe('test-access-key');
    expect(request.request.body['message']).toContain('The season total looks wrong.');

    request.flush({ success: true, message: 'Email sent successfully!' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Report sent.');
  });
});
