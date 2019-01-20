var fs = require('fs');
var path = require('path');
var debug = require('debug')('snyk');
var Composer = require('./composer');
var systemDeps = require('./system_deps.js').systemDeps;

var generateJsonReport = Composer.generateJsonReport;

function inspect(basePath, fileName, options) {
  options = options || {};

  var composerJsonObj;
  var composerLockObj;
  var systemVersions;

  try {
    // lockfile. usually composer.lock
    var lockfilePath = path.resolve(basePath, fileName);
    if (!fs.existsSync(lockfilePath)) {
      throw new Error('Missing lock file at ' + lockfilePath);
    }
    composerLockObj = JSON.parse(fs.readFileSync(lockfilePath).toString());
    // throw an error if improper lockfile received
    if (typeof composerLockObj.packages !== 'object') {
      throw new Error('Invalid lock file at ' + lockfilePath);
    }

    // load the manifest file (composer.json) at the same path as the lockfile
    var manifestPath = path.resolve(basePath, path.dirname(fileName), 'composer.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Missing manifest file at ' + manifestPath);
    }
    composerJsonObj = JSON.parse(fs.readFileSync(manifestPath).toString());

    // load system versions of dependencies if available
    systemVersions = systemDeps(basePath, options);
  } catch (error) {
    debug(error.message);
    return Promise.reject(error || new Error('Unable to parse manifest files'));
  }
  var ret = generateJsonReport(
    basePath, fileName, composerJsonObj, composerLockObj, systemVersions);
  return Promise.resolve(ret);
}

module.exports = {
  inspect: inspect,
};
