import { Component, computed, inject } from '@angular/core';
import { TeamList } from '@app/components/team-list/team-list';
import { LeagueStore } from '@app/store/league.store';

@Component({
  selector: 'app-teams',
  imports: [TeamList],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams {
  private store = inject(LeagueStore);

  // Add a computed signal so it automatically re-evaluates once hydrated
  teams = computed(() => {
    const teams = this.store.getTeams();
    return teams?.map((t) => t.name) ?? [];
  });
}
