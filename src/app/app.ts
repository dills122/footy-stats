import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DataIssueReportDialog } from './components/data-issue-report-dialog/data-issue-report-dialog';
import { MainToolbar } from './components/main-toolbar/main-toolbar';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({
  selector: 'app-root',
  imports: [MainToolbar, RouterModule, DataIssueReportDialog],
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

  ngOnInit() {
    this.dataLoader.loadData(); // async, store will hydrate in background
  }
}
