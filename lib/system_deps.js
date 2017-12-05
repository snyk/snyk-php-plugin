var exec = require('child_process').execSync;
var path = require('path');

function whereisExists(programName) {
  var ret;
  try {
    ret = exec('whereis ' + programName).toString();
  } catch (err) {
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
      var lines = exec('cd ' + basePath + ' && composer show -p').stdout.
        split('\n');
      lines.forEach(function(line) {
        var parts = line.split(/\s+/);
        if (parts.length > 1) {
          versionsObj.push({name: parts[0], version: parts[1]});
        }
      });
    } else {
      // we don't have composer installed system-wide, so use local
      // in future, possible download. for now, we'll just check in the file
      try {
        var output = exec('cd ' + basePath + ' && php ' +
          path.resolve() + '/composer.phar' + ' show -p --format=json').
          toString();
        versionsObj = JSON.parse(output).platform;
      } catch (err) {}
    }
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
