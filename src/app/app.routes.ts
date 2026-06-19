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
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'tables', component: LeagueTableHistoric },
  { path: 'system', component: LeagueSystemHistory },
  { path: 'movement', component: MovementExplorer },
  { path: 'rivalries', component: RivalryComparison },
  { path: 'leagues/:tier/deep-stats', component: LeagueDeepStats },
  { path: 'leagues/:tier', component: TierProfile },
  { path: 'teams/:clubId/deep-stats', component: TeamDeepStats },
  { path: 'teams/:clubId', component: TeamOverview },
  { path: 'teams', component: Teams },
  //   { path: 'matches', component: MatchesComponent },
  //   { path: 'rankings', component: RankingsComponent },

  // catch-all route
  { path: '**', redirectTo: '' },
];
