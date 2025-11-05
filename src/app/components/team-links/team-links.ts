import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { build11v11Links, buildWikipediaLinks, buildWorldFootballLink } from '@app/utils';

@Component({
  selector: 'app-team-links',
  imports: [CommonModule],
  templateUrl: './team-links.html',
  styleUrl: './team-links.scss',
})
export class TeamLinks {
  @Input({
    required: true,
  })
  teamName = '';
  @Input() textAlign: 'left' | 'center' | 'right' = 'left';

  createWikipediaLink(club: string): string {
    return buildWikipediaLinks([club])[club];
  }

  createWorldFootballLink(club: string): string {
    return buildWorldFootballLink(club);
  }

  create11v11Link(club: string): string {
    const links = build11v11Links([club]);
    return links[club];
  }
}
