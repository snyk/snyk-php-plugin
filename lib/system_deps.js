var childProcess = require('child_process');
var path = require('path');

function cmdReturnsOk(cmd) {
  return (childProcess.spawnSync(cmd, {shell:true}).status === 0);
}

function composerIsFine() {
  return cmdReturnsOk('composer --version');
}

function composerPharIsFine(cmd) {
  return cmd && cmdReturnsOk(cmd);
}

function isSet(variable) {
  return typeof variable !== 'undefined';
}

function systemDeps(basePath, options) {
  var pharCmd = 'php ' + path.resolve(path.resolve() + '/composer.phar') +
    ' show -p --format=json';

  var composerOk = isSet(options.composerIsFine) ?
    options.composerIsFine : composerIsFine();
  var composerPharOk = isSet(options.composerPharIsFine) ?
    options.composerPharIsFine : composerPharIsFine(pharCmd);

  var finalVersionsObj = {};
  var versionsObj = options.systemVersions || [];

  if (composerOk) {
    var lines = childProcess.execSync('composer show -p', basePath).toString().
      split('\n');
    lines.forEach(function(line) {
      var parts = line.split(/\s+/);
      if (parts.length > 1) {
        versionsObj.push({name: parts[0], version: parts[1]});
      }
    });
  } else if (composerPharOk) {
    var output = childProcess.execSync(pharCmd).toString();
    versionsObj = JSON.parse(output).platform;
  }

  versionsObj.forEach(function(value) {
    finalVersionsObj[value.name] = value.version;
  });
  return finalVersionsObj;
}

module.exports = {
  systemDeps: systemDeps,
};
