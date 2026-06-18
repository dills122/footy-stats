import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';

export interface ClubNameReference {
  name: string;
  clubId: string | null;
}

const MOVEMENT_TEAM_PREVIEW_LIMIT = 4;

@Component({
  selector: 'app-season-summary-card',
  templateUrl: './season-summary-card.html',
  styleUrl: './season-summary-card.scss',
  imports: [CommonModule, RouterLink],
})
export class SeasonSummaryCardComponent implements OnChanges {
  store = inject(LeagueStore);
  @Input() tableData: LeagueTableView[] = [];

  champion?: ClubNameReference;
  topScoringTeam?: ClubNameReference;
  bestDefense?: ClubNameReference;
  avgGoalsPerGame?: number;
  promotedTeams: ClubNameReference[] = [];
  relegatedTeams: ClubNameReference[] = [];
  promotedExpanded = false;
  relegatedExpanded = false;

  ngOnChanges(): void {
    if (!this.tableData?.length) return;

    this.promotedExpanded = false;
    this.relegatedExpanded = false;

    const tier = this.tableData[0].tier;
    const season = this.tableData[0].season;

    // Champion = team with highest points
    const sortedByPoints = [...this.tableData].sort((a, b) => b.points - a.points);
    this.champion = this.tableEntryReference(sortedByPoints[0]);

    // Top Scoring = most goalsFor
    const topScorer = [...this.tableData].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    this.topScoringTeam = this.tableEntryReference(topScorer);

    // Best Defense = fewest goalsAgainst
    const bestDef = [...this.tableData].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
    this.bestDefense = this.tableEntryReference(bestDef);

    // Avg Goals per Game = total GF / total P
    const totalGF = this.tableData.reduce((sum, t) => sum + t.goalsFor, 0);
    const totalGames = this.tableData.reduce((sum, t) => sum + t.played, 0);
    this.avgGoalsPerGame = +(totalGF / totalGames).toFixed(2);

    // Promotion/Relegation)
    const { promoted, relegated } = this.store.getPromotionRelegationInfo(season, tier);
    this.promotedTeams = promoted.map((team) => ({
      name: team.name,
      clubId: team.clubIds[0] ?? null,
    }));
    this.relegatedTeams = relegated.map((team) => ({
      name: team.name,
      clubId: team.clubIds[0] ?? null,
    }));
  }

  movementPreviewTeams(teams: readonly ClubNameReference[]): readonly ClubNameReference[] {
    return teams.slice(0, MOVEMENT_TEAM_PREVIEW_LIMIT);
  }

  movementOverflowTeams(teams: readonly ClubNameReference[]): readonly ClubNameReference[] {
    return teams.slice(MOVEMENT_TEAM_PREVIEW_LIMIT);
  }

  visibleMovementTeams(
    teams: readonly ClubNameReference[],
    expanded: boolean
  ): readonly ClubNameReference[] {
    return expanded ? teams : this.movementPreviewTeams(teams);
  }

  togglePromotedExpanded() {
    this.promotedExpanded = !this.promotedExpanded;
  }

  toggleRelegatedExpanded() {
    this.relegatedExpanded = !this.relegatedExpanded;
  }

  private tableEntryReference(entry: LeagueTableView): ClubNameReference {
    return {
      name: entry.teamName,
      clubId: entry.clubId,
    };
  }
}
