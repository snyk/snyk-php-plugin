var tap = require('tap');
var path = require('path');
var fs = require('fs');
var _ = require('../dist/lodash-min');

var plugin = require('../lib');

tap.test('php plugin for project with many deps', function (t) {
  var projFolder = './test/stubs/many_deps_php_project';
  return plugin.inspect(projFolder, 'composer.lock')
    .then(function (result) {
      var plugin = result.plugin;
      var pkg = result.package;
      t.test('match plugin object', function (t) {
        t.ok(plugin, 'plugin');
        t.equal(plugin.name, 'snyk-php-plugin', 'name');
        t.equal(plugin.targetFile, 'composer.lock');
        t.end();
      });

      t.test('match root pkg object', function (t) {
        t.match(pkg, {
          name: 'symfony/console',
          version: '4.0-dev',
          from: ['symfony/console@4.0-dev'],
          packageFormatVersion: 'composer:0.0.1',
        }, 'root pkg');
        t.end();
      });
    });
});

var deepTestFolders = [
  'proj_with_no_deps',
  'vulnerable_project',
  'circular_deps_php_project',
  'many_deps_php_project',
  'circular_deps_special_test',
];

deepTestFolders.forEach( function(folder) {
  tap.test('php plugin for ' + folder, function (t) {
    var projFolder = './test/stubs/' + folder;
    return plugin.inspect(projFolder, 'composer.lock')
      .then(function (result) {
        t.test('match packages with expected', function (t) {
          var expectedTree = JSON.parse(fs.readFileSync(
            path.resolve(projFolder, 'composer_deps.json')));
          t.deepEqual(
            result,
            expectedTree);
          t.end();
        });
      }).catch(tap.threw);
  });
});

tap.test('with alias, uses correct version', function (t) {
  var projFolder = './test/stubs/proj_with_aliases';
  return plugin.inspect(projFolder, 'composer.lock')
    .then(function (result) {
      var composerJson = JSON.parse(fs.readFileSync(
        path.resolve(projFolder, 'composer.json')));
      var deps = result.package.dependencies;
      var monologBridgeObj = _.find(deps, {name: 'symfony/monolog-bridge'});
      // remove v from 'v2.6.0' and the trailing .0
      var actualVersionInstalled =
        monologBridgeObj.version.substr(1).slice(0, -2);
      var expectedVersionString = _.get(composerJson,
        'require[\'symfony/monolog-bridge\']'); // '2.6 as 2.7'
      var expectedVersion = expectedVersionString.split(' as ');
      var realVersion = expectedVersion[0]; // 2.6
      var aliasVersion = expectedVersion[1]; // 2.7
      t.test('so versions to real version and not alias', function (t) {
        t.equal(actualVersionInstalled, realVersion, 'version mismatch');
        t.notEqual(actualVersionInstalled, aliasVersion, 'matches alias!');
        t.end();
      });
    }).catch(tap.threw);
});
