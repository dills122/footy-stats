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

  teams = computed(() => {
    const teams = this.store.getTeams();
    return teams;
  });

  onLetterSelected(letter: string | null) {
    console.log('Selected letter:', letter);
  }
}
