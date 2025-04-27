import {SystemPackages} from '@snyk/composer-lockfile-parser';

import * as cmds from './composer-cmds';
import {PhpOptions} from './types';

function isSet(variable: boolean | undefined): boolean {
  return typeof variable !== 'undefined';
}

export function systemDeps(basePath: string, options: PhpOptions): SystemPackages {
  const composerOk = isSet(options.composerIsFine) ?
    options.composerIsFine : cmds.cmdReturnsOk(cmds.composerCmd.command, [...cmds.composerCmd.args, ...cmds.versionArgs.args]);
  const composerPharOk = isSet(options.composerPharIsFine) ?
    options.composerPharIsFine : cmds.cmdReturnsOk(cmds.composerPharCmd.command, [...cmds.composerPharCmd.args, ...cmds.versionArgs.args]);

  let finalVersionsObj = {};

  if (options.systemVersions && (Object.keys(options.systemVersions).length > 0)) {
    // give first preference to a stub
    finalVersionsObj = options.systemVersions;
  } else if (composerOk || composerPharOk) {
    const composer = composerOk ? cmds.composerCmd : cmds.composerPharCmd;

    const output = cmds.execWithResult(composer.command, basePath, [...composer.args, ...cmds.showArgs.args]);
    const versionsObj = JSON.parse(output).platform;

    versionsObj.forEach(({name, version}) => {
      finalVersionsObj[name] = version;
    });
  } else {
    // TODO: tell the user we are not reporting accurately system versions, so some version info may not be exact
  }

  return finalVersionsObj;
}
