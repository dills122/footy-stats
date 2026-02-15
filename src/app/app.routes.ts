import type { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LeagueTableHistoric } from './pages/league-table-historic/league-table-historic';
import { MovementExplorer } from './pages/movement-explorer/movement-explorer';
import { Teams } from './pages/teams/teams';

export const routes: Routes = [
  { path: 'dashboard', component: Home },
  { path: 'tables', component: LeagueTableHistoric },
  { path: 'movement', component: MovementExplorer },
  { path: 'teams', component: Teams },
  //   { path: 'matches', component: MatchesComponent },
  //   { path: 'rankings', component: RankingsComponent },

  // optional redirect so "/" goes to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // catch-all route
  { path: '**', redirectTo: '/dashboard' },
];
