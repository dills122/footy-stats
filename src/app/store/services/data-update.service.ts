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
        this.verifySha256(seasonsText, manifest.assets.seasons.sha256, 'seasons.json'),
        this.verifySha256(
          clubMetadataText,
          manifest.assets.clubMetadata.sha256,
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
    const seasonsAsset = this.requiredAsset(
      release.assets,
      environment.dataUpdates.seasonsAssetName
    );
    const clubMetadataAsset = this.requiredAsset(
      release.assets,
      environment.dataUpdates.clubMetadataAssetName
    );
    const [seasonsSha256, clubMetadataSha256] = await Promise.all([
      this.fetchSha256ForAsset(release.assets, seasonsAsset.name),
      this.fetchSha256ForAsset(release.assets, clubMetadataAsset.name),
    ]);

    return {
      version: release.tag_name,
      generatedAt: release.published_at,
      gitSha: release.target_commitish ?? release.tag_name,
      assets: {
        seasons: this.assetManifest(seasonsAsset, seasonsSha256),
        clubMetadata: this.assetManifest(clubMetadataAsset, clubMetadataSha256),
      },
    };
  }

  private requiredAsset(assets: readonly GitHubReleaseAsset[], name: string): GitHubReleaseAsset {
    const asset = assets.find((candidate) => candidate.name === name);
    if (!asset) {
      throw new Error(`The latest data release is missing ${name}.`);
    }

    return asset;
  }

  private async fetchSha256ForAsset(
    assets: readonly GitHubReleaseAsset[],
    assetName: string
  ): Promise<string> {
    const checksumAsset = this.requiredAsset(assets, `${assetName}.sha256`);
    const checksumText = await this.downloadText(checksumAsset.browser_download_url);
    const checksum = checksumText.trim().split(/\s+/)[0]?.toLowerCase();
    if (!checksum || !/^[a-f0-9]{64}$/.test(checksum)) {
      throw new Error(`${checksumAsset.name} does not contain a valid SHA-256 checksum.`);
    }

    return checksum;
  }

  private assetManifest(asset: GitHubReleaseAsset, sha256: string): DataBundleAssetManifest {
    return {
      url: asset.browser_download_url,
      sha256,
      size: asset.size,
    };
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
}
