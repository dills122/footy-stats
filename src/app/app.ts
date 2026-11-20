import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, pairwise } from 'rxjs';
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
  protected readonly showScrollTop = signal(false);
  protected readonly footerIssueContext = {
    pageTitle: 'FootyStats',
    sourcePath: 'Site footer',
  };
  private dataLoader = inject(DataLoaderService);
  private dataUpdates = inject(DataUpdateService);
  private router = inject(Router);
  private injector = inject(Injector);
  private mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        pairwise(),
        takeUntilDestroyed()
      )
      .subscribe(([previous, current]) => {
        const [previousPath] = previous.urlAfterRedirects.split(/[?#]/, 1);
        const [currentPath] = current.urlAfterRedirects.split(/[?#]/, 1);
        // Query changes keep focus on the search or filter the user is operating.
        if (previousPath === currentPath) return;

        afterNextRender(() => this.focusPage(), { injector: this.injector });
      });
  }

  ngOnInit() {
    void this.dataLoader.loadData().then(() => this.dataUpdates.checkForUpdates());
  }

  protected skipToMain(event: MouseEvent) {
    event.preventDefault();
    this.mainContent().nativeElement.focus();
  }

  private focusPage() {
    const main = this.mainContent().nativeElement;
    const target = main.querySelector('h1') ?? main;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
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
