#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FOOTY_DATA_KIT_OWNER = 'dills122';
const FOOTY_DATA_KIT_REPO = 'footy-data-kit';
const FOOTY_DATA_KIT_API = `https://api.github.com/repos/${FOOTY_DATA_KIT_OWNER}/${FOOTY_DATA_KIT_REPO}`;
const FOOTY_DATA_KIT_RAW = `https://raw.githubusercontent.com/${FOOTY_DATA_KIT_OWNER}/${FOOTY_DATA_KIT_REPO}`;

const manifestAssetNames = ['footy-stats-data-manifest.json', 'data-manifest.json'];
const seasonsAssetNames = ['seasons.json', 'all-seasons.json', 'all-seasons.min.json'];
const clubMetadataAssetNames = ['club-metadata.json'];
const rawAssetPathsByName = {
  'seasons.json': 'data-output/all-seasons.json',
  'all-seasons.json': 'data-output/all-seasons.json',
  'all-seasons.min.json': 'data-output/all-seasons.min.json',
  'club-metadata.json': 'data/club-metadata.json',
};

const targetFiles = {
  seasons: path.resolve('src/assets/seasons.json'),
  clubMetadata: path.resolve('src/assets/club-metadata.json'),
};

async function main() {
  const release = await fetchRelease();
  const manifest = await fetchManifestForRelease(release);

  const [seasonsText, clubMetadataText] = await Promise.all([
    downloadVerifiedAsset(manifest.assets.seasons, 'seasons.json'),
    downloadVerifiedAsset(manifest.assets.clubMetadata, 'club-metadata.json'),
  ]);

  const changes = [];
  if (await writeJsonWhenChanged(targetFiles.seasons, seasonsText, 'seasons.json')) {
    changes.push('src/assets/seasons.json');
  }

  if (
    await writeJsonWhenChanged(
      targetFiles.clubMetadata,
      clubMetadataText,
      'club-metadata.json'
    )
  ) {
    changes.push('src/assets/club-metadata.json');
  }

  const changed = changes.length > 0;
  writeOutput('changed', String(changed));
  writeOutput('version', manifest.version);
  writeOutput('generated_at', manifest.generatedAt);
  writeOutput('data_git_sha', manifest.gitSha);
  writeOutput('release_url', release.html_url ?? release.browser_download_url ?? '');
  writeOutput('seasons_source', manifest.assets.seasons.url);
  writeOutput('club_metadata_source', manifest.assets.clubMetadata.url);
  writeOutput('changed_files', changes.join(', '));

  if (changed) {
    console.log(`Updated shipped data from ${manifest.version}: ${changes.join(', ')}`);
  } else {
    console.log(`Shipped data is already current for ${manifest.version}.`);
  }
}

async function fetchRelease() {
  const releaseTag = process.env.FOOTY_DATA_KIT_RELEASE_TAG?.trim();
  const endpoint = releaseTag
    ? `${FOOTY_DATA_KIT_API}/releases/tags/${encodeURIComponent(releaseTag)}`
    : `${FOOTY_DATA_KIT_API}/releases/latest`;

  return fetchJson(endpoint);
}

async function fetchManifestForRelease(release) {
  const manifestAsset = findAssetByPriority(release.assets ?? [], manifestAssetNames);
  if (manifestAsset) {
    return fetchJson(manifestAsset.browser_download_url);
  }

  return buildManifestFromReleaseAssets(release);
}

async function buildManifestFromReleaseAssets(release) {
  const releaseTree = await fetchReleaseTree(release.tag_name);
  const seasonsAsset = requiredReleaseAsset(
    release.assets ?? [],
    seasonsAssetNames,
    'season data'
  );
  const clubMetadataAsset = requiredReleaseAsset(
    release.assets ?? [],
    clubMetadataAssetNames,
    'club metadata'
  );

  return {
    version: release.tag_name,
    generatedAt: release.published_at,
    gitSha: release.target_commitish || release.tag_name,
    assets: {
      seasons: buildAssetManifest(release.tag_name, releaseTree, seasonsAsset),
      clubMetadata: buildAssetManifest(release.tag_name, releaseTree, clubMetadataAsset),
    },
  };
}

async function fetchReleaseTree(tagName) {
  const tree = await fetchJson(
    `${FOOTY_DATA_KIT_API}/git/trees/${encodeURIComponent(tagName)}?recursive=1`
  );

  if (tree.truncated) {
    throw new Error(`Release tree for ${tagName} is truncated and cannot be verified.`);
  }

  return tree;
}

function buildAssetManifest(tagName, releaseTree, asset) {
  const rawPath = rawAssetPathsByName[asset.name];
  if (!rawPath) {
    throw new Error(`No raw path is configured for release asset ${asset.name}.`);
  }

  const treeItem = releaseTree.tree.find(
    (candidate) => candidate.type === 'blob' && candidate.path === rawPath
  );
  if (!treeItem) {
    throw new Error(`Release ${tagName} is missing ${rawPath}.`);
  }

  return {
    url: `${FOOTY_DATA_KIT_RAW}/${encodeURIComponent(tagName)}/${rawPath}`,
    gitBlobSha: treeItem.sha,
    size: treeItem.size ?? asset.size,
  };
}

function requiredReleaseAsset(assets, names, label) {
  const asset = findAssetByPriority(assets, names);
  if (!asset) {
    throw new Error(`Release is missing a supported ${label} file.`);
  }

  return asset;
}

function findAssetByPriority(assets, names) {
  for (const name of names) {
    const asset = assets.find((candidate) => candidate.name === name);
    if (asset) {
      return asset;
    }
  }

  return null;
}

async function downloadVerifiedAsset(asset, label) {
  const text = await fetchText(asset.url);

  if (asset.sha256) {
    verifySha256(text, asset.sha256, label);
    return text;
  }

  if (asset.digest?.startsWith('sha256:')) {
    verifySha256(text, asset.digest.slice('sha256:'.length), label);
    return text;
  }

  if (asset.gitBlobSha) {
    verifyGitBlobSha(text, asset.gitBlobSha, label);
    return text;
  }

  throw new Error(`${label} is missing a supported checksum.`);
}

async function writeJsonWhenChanged(targetFile, rawJson, label) {
  const nextDocument = parseJson(rawJson, label);
  const currentDocument = parseJson(await readFile(targetFile, 'utf8'), targetFile);

  if (JSON.stringify(currentDocument) === JSON.stringify(nextDocument)) {
    return false;
  }

  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(targetFile, `${JSON.stringify(nextDocument, null, 2)}\n`);
  return true;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
}

function verifySha256(text, expected, label) {
  const actual = createHash('sha256').update(text).digest('hex');
  if (actual !== expected.toLowerCase()) {
    throw new Error(`${label} checksum mismatch.`);
  }
}

function verifyGitBlobSha(text, expected, label) {
  const body = Buffer.from(text);
  const prefix = Buffer.from(`blob ${body.length}\0`);
  const actual = createHash('sha1').update(Buffer.concat([prefix, body])).digest('hex');

  if (actual !== expected.toLowerCase()) {
    throw new Error(`${label} git blob checksum mismatch.`);
  }
}

async function fetchJson(url) {
  return parseJson(await fetchText(url, { accept: 'application/vnd.github+json' }), url);
}

async function fetchText(url, options = {}) {
  const headers = {
    Accept: options.accept ?? 'application/octet-stream',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'footy-stats-data-updater',
  };
  const token = process.env.FOOTY_DATA_KIT_TOKEN ?? process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function writeOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    return;
  }

  appendFileSync(outputFile, `${name}<<EOF\n${value}\nEOF\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
