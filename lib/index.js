var debug = require('debug')('snyk');
var Composer = require('./composer');

var loadJsonFile = Composer.loadJsonFile;
var generateJsonReport = Composer.generateJsonReport;

function inspect(basePath, fileName) {
  var composerJsonObj;
  var composerLockObj;
  try {
    // fileName should be composer.lock
    composerLockObj = loadJsonFile(basePath, fileName);
    // we want to load the composer.json too
    composerJsonObj = loadJsonFile(basePath,
      fileName.split('.').shift() + '.json');
  } catch (error) {
    debug(error.message);
    return Promise.reject(new Error('Unable to parse manifest files'));
  }
  var ret = generateJsonReport(fileName, composerJsonObj, composerLockObj);
  return Promise.resolve(ret);
}

module.exports = {
  inspect: inspect,
};
