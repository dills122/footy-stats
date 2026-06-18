export const environment = {
  web3FormsAccessKey: '2a8d025b-bb66-4ca9-939b-ac6e2639c4ad',
  dataUpdates: {
    githubLatestReleaseApiUrl:
      'https://api.github.com/repos/dills122/footy-data-kit/releases/latest',
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
