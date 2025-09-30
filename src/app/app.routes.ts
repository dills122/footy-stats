import type { Routes } from '@angular/router';
import { LeagueTableHistoric } from './pages/league-table-historic/league-table-historic';

export const routes: Routes = [
  { path: 'dashboard', component: LeagueTableHistoric },
  //   { path: 'teams', component: TeamsComponent },
  //   { path: 'matches', component: MatchesComponent },
  //   { path: 'rankings', component: RankingsComponent },

  // optional redirect so "/" goes to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // catch-all route
  { path: '**', redirectTo: '/dashboard' },
];
