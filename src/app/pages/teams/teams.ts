import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  // Add a computed signal so it automatically re-evaluates once hydrated
  teams = computed(() => {
    const teams = this.store.getTeams();
    return teams?.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  });

  selectedLetter = computed(() => {
    const rawLetter = this.queryParamMap().get('letter') ?? '';
    const letter = rawLetter.trim().toUpperCase();
    return /^[A-Z]$/.test(letter) ? letter : '';
  });

  onLetterSelected(letter: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { letter: letter || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
