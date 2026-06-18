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

    http.expectOne('https://example.com/seasons.json').flush(seasonsText);
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
  seasonsSha256 = '0'.repeat(64),
  clubMetadataSha256 = '1'.repeat(64),
}: {
  seasonsSha256?: string;
  clubMetadataSha256?: string;
} = {}): DataBundleManifest {
  return {
    version: 'data-2026-06-18',
    generatedAt: '2026-06-18T12:00:00.000Z',
    gitSha: 'remote-sha',
    assets: {
      seasons: {
        url: 'https://example.com/seasons.json',
        sha256: seasonsSha256,
      },
      clubMetadata: {
        url: 'https://example.com/club-metadata.json',
        sha256: clubMetadataSha256,
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

function fakeDigest(data: BufferSource): ArrayBuffer {
  const view =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const text = new TextDecoder().decode(view);
  const hex = text.includes('"clubs"') ? 'b'.repeat(64) : 'a'.repeat(64);

  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16)).buffer;
}
