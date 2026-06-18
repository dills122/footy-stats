import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { lastValueFrom } from 'rxjs';
import type { ClubMetadataDocument } from '../club-metadata.models';
import type {
  DataBundleAssetManifest,
  DataBundleManifest,
  GitHubRelease,
  GitHubReleaseAsset,
  GitHubTree,
  GitHubTreeItem,
  InstalledDataBundle,
  SeasonsDocument,
} from './data-bundle.models';
import { DataLoaderService } from './hydrate-store-json';

type UpdateCheckStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error';
type UpdateInstallStatus = 'idle' | 'downloading' | 'verifying' | 'installed' | 'error';

@Injectable({ providedIn: 'root' })
export class DataUpdateService {
  private http = inject(HttpClient);
  private dataLoader = inject(DataLoaderService);
  private checkState = signal<UpdateCheckStatus>('idle');
  private installState = signal<UpdateInstallStatus>('idle');
  private latest = signal<DataBundleManifest | null>(null);
  private message = signal('');
  private dismissedVersion = signal<string | null>(null);

  readonly checkStatus = this.checkState.asReadonly();
  readonly installStatus = this.installState.asReadonly();
  readonly latestManifest = this.latest.asReadonly();
  readonly statusMessage = this.message.asReadonly();
  readonly activeDataInfo = this.dataLoader.activeDataInfo;
  readonly hasLocalOverride = computed(() => this.activeDataInfo()?.source === 'local-override');
  readonly updateAvailable = computed(
    () =>
      this.checkState() === 'available' &&
      Boolean(this.latest()) &&
      this.dismissedVersion() !== this.latest()?.version
  );

  async checkForUpdates(): Promise<void> {
    if (!environment.dataUpdates.githubLatestReleaseApiUrl) {
      this.checkState.set('up-to-date');
      return;
    }

    this.checkState.set('checking');
    this.message.set('');

    try {
      const manifest = await this.fetchLatestManifest();
      this.latest.set(manifest);

      if (this.isNewerThanActiveData(manifest)) {
        this.checkState.set('available');
        return;
      }

      this.checkState.set('up-to-date');
    } catch (error) {
      this.checkState.set('error');
      this.message.set(
        error instanceof Error ? error.message : 'Could not check for data updates.'
      );
    }
  }

  dismissAvailableUpdate() {
    const manifest = this.latest();
    if (manifest) {
      this.dismissedVersion.set(manifest.version);
    }
  }

  async installLatestUpdate(): Promise<void> {
    const manifest = this.latest();
    if (!manifest) {
      return;
    }

    try {
      this.installState.set('downloading');
      this.message.set('');

      const [seasonsText, clubMetadataText] = await Promise.all([
        this.downloadText(manifest.assets.seasons.url),
        this.downloadText(manifest.assets.clubMetadata.url),
      ]);

      this.installState.set('verifying');
      await Promise.all([
        this.verifyAssetIntegrity(seasonsText, manifest.assets.seasons, 'seasons.json'),
        this.verifyAssetIntegrity(
          clubMetadataText,
          manifest.assets.clubMetadata,
          'club-metadata.json'
        ),
      ]);

      const bundle: InstalledDataBundle = {
        manifest,
        seasonsDocument: JSON.parse(seasonsText) as SeasonsDocument,
        clubMetadataDocument: JSON.parse(clubMetadataText) as ClubMetadataDocument,
        installedAt: new Date().toISOString(),
      };

      await this.dataLoader.installOverride(bundle);
      this.installState.set('installed');
      this.checkState.set('up-to-date');
    } catch (error) {
      this.installState.set('error');
      this.message.set(error instanceof Error ? error.message : 'Could not update local data.');
    }
  }

  async clearLocalOverride(): Promise<void> {
    await this.dataLoader.clearOverrideAndReload();
    this.installState.set('idle');
    await this.checkForUpdates();
  }

  private async fetchLatestManifest(): Promise<DataBundleManifest> {
    const release = await lastValueFrom(
      this.http.get<GitHubRelease>(environment.dataUpdates.githubLatestReleaseApiUrl)
    );
    const manifestAsset = this.findManifestAsset(release.assets);
    if (manifestAsset) {
      return lastValueFrom(this.http.get<DataBundleManifest>(manifestAsset.browser_download_url));
    }

    return this.buildManifestFromReleaseAssets(release);
  }

  private findManifestAsset(assets: readonly GitHubReleaseAsset[]): GitHubReleaseAsset | null {
    return (
      assets.find((asset) => environment.dataUpdates.manifestAssetNames.includes(asset.name)) ??
      null
    );
  }

  private async buildManifestFromReleaseAssets(
    release: GitHubRelease
  ): Promise<DataBundleManifest> {
    const seasonsAsset = this.releaseAssetForDataSlot(
      release.assets,
      environment.dataUpdates.seasonsAssetNames,
      'season data'
    );
    const clubMetadataAsset = this.releaseAssetForDataSlot(
      release.assets,
      environment.dataUpdates.clubMetadataAssetNames,
      'club metadata'
    );
    const releaseTree = await this.fetchReleaseTree(release.tag_name);

    return {
      version: release.tag_name,
      generatedAt: release.published_at,
      gitSha: release.tag_name,
      assets: {
        seasons: this.rawAssetManifest(release.tag_name, releaseTree, seasonsAsset),
        clubMetadata: this.rawAssetManifest(release.tag_name, releaseTree, clubMetadataAsset),
      },
    };
  }

  private releaseAssetForDataSlot(
    assets: readonly GitHubReleaseAsset[],
    names: readonly string[],
    label: string
  ): GitHubReleaseAsset {
    const asset = assets.find((candidate) => names.includes(candidate.name));
    if (!asset) {
      throw new Error(`The latest data release is missing a supported ${label} file.`);
    }

    return asset;
  }

  private async fetchReleaseTree(tagName: string): Promise<GitHubTree> {
    const tree = await lastValueFrom(
      this.http.get<GitHubTree>(
        `${this.githubRepoApiUrl()}/git/trees/${encodeURIComponent(tagName)}?recursive=1`
      )
    );

    if (tree.truncated) {
      throw new Error('The latest data release tree is too large to verify in the browser.');
    }

    return tree;
  }

  private rawAssetManifest(
    tagName: string,
    releaseTree: GitHubTree,
    asset: GitHubReleaseAsset
  ): DataBundleAssetManifest {
    const rawPath = this.rawPathForReleaseAsset(asset.name);
    const treeItem = this.requiredTreeItem(releaseTree.tree, rawPath);

    return {
      url: this.rawGithubUrl(tagName, rawPath),
      gitBlobSha: treeItem.sha,
      size: treeItem.size ?? asset.size,
    };
  }

  private rawPathForReleaseAsset(assetName: string): string {
    const rawPath =
      environment.dataUpdates.rawAssetPathsByName[
        assetName as keyof typeof environment.dataUpdates.rawAssetPathsByName
      ];

    if (!rawPath) {
      throw new Error(
        `The latest data release does not define a browser-safe path for ${assetName}.`
      );
    }

    return rawPath;
  }

  private requiredTreeItem(tree: readonly GitHubTreeItem[], path: string): GitHubTreeItem {
    const item = tree.find((candidate) => candidate.type === 'blob' && candidate.path === path);
    if (!item) {
      throw new Error(`The latest data release is missing ${path}.`);
    }

    return item;
  }

  private rawGithubUrl(tagName: string, path: string): string {
    return `https://raw.githubusercontent.com/dills122/footy-data-kit/${encodeURIComponent(tagName)}/${path}`;
  }

  private isNewerThanActiveData(manifest: DataBundleManifest): boolean {
    const activeData = this.activeDataInfo();
    if (!activeData) {
      return false;
    }

    if (manifest.gitSha && activeData.gitSha && manifest.gitSha === activeData.gitSha) {
      return false;
    }

    const remoteTime = Date.parse(manifest.generatedAt);
    const activeTime = Date.parse(activeData.generatedAt);
    if (Number.isFinite(remoteTime) && Number.isFinite(activeTime)) {
      return remoteTime > activeTime;
    }

    return manifest.version !== activeData.version;
  }

  private downloadText(url: string): Promise<string> {
    return lastValueFrom(this.http.get(url, { responseType: 'text' }));
  }

  private async verifySha256(text: string, expected: string, label: string): Promise<void> {
    const actual = await this.sha256Hex(text);
    if (actual !== expected.toLowerCase()) {
      throw new Error(`${label} checksum mismatch.`);
    }
  }

  private async sha256Hex(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private async verifyAssetIntegrity(
    text: string,
    asset: DataBundleAssetManifest,
    label: string
  ): Promise<void> {
    if (asset.sha256) {
      await this.verifySha256(text, asset.sha256, label);
      return;
    }

    if (asset.gitBlobSha) {
      await this.verifyGitBlobSha(text, asset.gitBlobSha, label);
      return;
    }

    throw new Error(`${label} is missing a verification checksum.`);
  }

  private async verifyGitBlobSha(text: string, expected: string, label: string): Promise<void> {
    const actual = await this.gitBlobSha(text);
    if (actual !== expected.toLowerCase()) {
      throw new Error(`${label} git blob checksum mismatch.`);
    }
  }

  private async gitBlobSha(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const prefix = encoder.encode(`blob ${bytes.length}\0`);
    const payload = new Uint8Array(prefix.length + bytes.length);
    payload.set(prefix);
    payload.set(bytes, prefix.length);
    const hash = await globalThis.crypto.subtle.digest('SHA-1', payload);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private githubRepoApiUrl(): string {
    return environment.dataUpdates.githubLatestReleaseApiUrl.replace(/\/releases\/latest$/, '');
  }
}
