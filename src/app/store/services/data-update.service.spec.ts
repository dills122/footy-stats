import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { ClubMetadataDocument } from '../club-metadata.models';
import type { ActiveDataInfo, DataBundleManifest, SeasonsDocument } from './data-bundle.models';
import { DataUpdateService } from './data-update.service';
import { DataLoaderService } from './hydrate-store-json';

describe('DataUpdateService', () => {
  let service: DataUpdateService;
  let http: HttpTestingController;
  let originalCrypto: Crypto;
  let activeDataInfo: ReturnType<typeof signal<ActiveDataInfo | null>>;
  let dataLoader: {
    activeDataInfo: ReturnType<typeof signal<ActiveDataInfo | null>>;
    installOverride: jest.Mock<Promise<void>>;
    clearOverrideAndReload: jest.Mock<Promise<void>>;
  };

  beforeEach(() => {
    originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...originalCrypto,
        subtle: {
          digest: jest.fn((_algorithm: AlgorithmIdentifier, data: BufferSource) =>
            Promise.resolve(fakeDigest(data))
          ),
        },
      },
    });

    activeDataInfo = signal<ActiveDataInfo | null>({
      source: 'shipped',
      version: 'shipped-sha',
      generatedAt: '2026-01-01T00:00:00.000Z',
      gitSha: 'shipped-sha',
    });
    dataLoader = {
      activeDataInfo,
      installOverride: jest.fn(() => Promise.resolve()),
      clearOverrideAndReload: jest.fn(() => Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DataLoaderService,
          useValue: dataLoader,
        },
      ],
    });

    service = TestBed.inject(DataUpdateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('finds a newer release manifest and exposes an available update', async () => {
    const checkPromise = service.checkForUpdates();

    http.expectOne(environment.dataUpdates.githubLatestReleaseApiUrl).flush({
      tag_name: 'data-2026-06-18',
      published_at: '2026-06-18T12:00:00.000Z',
      assets: [
        {
          name: 'footy-stats-data-manifest.json',
          browser_download_url: 'https://example.com/manifest.json',
        },
      ],
    });
    await Promise.resolve();
    http.expectOne('https://example.com/manifest.json').flush(manifest());

    await checkPromise;

    expect(service.checkStatus()).toBe('available');
    expect(service.updateAvailable()).toBe(true);
    expect(service.latestManifest()?.version).toBe('data-2026-06-18');
  });

  it('builds a verified manifest from footy-data-kit release assets', async () => {
    const checkPromise = service.checkForUpdates();

    http.expectOne(environment.dataUpdates.githubLatestReleaseApiUrl).flush({
      tag_name: 'v0.8.2',
      published_at: '2026-06-18T01:33:25.000Z',
      target_commitish: 'main',
      assets: [
        {
          url: 'https://api.github.com/repos/dills122/footy-data-kit/releases/assets/1',
          name: 'all-seasons.min.json',
          browser_download_url: 'https://example.com/all-seasons.min.json',
          digest: `sha256:${'c'.repeat(64)}`,
          size: 3300786,
        },
        {
          url: 'https://api.github.com/repos/dills122/footy-data-kit/releases/assets/2',
          name: 'all-seasons.json',
          browser_download_url: 'https://example.com/all-seasons.json',
          digest: `sha256:${'a'.repeat(64)}`,
          size: 6187960,
        },
        {
          url: 'https://api.github.com/repos/dills122/footy-data-kit/releases/assets/3',
          name: 'club-metadata.json',
          browser_download_url: 'https://example.com/club-metadata.json',
          digest: `sha256:${'b'.repeat(64)}`,
          size: 1267095,
        },
      ],
    });
    await Promise.resolve();
    http
      .expectOne(
        'https://api.github.com/repos/dills122/footy-data-kit/git/trees/v0.8.2?recursive=1'
      )
      .flush({
        truncated: false,
        tree: [
          {
            path: 'data-output/all-seasons.min.json',
            type: 'blob',
            sha: 'season-git-sha',
            size: 3300774,
          },
          {
            path: 'data/club-metadata.json',
            type: 'blob',
            sha: 'club-git-sha',
            size: 1267071,
          },
        ],
      });

    await checkPromise;

    expect(service.checkStatus()).toBe('available');
    expect(service.latestManifest()).toEqual({
      version: 'v0.8.2',
      generatedAt: '2026-06-18T01:33:25.000Z',
      gitSha: 'v0.8.2',
      assets: {
        seasons: {
          url: 'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data-output/all-seasons.min.json',
          gitBlobSha: 'season-git-sha',
          size: 3300774,
        },
        clubMetadata: {
          url: 'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data/club-metadata.json',
          gitBlobSha: 'club-git-sha',
          size: 1267071,
        },
      },
    });
  });

  it('downloads, verifies, and installs the latest data bundle', async () => {
    const seasonsText = JSON.stringify(seasonsDocument());
    const clubMetadataText = JSON.stringify(clubMetadataDocument());
    const updateManifest = manifest({
      seasonsSha256: await sha256Hex(seasonsText),
      clubMetadataSha256: await sha256Hex(clubMetadataText),
    });

    const checkPromise = service.checkForUpdates();
    http.expectOne(environment.dataUpdates.githubLatestReleaseApiUrl).flush({
      tag_name: 'data-2026-06-18',
      published_at: '2026-06-18T12:00:00.000Z',
      assets: [
        {
          name: 'footy-stats-data-manifest.json',
          browser_download_url: 'https://example.com/manifest.json',
        },
      ],
    });
    await Promise.resolve();
    http.expectOne('https://example.com/manifest.json').flush(updateManifest);
    await checkPromise;

    const installPromise = service.installLatestUpdate();

    const seasonsRequest = http.expectOne('https://example.com/seasons.json');
    expect(seasonsRequest.request.headers.has('Accept')).toBe(false);
    seasonsRequest.flush(seasonsText);
    http.expectOne('https://example.com/club-metadata.json').flush(clubMetadataText);

    await installPromise;

    expect(dataLoader.installOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: updateManifest,
        seasonsDocument: seasonsDocument(),
        clubMetadataDocument: clubMetadataDocument(),
      })
    );
    expect(service.installStatus()).toBe('installed');
    expect(service.checkStatus()).toBe('up-to-date');
  });

  it('downloads and verifies raw GitHub URLs for release fallback manifests', async () => {
    const seasonsText = JSON.stringify(seasonsDocument());
    const clubMetadataText = JSON.stringify(clubMetadataDocument());
    const updateManifest = manifest({
      seasonsUrl:
        'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data-output/all-seasons.min.json',
      clubMetadataUrl:
        'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data/club-metadata.json',
      seasonsSha256: null,
      clubMetadataSha256: null,
      seasonsGitBlobSha: await gitBlobSha(seasonsText),
      clubMetadataGitBlobSha: await gitBlobSha(clubMetadataText),
    });

    const checkPromise = service.checkForUpdates();
    http.expectOne(environment.dataUpdates.githubLatestReleaseApiUrl).flush({
      tag_name: 'data-2026-06-18',
      published_at: '2026-06-18T12:00:00.000Z',
      assets: [
        {
          name: 'footy-stats-data-manifest.json',
          browser_download_url: 'https://example.com/manifest.json',
        },
      ],
    });
    await Promise.resolve();
    http.expectOne('https://example.com/manifest.json').flush(updateManifest);
    await checkPromise;

    const installPromise = service.installLatestUpdate();

    const seasonsRequest = http.expectOne(
      'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data-output/all-seasons.min.json'
    );
    expect(seasonsRequest.request.headers.has('Accept')).toBe(false);
    seasonsRequest.flush(seasonsText);

    const clubMetadataRequest = http.expectOne(
      'https://raw.githubusercontent.com/dills122/footy-data-kit/v0.8.2/data/club-metadata.json'
    );
    expect(clubMetadataRequest.request.headers.has('Accept')).toBe(false);
    clubMetadataRequest.flush(clubMetadataText);

    await installPromise;

    expect(dataLoader.installOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: updateManifest,
      })
    );
    expect(service.installStatus()).toBe('installed');
  });

  it('reports checksum failures without installing the bundle', async () => {
    const clubMetadataText = JSON.stringify(clubMetadataDocument());
    const updateManifest = manifest({
      seasonsSha256: '0'.repeat(64),
      clubMetadataSha256: await sha256Hex(clubMetadataText),
    });
    const checkPromise = service.checkForUpdates();
    http.expectOne(environment.dataUpdates.githubLatestReleaseApiUrl).flush({
      tag_name: 'data-2026-06-18',
      published_at: '2026-06-18T12:00:00.000Z',
      assets: [
        {
          name: 'footy-stats-data-manifest.json',
          browser_download_url: 'https://example.com/manifest.json',
        },
      ],
    });
    await Promise.resolve();
    http.expectOne('https://example.com/manifest.json').flush(updateManifest);
    await checkPromise;

    const installPromise = service.installLatestUpdate();

    http.expectOne('https://example.com/seasons.json').flush(JSON.stringify(seasonsDocument()));
    http.expectOne('https://example.com/club-metadata.json').flush(clubMetadataText);

    await installPromise;

    expect(dataLoader.installOverride).not.toHaveBeenCalled();
    expect(service.installStatus()).toBe('error');
    expect(service.statusMessage()).toBe('seasons.json checksum mismatch.');
  });
});

function manifest({
  seasonsUrl = 'https://example.com/seasons.json',
  clubMetadataUrl = 'https://example.com/club-metadata.json',
  seasonsSha256 = '0'.repeat(64),
  clubMetadataSha256 = '1'.repeat(64),
  seasonsGitBlobSha,
  clubMetadataGitBlobSha,
}: {
  seasonsUrl?: string;
  clubMetadataUrl?: string;
  seasonsSha256?: string | null;
  clubMetadataSha256?: string | null;
  seasonsGitBlobSha?: string;
  clubMetadataGitBlobSha?: string;
} = {}): DataBundleManifest {
  return {
    version: 'data-2026-06-18',
    generatedAt: '2026-06-18T12:00:00.000Z',
    gitSha: 'remote-sha',
    assets: {
      seasons: {
        url: seasonsUrl,
        sha256: seasonsSha256 ?? undefined,
        gitBlobSha: seasonsGitBlobSha,
      },
      clubMetadata: {
        url: clubMetadataUrl,
        sha256: clubMetadataSha256 ?? undefined,
        gitBlobSha: clubMetadataGitBlobSha,
      },
    },
  };
}

function seasonsDocument(): SeasonsDocument {
  return {
    metadata: {
      generatedAt: '2026-06-18T12:00:00.000Z',
      gitSha: 'remote-sha',
    },
    seasons: {
      2024: {
        tier1: [],
      },
    },
  };
}

function clubMetadataDocument(): ClubMetadataDocument {
  return {
    metadata: {
      schemaVersion: 1,
      generator: 'test',
      generatedAt: '2026-06-18T12:00:00.000Z',
      gitSha: 'remote-sha',
    },
    clubs: {},
  };
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function gitBlobSha(text: string): Promise<string> {
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

function fakeDigest(data: BufferSource): ArrayBuffer {
  const view =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const text = new TextDecoder().decode(view);
  const hex = text.includes('"clubs"') ? 'b'.repeat(64) : 'a'.repeat(64);

  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16)).buffer;
}
