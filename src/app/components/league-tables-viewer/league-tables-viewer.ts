import { Component } from '@angular/core';
import type { LeagueTeam } from '../league-table/league-table';
import { LeagueTableComponent } from '../league-table/league-table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface LeagueData {
  year: string;
  leagueName: string;
  table: LeagueTeam[];
}

@Component({
  selector: 'app-league-tables-viewer',
  templateUrl: './league-tables-viewer.html',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    LeagueTableComponent,
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class LeagueTablesViewerComponent {
  // Mock data: You can structure this from your API or JSON files
  leagueData: LeagueData[] = [
    {
      year: '1888-1889',
      leagueName: 'English First Division',
      table: [
        {
          team: 'Preston North End',
          played: 22,
          won: 18,
          draw: 4,
          lost: 0,
          goalsFor: 74,
          goalsAgainst: 15,
          points: 58,
          goalDifference: 59,
        },
        {
          team: 'Aston Villa',
          played: 22,
          won: 12,
          draw: 5,
          lost: 5,
          goalsFor: 61,
          goalsAgainst: 43,
          points: 41,
          goalDifference: 18,
        },
      ],
    },
    {
      year: '1889-1890',
      leagueName: 'English First Division',
      table: [
        {
          team: 'Preston North End',
          played: 22,
          won: 15,
          draw: 5,
          lost: 2,
          goalsFor: 70,
          goalsAgainst: 20,
          points: 50,
          goalDifference: 50,
        },
      ],
    },
  ];

  years: string[] = [...new Set(this.leagueData.map((ld) => ld.year))];
  leaguesForYear: string[] = [];

  selectedYear?: string;
  selectedLeague?: string;

  get currentTable(): LeagueTeam[] | null {
    if (!this.selectedYear || !this.selectedLeague) return null;
    return (
      this.leagueData.find(
        (ld) =>
          ld.year === this.selectedYear && ld.leagueName === this.selectedLeague
      )?.table ?? null
    );
  }

  onYearChange(year: string) {
    this.selectedYear = year;
    this.selectedLeague = undefined; // reset league selection
    this.leaguesForYear = [
      ...new Set(
        this.leagueData
          .filter((ld) => ld.year === year)
          .map((ld) => ld.leagueName)
      ),
    ];
  }
}
