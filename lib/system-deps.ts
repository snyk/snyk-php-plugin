import * as os from 'os';
import { SystemPackages } from '@snyk/composer-lockfile-parser';

import * as cmds from './composer-cmds';
import { PhpOptions } from './types';

function isSet(variable): boolean {
  return typeof variable !== 'undefined';
}

export function systemDeps(basePath: string, options: PhpOptions): SystemPackages {
  const composerOk = isSet(options.composerIsFine) ? options.composerIsFine : cmds.cmdReturnsOk(cmds.composerCmd.command,cmds.composerCmd.args);
  const composerPharOk = isSet(options.composerPharIsFine) ?
    options.composerPharIsFine : cmds.cmdReturnsOk(cmds.pharCmd.command, cmds.pharCmd.args);

  let finalVersionsObj = {};

  if (options.systemVersions && (Object.keys(options.systemVersions).length > 0)) {
    // give first preference to a stub
    finalVersionsObj = options.systemVersions;
  } else if (composerOk) {
    const lines = cmds.execWithResult(cmds.composerShowCmd.command, basePath, cmds.composerShowCmd.args).split(os.EOL);
    lines.forEach((line) => {
      const [part1, part2] = line.split(/\s+/);
      if (part2) {
        finalVersionsObj[part1] = part2;
      }
    });
  } else if (composerPharOk) {
    const output = cmds.execWithResult(cmds.pharCmd.command, basePath, cmds.pharCmd.args);
    const versionsObj = JSON.parse(output).platform;
    versionsObj.forEach(({name, version}) => {
      finalVersionsObj[name] = version;
    });
  } else {
    // TODO: tell the user we are not reporting accurately system versions, so some version info may not be exact
  }

  return finalVersionsObj;
}
