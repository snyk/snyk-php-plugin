var debug = require('debug')('snyk');
var Composer = require('./composer');

var loadJsonFile = Composer.loadJsonFile;
var generateJsonReport = Composer.generateJsonReport;

function inspect(basePath, fileName) {
  var composerJsonObj;
  var composerLockObj;
  try {
    // lockfile. usually composer.lock
    composerLockObj = loadJsonFile(basePath, fileName);
    // throw an error if improper lockfile received
    if (typeof composerLockObj.packages !== 'object') {
      throw new Error('Invalid lock file ' + basePath + '/' + fileName);
    }
    // we want to load the json file as well; usually composer.json
    composerJsonObj = loadJsonFile(basePath,
      fileName.split('.').shift() + '.json');
  } catch (error) {
    debug(error.message);
    return Promise.reject(error || new Error('Unable to parse manifest files'));
  }
  var ret = generateJsonReport(fileName, composerJsonObj, composerLockObj);
  return Promise.resolve(ret);
}

module.exports = {
  inspect: inspect,
};
