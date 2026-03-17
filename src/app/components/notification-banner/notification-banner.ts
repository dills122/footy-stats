import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type NotificationBannerVariant = 'warning' | 'success' | 'info';

@Component({
  selector: 'app-notification-banner',
  imports: [CommonModule],
  templateUrl: './notification-banner.html',
  styleUrl: './notification-banner.scss',
})
export class NotificationBannerComponent {
  @Input() title = '';
  @Input() variant: NotificationBannerVariant = 'info';

  get ariaRole(): 'alert' | 'status' {
    return this.variant === 'warning' ? 'alert' : 'status';
  }
}
