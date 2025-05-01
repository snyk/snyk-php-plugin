import * as composerLockFileParser from '@snyk/composer-lockfile-parser';

import { systemDeps } from './system-deps';
import { PhpPluginResult, PhpOptions } from './types';

const PLUGIN_NAME = 'snyk-php-plugin';

export async function inspect(
  basePath: string,
  fileName: string,
  options: PhpOptions = {},
): Promise<PhpPluginResult> {
  const systemVersions = systemDeps(basePath, options);
  const depsTree = composerLockFileParser.buildDepTreeFromFiles(
    basePath,
    fileName,
    systemVersions,
    options.dev,
  );

  return Promise.resolve({
    package: depsTree,
    plugin: { name: PLUGIN_NAME, targetFile: fileName },
  });
}
