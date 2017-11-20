var fs = require('fs');
var path = require('path');
var _ = require('../dist/lodash-min');

function loadJsonFile(basePath, fileName) {
  var resolvedPath = path.join(basePath, fileName);
  var loadedFile = fs.readFileSync(resolvedPath).toString();
  return JSON.parse(loadedFile);
}

function getFirstAvailableAliasVersion(applicationDataObj) {
  var availableAliases = _.get(applicationDataObj, 'extra[\'branch-alias\']');
  if (availableAliases) {
    return _.get(availableAliases, Object.keys(availableAliases)[0]);
  }
}

// recursive function to build dependencies
function buildDependencies(
  composerJsonObj, composerLockObjPackages, depObj, fromArr) {
  var requires = _.get(depObj, 'require');
  if (typeof requires === 'undefined') {
    return {};
  }
  var requiresKeys = Object.keys(requires);
  var baseObject = {};
  var savedFromArr = fromArr;
  requiresKeys.forEach (function (depName) {
    fromArr = _.clone(savedFromArr);

    var depFoundVersion;
    // lets find if this dependency has an object in composer.lock
    var applicationData = _.find(composerLockObjPackages, {name: depName});
    if (applicationData) {
      depFoundVersion = _.get(applicationData, 'version');
      if (!depFoundVersion || !(/\d/.test(depFoundVersion))) {
        depFoundVersion = getFirstAvailableAliasVersion(applicationData);
      }
    } else {
      // we couldn't find the dependency version in the lock
      // here we user the version from the requires - not a locked version
      depFoundVersion = _.get(_.get(composerJsonObj, 'require'), depName) ||
        _.get(requires, depName);
    }

    fromArr.push(depName + '@' + depFoundVersion);
    baseObject[depName] = {
      name: depName,
      version: depFoundVersion,
      from: _.clone(fromArr),
      dependencies: {},
    };

    baseObject[depName].dependencies =
      buildDependencies(composerJsonObj, composerLockObjPackages,
        _.find(composerLockObjPackages, {name: depName}), _.clone(fromArr));
  });
  return baseObject;
}

function generateJsonReport(fileName, composerJsonObj, ComposerLockObj) {
  var composerLockObjPackages = ComposerLockObj.packages;
  var applicationName = composerJsonObj.name;

  var applicationVersion = getFirstAvailableAliasVersion(composerJsonObj) ||
    '0.0.0';

  var fromArr = [applicationName + '@' + applicationVersion];
  var data = {
    plugin: {
      name: 'snyk-php-plugin',
      targetFile: fileName,
    },
    package: {
      name: applicationName,
      version: applicationVersion,
      packageFormatVersion: 'php:0.0.1',
      dependencies: {},
      from: fromArr,
    },
  };
  data.package.dependencies = buildDependencies(composerJsonObj,
    composerLockObjPackages, composerJsonObj, fromArr);
  return data;
}

module.exports = {
  loadJsonFile: loadJsonFile,
  generateJsonReport: generateJsonReport,
};
