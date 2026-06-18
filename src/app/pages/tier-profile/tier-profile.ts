import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import {
  buildTierProfileData,
  type TierClubTotal,
  type TierRaceRow,
} from '@app/utils/tier-profile';

@Component({
  selector: 'app-tier-profile',
  imports: [CommonModule, MatButtonModule, RouterLink],
  providers: [LeagueTierToStringyPipe],
  templateUrl: './tier-profile.html',
  styleUrl: './tier-profile.scss',
})
export class TierProfile {
  private route = inject(ActivatedRoute);
  private store = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private tierLabelPipe = inject(LeagueTierToStringyPipe);
  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  tierId = computed(() => this.paramMap().get('tier') ?? '');
  hasArchiveData = computed(() => this.store.getFullTable().length > 0);
  showLoadingState = computed(() => !this.hasArchiveData() && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.hasArchiveData() && this.dataLoader.loadStatus() === 'error');
  profile = computed(() => {
    const tier = this.tierId();
    if (!/^tier\d+$/.test(tier)) {
      return null;
    }

    const profile = buildTierProfileData(this.store.getFullTable(), tier, (teamId) =>
      this.store.getTeamById(teamId)
    );
    return profile.totalRows ? profile : null;
  });

  tierLabel = computed(() => this.formatTierLabel(this.tierId()));
  sourceTierLabel = computed(() => {
    const sourceTier = this.adjacentLowerTier(this.tierId());
    return sourceTier ? this.formatTierLabel(sourceTier) : '';
  });

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  seasonRangeLabel(): string {
    const seasons = this.profile()?.seasons ?? [];
    if (!seasons.length) {
      return 'No seasons';
    }

    const first = seasons[0];
    const latest = seasons.at(-1);
    return first === latest ? String(first) : `${first}-${latest}`;
  }

  tableQueryParams(season: number): { season: number; tier: string } {
    return {
      season,
      tier: this.tierId(),
    };
  }

  sourceTableQueryParams(season: number): { season: number; tier: string } {
    return {
      season,
      tier: this.adjacentLowerTier(this.tierId()) ?? this.tierId(),
    };
  }

  movementRows(rows: TierClubTotal[]): TierClubTotal[] {
    return rows.slice(0, 6);
  }

  raceRows(rows: TierRaceRow[]): TierRaceRow[] {
    return rows.slice(0, 5);
  }

  private formatTierLabel(tier: string): string {
    return this.tierLabelPipe.transform(tier) || this.fallbackTierLabel(tier);
  }

  private fallbackTierLabel(tier: string): string {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `Tier ${parsed}` : 'Unknown tier';
  }

  private adjacentLowerTier(tier: string): string | null {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `tier${parsed + 1}` : null;
  }
}
