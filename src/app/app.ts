import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { DataIssueReportDialog } from './components/data-issue-report-dialog/data-issue-report-dialog';
import { DataUpdateBannerComponent } from './components/data-update-banner/data-update-banner';
import { MainToolbar } from './components/main-toolbar/main-toolbar';
import { DataUpdateService } from './store/services/data-update.service';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({
  selector: 'app-root',
  imports: [
    MainToolbar,
    RouterModule,
    MatIconModule,
    DataIssueReportDialog,
    DataUpdateBannerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('Footy Stats - English Football Data');
  protected readonly showScrollTop = signal(false);
  protected readonly footerIssueContext = {
    pageTitle: 'FootyStats',
    sourcePath: 'Site footer',
  };
  private dataLoader = inject(DataLoaderService);
  private dataUpdates = inject(DataUpdateService);

  ngOnInit() {
    void this.dataLoader.loadData().then(() => this.dataUpdates.checkForUpdates());
  }

  @HostListener('window:scroll')
  protected onWindowScroll() {
    this.showScrollTop.set(globalThis.scrollY > 520);
  }

  protected scrollToTop() {
    const prefersReducedMotion = globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    globalThis.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }
}
