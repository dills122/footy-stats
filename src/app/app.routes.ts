import type { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LeagueTableHistoric } from './pages/league-table-historic/league-table-historic';
import { TeamOverview } from './pages/team-overview/team-overview';
import { Teams } from './pages/teams/teams';

export const routes: Routes = [
  { path: 'dashboard', component: Home },
  { path: 'tables', component: LeagueTableHistoric },
  { path: 'teams', component: Teams },
  { path: 'team/:id', component: TeamOverview },
  //   { path: 'matches', component: MatchesComponent },
  //   { path: 'rankings', component: RankingsComponent },

  // optional redirect so "/" goes to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // catch-all route
  { path: '**', redirectTo: '/dashboard' },
];
