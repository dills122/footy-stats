import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';

@Component({
  selector: 'app-season-summary-card',
  templateUrl: './season-summary-card.html',
  imports: [CommonModule, MatCardModule],
})
export class SeasonSummaryCardComponent implements OnChanges {
  store = inject(LeagueStore);
  @Input() tableData: LeagueTableView[] = [];

  champion?: string;
  topScoringTeam?: string;
  bestDefense?: string;
  avgGoalsPerGame?: number;
  promotedTeams: string[] = [];
  relegatedTeams: string[] = [];

  ngOnChanges(): void {
    if (!this.tableData?.length) return;

    const tier = this.tableData[0].tier;
    const season = this.tableData[0].season;

    // Champion = team with highest points
    const sortedByPoints = [...this.tableData].sort((a, b) => b.points - a.points);
    this.champion = sortedByPoints[0].teamName;

    // Top Scoring = most goalsFor
    const topScorer = [...this.tableData].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    this.topScoringTeam = topScorer.teamName;

    // Best Defense = fewest goalsAgainst
    const bestDef = [...this.tableData].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
    this.bestDefense = bestDef.teamName;

    // Avg Goals per Game = total GF / total P
    const totalGF = this.tableData.reduce((sum, t) => sum + t.goalsFor, 0);
    const totalGames = this.tableData.reduce((sum, t) => sum + t.played, 0);
    this.avgGoalsPerGame = +(totalGF / totalGames).toFixed(2);

    // Promotion/Relegation)
    const { promoted, relegated } = this.store.getPromotionRelegationInfo(season, tier);
    this.promotedTeams = promoted.map((t) => t.name);
    this.relegatedTeams = relegated.map((t) => t.name);
  }
}
