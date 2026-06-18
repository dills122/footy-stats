import { Injectable } from '@angular/core';
import type { DataBundleManifest, InstalledDataBundle } from './data-bundle.models';

const DB_NAME = 'footy-stats-data';
const DB_VERSION = 1;
const STORE_NAME = 'bundles';
const ACTIVE_BUNDLE_KEY = 'active';
const LOCAL_STORAGE_META_KEY = 'footy-stats:dataOverrideMeta:v1';
const LOCAL_STORAGE_BUNDLE_KEY = 'footy-stats:dataOverrideBundle:v1';

@Injectable({ providedIn: 'root' })
export class DataOverrideStorage {
  async read(): Promise<InstalledDataBundle | null> {
    const indexedDbBundle = await this.readFromIndexedDb();
    if (indexedDbBundle) {
      return indexedDbBundle;
    }

    return this.readFromLocalStorage();
  }

  async write(bundle: InstalledDataBundle): Promise<void> {
    try {
      await this.writeToIndexedDb(bundle);
      this.writeMetadataToLocalStorage(bundle.manifest, bundle.installedAt);
      globalThis.localStorage?.removeItem(LOCAL_STORAGE_BUNDLE_KEY);
      return;
    } catch {
      this.writeToLocalStorage(bundle);
    }
  }

  async clear(): Promise<void> {
    await this.deleteFromIndexedDb();
    globalThis.localStorage?.removeItem(LOCAL_STORAGE_META_KEY);
    globalThis.localStorage?.removeItem(LOCAL_STORAGE_BUNDLE_KEY);
  }

  readMetadata(): { manifest: DataBundleManifest; installedAt: string } | null {
    const raw = globalThis.localStorage?.getItem(LOCAL_STORAGE_META_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as { manifest: DataBundleManifest; installedAt: string };
    } catch {
      globalThis.localStorage?.removeItem(LOCAL_STORAGE_META_KEY);
      return null;
    }
  }

  private async readFromIndexedDb(): Promise<InstalledDataBundle | null> {
    const db = await this.openDatabase();
    if (!db) {
      return null;
    }

    return new Promise<InstalledDataBundle | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(ACTIVE_BUNDLE_KEY);
      request.onsuccess = () =>
        resolve((request.result as InstalledDataBundle | undefined) ?? null);
      request.onerror = () => resolve(null);
    }).finally(() => db.close());
  }

  private async writeToIndexedDb(bundle: InstalledDataBundle): Promise<void> {
    const db = await this.openDatabase();
    if (!db) {
      throw new Error('IndexedDB is unavailable.');
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(bundle, ACTIVE_BUNDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    }).finally(() => db.close());
  }

  private async deleteFromIndexedDb(): Promise<void> {
    const db = await this.openDatabase();
    if (!db) {
      return;
    }

    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(ACTIVE_BUNDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    }).finally(() => db.close());
  }

  private openDatabase(): Promise<IDBDatabase | null> {
    if (!globalThis.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  private readFromLocalStorage(): InstalledDataBundle | null {
    const raw = globalThis.localStorage?.getItem(LOCAL_STORAGE_BUNDLE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as InstalledDataBundle;
    } catch {
      globalThis.localStorage?.removeItem(LOCAL_STORAGE_BUNDLE_KEY);
      return null;
    }
  }

  private writeToLocalStorage(bundle: InstalledDataBundle) {
    globalThis.localStorage?.setItem(LOCAL_STORAGE_BUNDLE_KEY, JSON.stringify(bundle));
    this.writeMetadataToLocalStorage(bundle.manifest, bundle.installedAt);
  }

  private writeMetadataToLocalStorage(manifest: DataBundleManifest, installedAt: string) {
    globalThis.localStorage?.setItem(
      LOCAL_STORAGE_META_KEY,
      JSON.stringify({
        manifest,
        installedAt,
      })
    );
  }
}
