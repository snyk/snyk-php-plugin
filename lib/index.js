var debug = require('debug')('snyk');
var Composer = require('./composer');
var systemDeps = require('./system_deps.js').systemDeps;

var loadJsonFile = Composer.loadJsonFile;
var generateJsonReport = Composer.generateJsonReport;

function inspect(basePath, fileName, options = {debug:false}) {
  var composerJsonObj;
  var composerLockObj;
  var systemVersions;

  try {
    // lockfile. usually composer.lock
    composerLockObj = loadJsonFile(basePath, fileName);
    // we want to load the json file as well; usually composer.json
    composerJsonObj = loadJsonFile(basePath,
      fileName.split('.').shift() + '.json');

    systemVersions = systemDeps(basePath, options.debug);
  } catch (error) {
    debug(error.message);
    return Promise.reject(new Error('Unable to parse manifest files'));
  }
  var ret = generateJsonReport(
    fileName, composerJsonObj, composerLockObj, systemVersions);
  return Promise.resolve(ret);
}

module.exports = {
  inspect: inspect,
};
