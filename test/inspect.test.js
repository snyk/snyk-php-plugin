var tap = require('tap');
var path = require('path');
var fs = require('fs');

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
          packageFormatVersion: 'php:0.0.1',
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
];

deepTestFolders.forEach( function(folder) {
  tap.test('php plugin for project with no deps', function (t) {
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
