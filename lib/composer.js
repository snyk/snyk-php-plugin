var fs = require('fs');
var path = require('path');
var _ = require('../dist/lodash-min');

function loadJsonFile(basePath, fileName) {
  var resolvedPath = path.join(basePath, fileName);
  var loadedFile = fs.readFileSync(resolvedPath).toString();
  return JSON.parse(loadedFile);
}

function getVersion(applicationDataObj) {
  // check for `version` property. may not exist
  var versionFound = _.get(applicationDataObj, 'version');
  // even if found, may be an alias, so check
  var availableAliases = _.get(applicationDataObj,
    'extra[\'branch-alias\']', []);
  // if the version matches the alias, use the aliases version
  // otherwise, use the version as is, and if not, the first found alias
  return _.get(availableAliases, versionFound, versionFound ||
    availableAliases[Object.keys(availableAliases)[0]]);
}

function alreadyAddedDep(arrayOfFroms, packageName) {
  return arrayOfFroms.filter( function(dep) {
    return dep.split('@').shift() === packageName;
  }).length > 0;
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
  requiresKeys.forEach (function (depName) {
    var clonedFromArr = _.clone(fromArr);

    var depFoundVersion;
    // lets find if this dependency has an object in composer.lock
    var applicationData = _.find(composerLockObjPackages, {name: depName});
    if (applicationData) {
      depFoundVersion = getVersion(applicationData);
    } else {
      // we couldn't find the dependency version in the lock
      // here we use the version from the requires - not a locked version
      depFoundVersion = _.get(_.get(composerJsonObj, 'require'), depName) ||
        _.get(requires, depName);
    }

    baseObject[depName] = {
      name: depName,
      version: depFoundVersion,
      from: clonedFromArr,
      dependencies: {},
    };

    if (!alreadyAddedDep(clonedFromArr, depName)) {
      clonedFromArr.push(depName + '@' + depFoundVersion);
      baseObject[depName].dependencies =
        buildDependencies(composerJsonObj, composerLockObjPackages,
          _.find(composerLockObjPackages, {name: depName}), clonedFromArr);
    }
  });
  return baseObject;
}

function generateJsonReport(fileName, composerJsonObj, ComposerLockObj) {
  var composerLockObjPackages = ComposerLockObj.packages;
  var applicationName = composerJsonObj.name;

  var applicationVersion = getVersion(composerJsonObj) ||
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
      packageFormatVersion: 'composer:0.0.1',
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
