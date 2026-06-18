import type { DataAssetMetadata, ClubMetadataDocument } from '../club-metadata.models';

export interface SeasonsDocument {
  seasons: Record<string, unknown>;
  metadata?: DataAssetMetadata;
}

export interface DataBundleAssetManifest {
  url: string;
  sha256: string;
  size?: number;
}

export interface DataBundleManifest {
  version: string;
  generatedAt: string;
  gitSha: string;
  assets: {
    seasons: DataBundleAssetManifest;
    clubMetadata: DataBundleAssetManifest;
  };
}

export interface InstalledDataBundle {
  manifest: DataBundleManifest;
  seasonsDocument: SeasonsDocument;
  clubMetadataDocument: ClubMetadataDocument;
  installedAt: string;
}

export interface ActiveDataInfo {
  source: 'shipped' | 'local-override';
  version: string;
  generatedAt: string;
  gitSha: string;
  installedAt?: string;
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

export interface GitHubRelease {
  tag_name: string;
  published_at: string;
  target_commitish?: string;
  assets: GitHubReleaseAsset[];
}
