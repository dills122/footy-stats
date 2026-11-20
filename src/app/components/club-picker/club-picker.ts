import { Component, computed, input, output, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import type { Team } from '@app/store/league.models';
import { normalizeClubSearchText } from '@app/utils/club-aliases';

@Component({
  selector: 'app-club-picker',
  imports: [MatAutocompleteModule],
  template: `
    <label class="app-search-field">
      <span>{{ label() }}</span>
      <input
        #field
        type="text"
        placeholder="Search by club name"
        autocomplete="off"
        [value]="selectedClub()?.name ?? ''"
        [matAutocomplete]="options"
        (focus)="field.select()"
        (input)="query.set(field.value)"
      />
    </label>
    <mat-autocomplete
      #options="matAutocomplete"
      class="app-club-options"
      autoActiveFirstOption
      [displayWith]="clubName"
      (optionSelected)="selectClub($event.option.value)"
      (closed)="closeSearch(field)"
    >
      @for (club of matches(); track club.id) {
        <mat-option [value]="club">{{ club.name }}</mat-option>
      } @empty {
        <mat-option disabled>No matching clubs</mat-option>
      }
    </mat-autocomplete>
  `,
})
export class ClubPicker {
  readonly label = input.required<string>();
  readonly clubs = input.required<readonly Team[]>();
  readonly selectedClub = input<Team | null>(null);
  readonly clubSelected = output<Team>();

  protected readonly query = signal('');
  private optionChosen = false;
  protected readonly matches = computed(() => {
    const query = normalizeClubSearchText(this.query());
    return query
      ? this.clubs().filter((club) => normalizeClubSearchText(club.name).includes(query))
      : this.clubs();
  });

  protected clubName(club: Team | null): string {
    return club?.name ?? '';
  }

  protected selectClub(club: Team) {
    this.optionChosen = true;
    this.clubSelected.emit(club);
  }

  protected closeSearch(field: HTMLInputElement) {
    if (!this.optionChosen) field.value = this.selectedClub()?.name ?? '';
    this.optionChosen = false;
    this.query.set('');
  }
}
