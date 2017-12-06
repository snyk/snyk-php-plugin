var exec = require('child_process').execSync;
var path = require('path');

function cmdFound(programName) {
  var ret;
  try {
    ret = exec(programName).toString();
  } catch (err) {
    return false;
  }

  // checks for failure because command not found (linux, win10, older windows)
  if (ret.indexOf('command not found') > -1 ||
    ret.indexOf('is not recognized as an internal or external command') > -1 ||
    ret.indexOf('Bad command or file name') > -1) {
    return false;
  }
  return true;
}

function systemDeps(basePath) {
  var versionsObj = [];
  if (cmdFound('php --version')) {
    // php exists system-wide
    if (cmdFound('composer --version')) {
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
