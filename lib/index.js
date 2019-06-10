var debug = require('debug')('snyk');
var composerLockFileParser = require('@snyk/composer-lockfile-parser');

var systemDeps = require('./system_deps.js').systemDeps;

function inspect(basePath, fileName, options) {
  options = options || {};

  var systemVersions = systemDeps(basePath, options);
  var data = {
    plugin: {
      name: 'snyk-php-plugin',
      targetFile: fileName,
    },
    package: composerLockFileParser.buildDepTreeFromFiles(basePath, fileName, systemVersions),
  };

  return Promise.resolve(data);
}

module.exports = {
  inspect,
};
