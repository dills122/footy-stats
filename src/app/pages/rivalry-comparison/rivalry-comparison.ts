import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LeagueTableEntry, Team } from '@app/store/league.models';
import { LeagueStore } from '@app/store/league.store';
import { buildClubIdentityTeamIndex } from '@app/utils/club-aliases';

interface RivalrySeasonRow {
  season: number;
  first: RivalryEntryView;
  second: RivalryEntryView;
  leader: 'first' | 'second' | 'level';
  leaderLabel: string;
}

interface RivalryEntryView {
  teamName: string;
  clubId: string | null;
  tier: string;
  tierLabel: string;
  position: number;
  points: number;
}

interface RivalryScorecard {
  sharedSeasons: number;
  firstHigher: number;
  secondHigher: number;
  level: number;
  sameTier: number;
}

@Component({
  selector: 'app-rivalry-comparison',
  imports: [CommonModule, RouterLink],
  templateUrl: './rivalry-comparison.html',
  styleUrl: './rivalry-comparison.scss',
})
export class RivalryComparison {
  private store = inject(LeagueStore);

  firstTeamId = signal<number | null>(null);
  secondTeamId = signal<number | null>(null);

  teams = computed(() =>
    this.store
      .getTeams()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  selectedTeams = computed(() => {
    const first = this.teamById(this.firstTeamId());
    const second = this.teamById(this.secondTeamId());
    return {
      first,
      second,
    };
  });
  comparisonRows = computed<RivalrySeasonRow[]>(() => {
    const firstTeamId = this.firstTeamId();
    const secondTeamId = this.secondTeamId();
    const teams = this.teams();

    if (!firstTeamId || !secondTeamId || firstTeamId === secondTeamId) {
      return [];
    }

    const selectedIdByTeamId = buildClubIdentityTeamIndex([firstTeamId, secondTeamId], teams);
    const entriesBySelectedTeam = new Map<number, Map<number, LeagueTableEntry>>();

    this.store.getFullTable().forEach((entry) => {
      const selectedTeamId = selectedIdByTeamId.get(entry.teamId);
      if (!selectedTeamId) {
        return;
      }

      const entriesBySeason = entriesBySelectedTeam.get(selectedTeamId) ?? new Map();
      const existing = entriesBySeason.get(entry.season);
      if (!existing || this.compareEntryStanding(entry, existing) < 0) {
        entriesBySeason.set(entry.season, entry);
      }
      entriesBySelectedTeam.set(selectedTeamId, entriesBySeason);
    });

    const firstEntries = entriesBySelectedTeam.get(firstTeamId) ?? new Map();
    const secondEntries = entriesBySelectedTeam.get(secondTeamId) ?? new Map();

    return Array.from(firstEntries.keys())
      .filter((season) => secondEntries.has(season))
      .sort((a, b) => b - a)
      .map((season) => {
        const first = this.entryView(firstEntries.get(season)!);
        const second = this.entryView(secondEntries.get(season)!);
        const comparison = this.compareEntryStanding(
          firstEntries.get(season)!,
          secondEntries.get(season)!
        );
        const leader = comparison < 0 ? 'first' : comparison > 0 ? 'second' : 'level';

        return {
          season,
          first,
          second,
          leader,
          leaderLabel:
            leader === 'first'
              ? `${first.teamName} higher`
              : leader === 'second'
                ? `${second.teamName} higher`
                : 'Level',
        };
      });
  });
  scorecard = computed<RivalryScorecard>(() => {
    const rows = this.comparisonRows();
    return {
      sharedSeasons: rows.length,
      firstHigher: rows.filter((row) => row.leader === 'first').length,
      secondHigher: rows.filter((row) => row.leader === 'second').length,
      level: rows.filter((row) => row.leader === 'level').length,
      sameTier: rows.filter((row) => row.first.tier === row.second.tier).length,
    };
  });
  recentRows = computed(() => this.comparisonRows().slice(0, 16));

  constructor() {
    effect(() => {
      const teams = this.teams();
      if (teams.length < 2 || (this.firstTeamId() && this.secondTeamId())) {
        return;
      }

      const first = teams.find((team) => team.name === 'Arsenal') ?? teams[0];
      const second =
        teams.find((team) => team.name === 'Tottenham Hotspur' && team.id !== first.id) ??
        teams.find((team) => team.id !== first.id);

      this.firstTeamId.set(first.id);
      this.secondTeamId.set(second?.id ?? null);
    });
  }

  onFirstTeamChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.firstTeamId.set(parsed);
    if (this.secondTeamId() === parsed) {
      this.secondTeamId.set(this.teams().find((team) => team.id !== parsed)?.id ?? null);
    }
  }

  onSecondTeamChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.secondTeamId.set(parsed);
    if (this.firstTeamId() === parsed) {
      this.firstTeamId.set(this.teams().find((team) => team.id !== parsed)?.id ?? null);
    }
  }

  tierLabel(tier: string): string {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `Tier ${parsed}` : tier;
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

  private teamById(teamId: number | null): Team | null {
    return teamId ? (this.store.getTeamById(teamId) ?? null) : null;
  }

  private entryView(entry: LeagueTableEntry): RivalryEntryView {
    return {
      teamName: this.store.getTeamNameById(entry.teamId),
      clubId: entry.clubId,
      tier: entry.tier,
      tierLabel: this.tierLabel(entry.tier),
      position: entry.pos,
      points: entry.points,
    };
  }

  private compareEntryStanding(first: LeagueTableEntry, second: LeagueTableEntry): number {
    const tierDifference = this.tierRank(first.tier) - this.tierRank(second.tier);
    if (tierDifference !== 0) {
      return tierDifference;
    }

    return first.pos - second.pos;
  }

  private tierRank(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }
}
