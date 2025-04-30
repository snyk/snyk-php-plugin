import { SystemPackages } from '@snyk/composer-lockfile-parser';

import * as cmds from './composer-cmds';
import { PhpOptions } from './types';

export function systemDeps(basePath: string, options: PhpOptions): SystemPackages {
  const composerOk = options.composerIsFine ?? cmds.cmdReturnsOk(cmds.Composer.global().version());
  const composerPharOk = options.composerPharIsFine ?? cmds.cmdReturnsOk(cmds.Composer.local().version());

  let finalVersionsObj = {};

  if (options.systemVersions && (Object.keys(options.systemVersions).length > 0)) {
    // give first preference to a stub
    finalVersionsObj = options.systemVersions;
  } else if (composerOk || composerPharOk) {
    const composer = composerOk ? cmds.Composer.global() : cmds.Composer.local();

    const output = cmds.execWithResult(composer.listPlatformDeps(), basePath);
    const versionsObj = JSON.parse(output).platform;

    versionsObj.forEach(({name, version}) => {
      finalVersionsObj[name] = version;
    });
  } else {
    // TODO: tell the user we are not reporting accurately system versions, so some version info may not be exact
  }

  return finalVersionsObj;
}
