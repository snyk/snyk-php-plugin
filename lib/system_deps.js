var childProcess = require('child_process');
var path = require('path');

function cmdFound(cmd) {
  return (!childProcess.spawnSync(cmd, {shell:true}).stderr.length);
}

function systemDeps(basePath) {
  var versionsObj = [];
  if (cmdFound('php --version')) {
    // so php exists system-wide
    if (cmdFound('composer --version')) {
      // so composer exists system-wide.
      // currently, the system composer doesn't include the --format=json flag
      var lines = childProcess.execSync('composer show -p', basePath).
        toString().split('\n');
      lines.forEach(function(line) {
        var parts = line.split(/\s+/);
        if (parts.length > 1) {
          versionsObj.push({name: parts[0], version: parts[1]});
        }
      });
    } else {
      // we don't have composer installed system-wide, so use local
      // in future, possibly download. for now, we'll use included file
      try {
        var output = childProcess.execSync('php ' + path.resolve(
          './composer.phar') + ' show -p --format=json', basePath).toString();
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
