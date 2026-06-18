import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataUpdateService } from '@app/store/services/data-update.service';

@Component({
  selector: 'app-data-update-banner',
  imports: [DatePipe],
  templateUrl: './data-update-banner.html',
  styleUrl: './data-update-banner.scss',
})
export class DataUpdateBannerComponent {
  protected readonly dataUpdates = inject(DataUpdateService);
  protected readonly currentStatus = computed(() => {
    const installStatus = this.dataUpdates.installStatus();
    if (installStatus !== 'idle') {
      return installStatus;
    }

    return this.dataUpdates.checkStatus();
  });
  protected readonly isBusy = computed(() =>
    ['checking', 'downloading', 'verifying'].includes(this.currentStatus())
  );
  protected readonly shouldShow = computed(
    () =>
      this.dataUpdates.updateAvailable() ||
      this.dataUpdates.hasLocalOverride() ||
      this.dataUpdates.installStatus() === 'installed' ||
      this.dataUpdates.checkStatus() === 'error' ||
      this.dataUpdates.installStatus() === 'error'
  );

  protected async installUpdate() {
    await this.dataUpdates.installLatestUpdate();
  }

  protected async clearOverride() {
    await this.dataUpdates.clearLocalOverride();
  }
}
