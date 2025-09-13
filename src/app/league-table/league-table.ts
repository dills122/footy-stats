import { Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
export interface LeagueTeam {
  team: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  goalDifference: number;
}

@Component({
  selector: 'app-league-table',
  templateUrl: './league-table.html',
  imports: [MatTableModule],
})
export class LeagueTableComponent {
  @Input() leagueTable: LeagueTeam[] = [];

  displayedColumns: string[] = [
    'position',
    'team',
    'played',
    'won',
    'draw',
    'lost',
    'goalsFor',
    'goalsAgainst',
    'goalDifference',
    'points',
  ];

  get sortedTable(): LeagueTeam[] {
    return [...this.leagueTable].sort(
      (a, b) => b.points - a.points || b.goalDifference - a.goalDifference
    );
  }
}
