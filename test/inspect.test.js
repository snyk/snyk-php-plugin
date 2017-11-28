var tap = require('tap');
var path = require('path');
var fs = require('fs');
var _ = require('../dist/lodash-min');
var request = require('sync-request');

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
  'proj_with_aliases',
  'proj_with_aliases_external_github',
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

tap.test('with alias in external repo', function (t) {
  var projFolder = './test/stubs/proj_with_aliases_external_github';
  return plugin.inspect(projFolder, 'composer.lock')
    .then(function (result) {
      var composerJson = JSON.parse(fs.readFileSync(
        path.resolve(projFolder, 'composer.json')));
      var composerJsonAlias = composerJson.require['symfony/monolog-bridge'];
      var aliasBranch = composerJsonAlias.split(' as ').shift().
        replace('dev-','');

      // to be really sure, we take a look at repo@`url` and check for branch
      var apiBranchesUrl = composerJson.repositories[0].url.replace(
        'https://github.com/', 'https://api.github.com/repos/') + '/branches';
      var res = request('GET', apiBranchesUrl, {
        'headers': {
          'user-agent': 'CI Testing',
        },
      });
      var branchesData = JSON.parse(res.getBody());
      var ourAliasBranchName = _.get(_.find(branchesData,
        {name: aliasBranch}), 'name');

      t.test('in composer.json', function(t) {
        //it's version looks like this: dev-my-bugfix as 2.7
        t.equal(composerJsonAlias.split(' as ').length, 2,
          'we are dealing with a repo that uses an alias');
        t.equal(composerJsonAlias.split('-').shift(), 'dev',
          'the alias part should start with dev- (whats after, is repo name)');
        t.type(composerJson.version, 'undefined',
          'there should not be a version property');
        // todo: should be able to detect this on any repo

        t.equal(composerJson.repositories[0].type, 'vcs',
          'there should be a type subproperty');
        t.equal(composerJson.repositories[0].url,
          'https://github.com/aryehbeitz/monolog-bridge',
          'there should be a url subproperty');
        // the alias is a branch
        t.equal(aliasBranch, ourAliasBranchName,
          'alias branch not found on remote github');
        t.end();
      });

      // now to make sure we got it right in the plugin parsing
      t.test('in plugin result', function(t) {
        var deps = result.package.dependencies;
        var monologBridgeObj = _.find(deps, {name: 'symfony/monolog-bridge'});
        // do we want our found version to contain a dev- prefix or not?
        // guessing not, we should add functionality so this test passes
        t.equal(monologBridgeObj.version, aliasBranch,
          'alias branch must match result');
        t.end();
      });
    }).catch(tap.threw);
});
