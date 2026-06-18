import type { DataAssetMetadata, ClubMetadataDocument } from '../club-metadata.models';

export interface SeasonsDocument {
  seasons: Record<string, unknown>;
  metadata?: DataAssetMetadata;
}

export interface DataBundleAssetManifest {
  url: string;
  sha256?: string;
  gitBlobSha?: string;
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
  url?: string;
  name: string;
  browser_download_url: string;
  digest?: string;
  size?: number;
}

export interface GitHubRelease {
  tag_name: string;
  published_at: string;
  target_commitish?: string;
  assets: GitHubReleaseAsset[];
}

export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree' | string;
  sha: string;
  size?: number;
}

export interface GitHubTree {
  tree: GitHubTreeItem[];
  truncated?: boolean;
}
