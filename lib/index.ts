import * as composerLockFileParser from '@snyk/composer-lockfile-parser';

import { systemDeps } from './system_deps';

export function inspect(basePath: string, fileName: string, options: object = {}) {
  const systemVersions = systemDeps(basePath, options);
  const data = {
    plugin: {
      name: 'snyk-php-plugin',
      targetFile: fileName,
    },
    package: composerLockFileParser.buildDepTreeFromFiles(basePath, fileName, systemVersions),
  };

  return Promise.resolve(data);
}
