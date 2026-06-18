import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DataIssueReportDialog } from './components/data-issue-report-dialog/data-issue-report-dialog';
import { DataUpdateBannerComponent } from './components/data-update-banner/data-update-banner';
import { MainToolbar } from './components/main-toolbar/main-toolbar';
import { DataUpdateService } from './store/services/data-update.service';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({
  selector: 'app-root',
  imports: [MainToolbar, RouterModule, DataIssueReportDialog, DataUpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('Footy Stats - English Football Data');
  protected readonly footerIssueContext = {
    pageTitle: 'FootyStats',
    sourcePath: 'Site footer',
  };
  private dataLoader = inject(DataLoaderService);
  private dataUpdates = inject(DataUpdateService);

  ngOnInit() {
    void this.dataLoader.loadData().then(() => this.dataUpdates.checkForUpdates());
  }
}
