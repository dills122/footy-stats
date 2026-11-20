import { deployment } from './deployment';

export const environment = {
  web3FormsAccessKey: deployment.web3FormsAccessKey,
  dataUpdates: {
    githubLatestReleaseApiUrl: deployment.githubLatestReleaseApiUrl,
    manifestAssetNames: ['footy-stats-data-manifest.json', 'data-manifest.json'],
    seasonsAssetNames: ['seasons.json', 'all-seasons.min.json', 'all-seasons.json'],
    clubMetadataAssetNames: ['club-metadata.json'],
    rawAssetPathsByName: {
      'seasons.json': 'data-output/all-seasons.json',
      'all-seasons.min.json': 'data-output/all-seasons.min.json',
      'all-seasons.json': 'data-output/all-seasons.json',
      'club-metadata.json': 'data/club-metadata.json',
    },
  },
};
