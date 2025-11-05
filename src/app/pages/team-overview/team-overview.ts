import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamLinks } from '@app/components/team-links/team-links';
import { LeagueStore } from '@app/store/league.store';

@Component({
  selector: 'app-team-overview',
  imports: [TeamLinks, MatIconModule, MatButtonModule],
  templateUrl: './team-overview.html',
  styleUrl: './team-overview.scss',
})
export class TeamOverview {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paramMap = toSignal(this.route.paramMap);
  teamId = computed(() => this.paramMap()?.get('id') ?? '');

  private store = inject(LeagueStore);

  // ✅ Now reactive:
  teamOverview = computed(() => this.store.getTeamOverview(Number(this.teamId())));
  teamName = computed(() => this.teamOverview()?.team.name ?? '');

  // ✅ Log whenever teamOverview has a value
  // logEffect = effect(() => {
  //   const overview = this.teamOverview();
  //   if (overview) {
  //     console.log('teamOverview:', overview);
  //   }
  // });

  goBack() {
    this.router.navigate(['/teams']);
  }
}
