import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { LeagueTableEntry } from '@app/store/league.models';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { buildClubDerivedGaps, buildClubDisplayNamePeriods } from '@app/utils/club-identity-ranges';

const TIER_LABELS: Record<string, string> = {
  tier1: 'Premier League',
  tier2: 'Championship',
  tier3: 'League One',
  tier4: 'League Two',
  tier5: 'National League',
  tier6: 'National League North',
  tier7: 'National League South',
};

@Component({
  selector: 'app-team-overview',
  imports: [CommonModule, RouterLink],
  templateUrl: './team-overview.html',
  styleUrl: './team-overview.scss',
})
export class TeamOverview {
  private route = inject(ActivatedRoute);
  private clubMetadataStore = inject(ClubMetadataStore);
  private leagueStore = inject(LeagueStore);

  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  clubId = computed(() => this.paramMap().get('clubId') ?? '');
  metadataLoaded = computed(() => Boolean(this.clubMetadataStore.getGeneratedAt()));
  club = computed(() => this.clubMetadataStore.getClubById(this.clubId()));
  entries = computed(() =>
    this.leagueStore
      .getEntriesByClubId(this.clubId())
      .slice()
      .sort((a, b) => b.season - a.season || this.tierRank(a.tier) - this.tierRank(b.tier))
  );
  seasons = computed(() => this.club()?.derived.seasonsSeen ?? []);
  latestDataSeason = computed(() => this.leagueStore.getSeasons().at(-1) ?? null);
  statusLabel = computed(() => {
    const club = this.club();
    if (!club) {
      return 'unknown';
    }

    if (club.status?.current) {
      return club.status.current;
    }

    return club.derived.lastSeenSeason === this.latestDataSeason() ? 'active' : 'historical';
  });
  teamNames = computed(() =>
    Array.from(
      new Set(this.entries().map((entry) => this.leagueStore.getTeamNameById(entry.teamId)))
    )
  );
  latestEntry = computed(() => this.entries()[0] ?? null);
  topTierBestFinish = computed(() => {
    const topTierEntries = this.entries().filter((entry) => entry.tier === 'tier1');
    if (!topTierEntries.length) {
      return null;
    }

    return topTierEntries.reduce((best, entry) => (entry.pos < best.pos ? entry : best));
  });
  tierSummary = computed(() => {
    const counts = new Map<string, number>();
    this.entries().forEach((entry) => counts.set(entry.tier, (counts.get(entry.tier) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([tier, count]) => ({ tier, label: this.tierLabel(tier), count }))
      .sort((a, b) => this.tierRank(a.tier) - this.tierRank(b.tier));
  });
  movementSummary = computed(() => {
    const entries = this.entries();
    return {
      promoted: entries.filter((entry) => entry.wasPromoted).length,
      relegated: entries.filter((entry) => entry.wasRelegated).length,
      reprieved: entries.filter((entry) => entry.wasReprieved).length,
    };
  });
  relationshipRows = computed(
    () =>
      this.club()?.derived.relationships?.map((relationship) => ({
        ...relationship,
        relatedName:
          this.clubMetadataStore.getClubById(relationship.clubKey)?.canonicalName ??
          relationship.clubKey,
      })) ?? []
  );
  displayNamePeriods = computed(() =>
    buildClubDisplayNamePeriods(this.club()?.derived.observedNamePeriods ?? [])
  );
  gapRows = computed(() => {
    const explicitGaps = this.club()?.history?.absenceExplanations ?? [];
    if (explicitGaps.length) {
      return explicitGaps.map((gap) => ({
        fromSeason: gap.fromSeason,
        toSeason: gap.toSeason,
        reason: gap.reason || gap.basis || 'Recorded absence',
        isOfficialSuspension: false,
      }));
    }

    return buildClubDerivedGaps(this.club()?.derived.observedNamePeriods ?? []);
  });
  recentEntries = computed(() => this.entries().slice(0, 12));

  tierLabel(tier: string): string {
    return TIER_LABELS[tier] ?? tier;
  }

  entryLabel(entry: LeagueTableEntry | null): string {
    if (!entry) {
      return 'No table record';
    }
    return `${entry.season} / ${this.tierLabel(entry.tier)} / ${this.ordinal(entry.pos)}`;
  }

  ordinal(value: number): string {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return `${value}th`;
    }

    const suffixByMod10: Record<number, string> = {
      1: 'st',
      2: 'nd',
      3: 'rd',
    };
    return `${value}${suffixByMod10[value % 10] ?? 'th'}`;
  }

  private tierRank(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }
}
