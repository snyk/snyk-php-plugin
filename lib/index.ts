import * as composerLockFileParser from '@snyk/composer-lockfile-parser';

import { systemDeps } from './system-deps';
import { PhpPluginResult, SystemPackagesOptions } from './types';

function inspect(basePath: string, fileName: string, options: SystemPackagesOptions): PhpPluginResult {
  const systemVersions = systemDeps(basePath, options);
  const depsTree = composerLockFileParser.buildDepTreeFromFiles(basePath, fileName, systemVersions);

  return {
    package: depsTree,
    plugin: { name: 'snyk-php-plugin', targetFile: fileName },
  };
}

export {
  inspect,
  PhpPluginResult,
  SystemPackagesOptions,
};
