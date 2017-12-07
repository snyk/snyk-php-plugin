var childProcess = require('child_process');
var path = require('path');

function cmdReturnsOk(cmd) {
  return cmd && childProcess.spawnSync(cmd, {shell:true}).status === 0;
}

function isSet(variable) {
  return typeof variable !== 'undefined';
}

function systemDeps(basePath, options) {
  var pharCmd = 'php ' + path.resolve(path.resolve() + '/composer.phar') +
    ' show -p --format=json';
  var composerCmd = 'composer --version';

  var composerOk = isSet(options.composerIsFine) ?
    options.composerIsFine : cmdReturnsOk(composerCmd);
  var composerPharOk = isSet(options.composerPharIsFine) ?
    options.composerPharIsFine : cmdReturnsOk(pharCmd);

  var versionsObj = (Object.keys(options.systemVersions).length > 0) ?
    options.systemVersions : [];

  if (composerOk) {
    var lines = childProcess.execSync('composer show -p', {cwd: basePath}).
      toString().split('\n');
    lines.forEach(function(line) {
      var parts = line.split(/\s+/);
      if (parts.length > 1) {
        versionsObj.push({name: parts[0], version: parts[1]});
      }
    });
  } else if (composerPharOk) {
    var output = childProcess.execSync(pharCmd).toString();
    versionsObj = JSON.parse(output).platform;
  } else {
    // TODO: we want to tell the user we are not reporting accuratly system
    // versions, so some version information may not be exact
  }

  var finalVersionsObj = {};
  versionsObj.forEach(function(value) {
    finalVersionsObj[value.name] = value.version;
  });
  return finalVersionsObj;
}

module.exports = {
  systemDeps: systemDeps,
};
