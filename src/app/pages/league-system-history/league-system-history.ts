import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { LeagueStore } from '@app/store/league.store';
import type { ExportSummary } from '@app/utils/data-export';
import {
  LEAGUE_SYSTEM_ERAS,
  leagueSystemExportRows,
  type LeagueSystemEra,
  type TierBand,
} from '@app/utils/league-system-history';

@Component({
  selector: 'app-league-system-history',
  imports: [CommonModule, RouterLink, MatIconModule, DataExportMenu],
  templateUrl: './league-system-history.html',
  styleUrl: './league-system-history.scss',
})
export class LeagueSystemHistory {
  private store = inject(LeagueStore);

  readonly eras = LEAGUE_SYSTEM_ERAS;
  readonly activeEraId = signal(this.eras.at(-1)?.id ?? '');
  readonly eraSelectorCollapsed = signal(true);

  activeEra = computed<LeagueSystemEra>(() => {
    const activeId = this.activeEraId();
    return this.eras.find((era) => era.id === activeId) ?? this.eras[this.eras.length - 1];
  });
  tableQueryParams = computed(() => {
    const { startSeason, endSeason } = this.activeEra();
    const seasons = this.store
      .getSeasonTiers()
      .filter(({ season, tiers }) => {
        return (
          season >= startSeason &&
          (endSeason === null || season <= endSeason) &&
          tiers.includes('tier1')
        );
      })
      .map(({ season }) => season);
    const season = seasons.length
      ? endSeason === null
        ? Math.max(...seasons)
        : Math.min(...seasons)
      : startSeason;
    return { season, tier: 'tier1' };
  });
  exportSummary = computed<ExportSummary>(() => ({
    page: 'League System History',
    eras: this.eras.length,
    selectedEra: this.activeEra().label,
    selectedHeadline: this.activeEra().headline,
  }));
  exportRows = computed(() => leagueSystemExportRows(this.eras));

  selectEra(eraId: string) {
    if (this.eras.some((era) => era.id === eraId)) {
      this.activeEraId.set(eraId);
      this.eraSelectorCollapsed.set(true);
    }
  }

  toggleEraSelector() {
    this.eraSelectorCollapsed.update((collapsed) => !collapsed);
  }

  eraRangeLabel(era: LeagueSystemEra): string {
    return era.endSeason === null
      ? `${era.startSeason}-present`
      : `${era.startSeason}-${era.endSeason}`;
  }

  tierKeyLabel(tier: TierBand): string {
    return tier.tierKeys.join(' / ');
  }
}
