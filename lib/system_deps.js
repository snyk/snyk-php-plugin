var exec = require('child_process').execSync;
var fs = require('fs');
var path = require('path');

function whereisExists(programName) {
  try {
    var ret = exec('whereis ' + programName).toString();
    // var ret = exec('php composer.json').toString();
  } catch(err) {
    return false;
  }

  return ret.replace(programName + ':\n', '').length > 0;
}

function systemDeps(basePath, debug) {
  var versionsObj = [];
  if (debug) {
    versionsObj = require(path.resolve() + '/test/system_deps_stub.js').
      systemDepsStub;
  }
  if (whereisExists('php')) {
    // php exists system-wide
    if (whereisExists('composer')) {
      // composer exists system-wide
      var data = exec('cd ' + basePath + ' && composer show -p').stdout;
      var lines = data.split("\n");
      lines.forEach(function(line) {
        var parts = line.split(/\s+/);
        if (parts.length > 1) {
          versionsObj.push({name: parts[0], version: parts[1]});
        }
      });
    } else {
      // we don't have composer installed system-wide, so use local
      // in future, possible download. for now, we'll just check in the file
      composerFile = path.resolve() + '/composer.phar';
      var toExec = 'cd ' + basePath + ' && php ' +
          composerFile + ' show -p --format=json';
      try {
        var output = exec('cd ' + basePath + ' && php ' +
          composerFile + ' show -p --format=json').toString();
        versionsObj = JSON.parse(output).platform;
      } catch (err) {}
    }
  }

  var finalVersionsObj = {};
  for (var i in versionsObj) {
    finalVersionsObj[versionsObj[i].name] = versionsObj[i].version;
  }
  return finalVersionsObj;
}
module.exports = {
  systemDeps: systemDeps,
}
