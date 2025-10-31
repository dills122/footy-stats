// home.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class Home {
  private store = inject(LeagueStore);

  teamsCount = computed(() => {
    const teams = this.store.getTeams(); // <- reactive getter
    return teams?.length ?? 0;
  });
  seasonsCount = computed(() => {
    const seasonsAndTiers = this.store.getSeasons(); // <- reactive getter
    return seasonsAndTiers?.length ?? 0;
  });
}
