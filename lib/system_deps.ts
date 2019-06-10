import * as cmds from './composer_cmds';

function isSet(variable) {
  return typeof variable !== 'undefined';
}

export function systemDeps(basePath, options) {
  const composerOk = isSet(options.composerIsFine) ? options.composerIsFine : cmds.cmdReturnsOk(cmds.composerCmd);
  const composerPharOk = isSet(options.composerPharIsFine) ?
      options.composerPharIsFine : cmds.cmdReturnsOk(cmds.pharCmd);

  let finalVersionsObj = {};

  if (options.systemVersions && (Object.keys(options.systemVersions).length > 0)) {
    // give first preference to a stub
    finalVersionsObj = options.systemVersions;
  } else if (composerOk) {
    const lines = cmds.execWithResult(cmds.composerShowCmd, basePath).split('\n');
    lines.forEach((line) => {
      const parts = line.split(/\s+/);
      if (parts.length > 1) {
        finalVersionsObj[parts[0]] = parts[1];
      }
    });
  } else if (composerPharOk) {
    const output = cmds.execWithResult(cmds.pharCmd, basePath);
    const versionsObj = JSON.parse(output).platform;
    versionsObj.forEach((value) => {
      finalVersionsObj[value.name] = value.version;
    });
  } else {
    // TODO: tell the user we are not reporting accurately system versions, so some version info may not be exact
  }

  return finalVersionsObj;
}
