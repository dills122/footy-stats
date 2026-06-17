import { Component, inject, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { DataIssueReportDialog } from '@app/components/data-issue-report-dialog/data-issue-report-dialog';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import type { LeagueTableView } from '@app/types';
import type { DataIssueReportContext } from '@app/utils/data-issue-report';

@Component({
  selector: 'app-league-table',
  templateUrl: './league-table.html',
  styleUrls: ['./league-table.scss'],
  imports: [MatTableModule, RouterLink, DataIssueReportDialog],
  providers: [LeagueTierToStringyPipe],
})
export class LeagueTableComponent {
  @Input() leagueTable: LeagueTableView[] = [];

  private leagueLabelPipe = inject(LeagueTierToStringyPipe);

  displayedColumns: string[] = [
    'position',
    'teamName',
    'played',
    'won',
    'drawn',
    'lost',
    'goalsFor',
    'goalsAgainst',
    'goalDifference',
    'points',
    'report',
  ];

  get sortedTable(): LeagueTableView[] {
    return [...this.leagueTable].sort(
      (a, b) => b.points - a.points || (b.goalDifference ?? 0) - (a.goalDifference ?? 0)
    );
  }

  dataIssueContextForRow(row: LeagueTableView): DataIssueReportContext {
    return {
      pageTitle: 'League table row',
      sourcePath: `/tables season ${row.season} ${row.tier}`,
      clubName: row.teamName,
      season: row.season,
      competition: this.leagueLabelPipe.transform(row.tier) || row.tier,
    };
  }
}
