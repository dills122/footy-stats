export interface DataAssetMetadata {
  schemaVersion: number;
  generator: string;
  generatedAt: string;
  gitSha: string;
  sourceFiles?: string[];
  buildOptions?: Record<string, unknown>;
}

export interface ClubMetadataSourceRef {
  type: string;
  sourceUrl?: string;
  notes?: string;
}

export interface ClubMetadataStatus {
  current: 'active' | 'unknown' | string;
  trackedFromSeason: number | null;
  trackedToSeason: number | null;
  hasUnexplainedGaps: boolean;
  reason?: string;
  reasonLabel?: string;
  sourceRefs?: ClubMetadataSourceRef[];
}

export interface ClubMetadataSeasonRange {
  fromSeason: number;
  toSeason: number | null;
  tiers?: string[];
  basis?: string;
  reason?: string;
}

export interface ClubMetadataRelationship {
  clubKey: string;
  relationship: string;
  direction: string;
  sourceRefs?: ClubMetadataSourceRef[];
}

export interface ClubMetadataObservedName {
  rawName: string;
  normalizedName: string;
  firstSeenSeason: number;
  lastSeenSeason: number;
  seasonsSeen: number[];
  tiersSeen: string[];
}

export interface ClubMetadataRecord {
  canonicalName: string;
  status?: ClubMetadataStatus;
  history?: {
    nameHistory: unknown[];
    lifecycleEvents: { type?: string; season?: number; date?: string; label?: string }[];
    trackedMembership: ClubMetadataSeasonRange[];
    absenceExplanations: ClubMetadataSeasonRange[];
  };
  derived: {
    source: string;
    aliases: string[];
    relationships?: ClubMetadataRelationship[];
    identitySources?: ClubMetadataSourceRef[];
    observedNames: ClubMetadataObservedName[];
    observedNamePeriods: { name: string; startSeason: number; endSeason: number }[];
    firstSeenSeason: number;
    lastSeenSeason: number;
    seasonsSeen: number[];
    totalSeasonsSeen: number;
    tiersSeen: string[];
    tierSeasons: { tierKey: string; seasons: number[] }[];
  };
}

export type ClubMetadata = ClubMetadataRecord & { clubId: string };

export interface ClubMetadataDocument {
  metadata: DataAssetMetadata;
  clubs: Record<string, ClubMetadataRecord>;
}

export interface ClubMetadataState {
  clubs: Record<string, ClubMetadata>;
  generatedAt: string | null;
}
