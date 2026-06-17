import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { ClubMetadata, ClubMetadataDocument, ClubMetadataState } from './club-metadata.models';

function normalizeClubMetadataKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nameSeasonKey(teamName: string, season: number): string {
  return `${normalizeClubMetadataKey(teamName)}:${season}`;
}

export const ClubMetadataStore = signalStore(
  { providedIn: 'root' },
  withState<ClubMetadataState>({
    clubs: {},
    generatedAt: null,
  }),
  withMethods((store) => {
    let clubIdIndex = new Map<string, ClubMetadata>();
    let aliasIndex = new Map<string, string>();
    let nameSeasonIndex = new Map<string, string>();

    return {
      hydrate(document: ClubMetadataDocument) {
        clubIdIndex = new Map<string, ClubMetadata>();
        aliasIndex = new Map<string, string>();
        nameSeasonIndex = new Map<string, string>();
        const clubs: Record<string, ClubMetadata> = {};

        Object.entries(document.clubs).forEach(([clubId, metadataRecord]) => {
          const metadata = { ...metadataRecord, clubId };
          clubs[clubId] = metadata;
          clubIdIndex.set(clubId, metadata);

          metadata.derived.aliases.forEach((alias) => {
            aliasIndex.set(normalizeClubMetadataKey(alias), clubId);
          });

          metadata.derived.observedNames.forEach((observedName) => {
            observedName.seasonsSeen.forEach((season) => {
              nameSeasonIndex.set(nameSeasonKey(observedName.rawName, season), clubId);
            });
          });
        });

        patchState(store, {
          clubs,
          generatedAt: document.metadata.generatedAt,
        });
      },
      getAllClubMetadata(): Record<string, ClubMetadata> {
        return store.clubs();
      },
      getGeneratedAt(): string | null {
        return store.generatedAt();
      },
      getClubById(clubId: string): ClubMetadata | null {
        return clubIdIndex.get(clubId) ?? null;
      },
      getClubIdForTeamSeason(teamName: string, season: number): string | null {
        return nameSeasonIndex.get(nameSeasonKey(teamName, season)) ?? null;
      },
      getClubByTeamSeason(teamName: string, season: number): ClubMetadata | null {
        const clubId = this.getClubIdForTeamSeason(teamName, season);
        return clubId ? this.getClubById(clubId) : null;
      },
      getClubByAlias(alias: string): ClubMetadata | null {
        const clubId = aliasIndex.get(normalizeClubMetadataKey(alias));
        return clubId ? this.getClubById(clubId) : null;
      },
    };
  })
);
