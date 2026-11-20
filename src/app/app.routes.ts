import type { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { LeagueDeepStats } from './pages/league-deep-stats/league-deep-stats';
import { LeagueSystemHistory } from './pages/league-system-history/league-system-history';
import { LeagueTableHistoric } from './pages/league-table-historic/league-table-historic';
import { MovementExplorer } from './pages/movement-explorer/movement-explorer';
import { RivalryComparison } from './pages/rivalry-comparison/rivalry-comparison';
import { TeamDeepStats } from './pages/team-deep-stats/team-deep-stats';
import { TeamOverview } from './pages/team-overview/team-overview';
import { Teams } from './pages/teams/teams';
import { TierProfile } from './pages/tier-profile/tier-profile';

export const routes: Routes = [
  { path: '', component: Home, title: 'English Football Archive | FootyStats', pathMatch: 'full' },
  { path: 'tables', component: LeagueTableHistoric, title: 'League Tables | FootyStats' },
  { path: 'system', component: LeagueSystemHistory, title: 'League System History | FootyStats' },
  { path: 'movement', component: MovementExplorer, title: 'Club Movement Explorer | FootyStats' },
  { path: 'rivalries', component: RivalryComparison, title: 'Club Comparisons | FootyStats' },
  {
    path: 'leagues/:tier/deep-stats',
    component: LeagueDeepStats,
    title: 'League Deep Stats | FootyStats',
  },
  { path: 'leagues/:tier', component: TierProfile, title: 'Tier Profile | FootyStats' },
  {
    path: 'teams/:clubId/deep-stats',
    component: TeamDeepStats,
    title: 'Club Deep Stats | FootyStats',
  },
  { path: 'teams/:clubId', component: TeamOverview, title: 'Club Profile | FootyStats' },
  { path: 'teams', component: Teams, title: 'Club Directory | FootyStats' },
  //   { path: 'matches', component: MatchesComponent },
  //   { path: 'rankings', component: RankingsComponent },

  // catch-all route
  { path: '**', redirectTo: '' },
];
