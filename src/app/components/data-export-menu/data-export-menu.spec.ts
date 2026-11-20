import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { DataIssueReportDialogService } from '../data-issue-report-dialog/data-issue-report-dialog.service';
import { DataExportMenu } from './data-export-menu';

describe('DataExportMenu', () => {
  function setup(menuLabel: string) {
    const fixture = TestBed.createComponent(DataExportMenu);
    fixture.componentRef.setInput('menuLabel', menuLabel);
    fixture.componentRef.setInput('rows', [{ Club: 'Arsenal' }]);
    return {
      fixture,
      root: fixture.nativeElement as HTMLElement,
      overlay: TestBed.inject(OverlayContainer).getContainerElement(),
    };
  }

  it('opens only the export actions in a menu outside the page layout', () => {
    const { fixture, root, overlay } = setup('Export data');
    fixture.detectChanges();
    root.querySelector('button')!.click();
    fixture.detectChanges();

    const items = Array.from(overlay.querySelectorAll('[role="menuitem"]'));
    expect(items.map((item) => item.querySelector('span')?.textContent?.trim())).toEqual([
      'Export TXT',
      'Export CSV',
      'Export JSON',
    ]);
    expect(root.querySelector('[role="menuitem"]')).toBeNull();
  });

  it('opens a report for the selected table and closes the tools menu', () => {
    const { fixture, root, overlay } = setup('Table tools');
    const context = { pageTitle: 'League Tables', season: 2025, competition: 'Premier League' };
    fixture.componentRef.setInput('reportContext', context);
    fixture.componentRef.setInput('reportLabel', 'Report table issue');
    const dialogService = TestBed.inject(DataIssueReportDialogService);
    fixture.detectChanges();
    const trigger = root.querySelector('button')!;
    trigger.click();
    fixture.detectChanges();
    const items = Array.from(overlay.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    items.find((item) => item.textContent?.includes('Report table issue'))!.click();
    fixture.detectChanges();

    expect(dialogService.openRequest()?.context).toEqual(context);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
