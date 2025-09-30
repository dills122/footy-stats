import { Component } from '@angular/core';
import { LeagueTablesViewerComponent } from '@app/components/league-tables-viewer/league-tables-viewer';

@Component({
  selector: 'app-league-table-historic',
  imports: [LeagueTablesViewerComponent],
  templateUrl: './league-table-historic.html',
  styleUrl: './league-table-historic.scss',
})
export class LeagueTableHistoric {}
