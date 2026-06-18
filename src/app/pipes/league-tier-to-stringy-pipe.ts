import { Pipe, PipeTransform } from '@angular/core';

const tierToStringy: Record<string, string> = {
  tier1: 'Premier League',
  tier2: 'Championship',
  tier3: 'League One',
  tier4: 'League Two',
  tier5: 'National League',
  tier6: 'National League North',
  tier7: 'National League South',
};

@Pipe({
  name: 'leagueTierToStringy',
})
export class LeagueTierToStringyPipe implements PipeTransform {
  transform(value: string): string {
    return tierToStringy[value] ?? '';
  }
}
