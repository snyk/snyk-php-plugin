import * as fs from 'fs';
import * as tap from 'tap';
import * as _ from 'lodash';
import * as path from 'path';
import * as request from 'sync-request';

import * as plugin from '../lib';
import { systemVersionsStub } from './stubs/system_deps_stub';

const options: any = {systemVersions: systemVersionsStub};

const deepTestFolders = [
  'proj_with_no_deps',
  'vulnerable_project',
  'circular_deps_php_project',
  'many_deps_php_project',
  'circular_deps_special_test',
  'proj_with_aliases',
  'proj_with_aliases_external_github',
  'no_branch_alias',
];

deepTestFolders.forEach((folder) => {
  tap.test('php plugin for ' + folder, (t) => {
    const projFolder = './test/stubs/' + folder;
    return plugin.inspect(projFolder, 'composer.lock', options)
      .then((result) => {
        t.test('match packages with expected', (test) => {
          const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf-8'));
          test.deepEqual(result, expectedTree);
          test.end();
        });
      }).catch(tap.threw);
  });
});

tap.test('php plugin for project with many deps', (t) => {
  const projFolder = './test/stubs/many_deps_php_project';
  return plugin.inspect(projFolder, './composer.lock', options)
    .then((result) => {
      const plugin = result.plugin;
      const pkg = result.package;
      t.test('match plugin object', (test) => {
        test.ok(plugin, 'plugin');
        test.equal(plugin.name, 'snyk-php-plugin', 'name');
        test.equal(plugin.targetFile, './composer.lock');
        test.end();
      });

      t.test('match root pkg object', (test) => {
        test.match(pkg, {
          name: 'symfony/console',
          version: '4.0-dev',
          packageFormatVersion: 'composer:0.0.1',
        }, 'root pkg');
        test.end();
      });
    });
});

tap.test('php plugin for project with interconnected deps', (t) => {
  const projFolder = './test/stubs/interdependent_modules';
  return plugin.inspect(projFolder, './composer.lock', options)
    .then((result) => {
      const plugin = result.plugin;
      const pkg = result.package;
      t.test('match plugin object', (test) => {
        test.ok(plugin, 'plugin');
        test.equal(plugin.name, 'snyk-php-plugin', 'name');
        test.equal(plugin.targetFile, './composer.lock');
        test.end();
      });

      t.test('match root pkg object', (test) => {
        test.match(pkg, {
          name: 'foo',
          version: '1.1.1',
          packageFormatVersion: 'composer:0.0.1',
        }, 'root pkg');
        test.end();
      });
      t.test('dep tree total size is as expected', (test) => {
        test.ok(JSON.stringify(pkg).length < 200000, 'dep tree JSON < 200KB');
        test.end();
      });
    });
});

tap.test('with alias, uses correct version', (t) => {
  const projFolder = './test/stubs/proj_with_aliases';
  return plugin.inspect(projFolder, 'composer.lock', options)
    .then((result) => {
      const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf-8'));
      const deps = result.package.dependencies;
      // @ts-ignore
        const monologBridgeObj = _.find(deps, { name: 'symfony/monolog-bridge' });
      // remove the trailing .0
      const actualVersionInstalled =
        monologBridgeObj.version.slice(0, -2);
      const expectedVersionString = _.get(composerJson,
        'require[\'symfony/monolog-bridge\']'); // '2.6 as 2.7'
      const expectedVersion = expectedVersionString.split(' as ');
      const realVersion = expectedVersion[0]; // 2.6
      const aliasVersion = expectedVersion[1]; // 2.7
      t.test('so versions to real version and not alias', (test) => {
        test.equal(actualVersionInstalled, realVersion, 'version mismatch');
        test.notEqual(actualVersionInstalled, aliasVersion, 'matches alias!');
        test.end();
      });
    }).catch(tap.threw);
});

tap.test('with alias in external repo', (t) => {
  const projFolder = './test/stubs/proj_with_aliases_external_github';
  return plugin.inspect(projFolder, 'composer.lock', options)
    .then((result) => {
      const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf-8'));
      const composerJsonAlias = composerJson.require['symfony/monolog-bridge'];
      const aliasBranch = composerJsonAlias.split(' as ').shift().
        replace('dev-','');

      // to be really sure, we take a look at repo@`url` and check for branch
      const apiBranchesUrl = composerJson.repositories[0].url.replace(
        'https://github.com/', 'https://api.github.com/repos/') + '/branches';
      let branchesData;

      // sometimes we hit the github api limit, so we use a mock
      try {
        const res = request('GET', apiBranchesUrl, {
          'headers': {
            'user-agent': 'CI Testing',
          },
        });
        branchesData = JSON.parse(res.getBody());
      } catch (error) {
        branchesData = [{'name': 'my-bugfix'}];
      }
      const ourAliasBranchName = _.get(_.find(branchesData,
        {name: aliasBranch}), 'name');

      t.test('in composer.json', (test) => {
        //it's version looks like this: dev-my-bugfix as 2.7
        test.equal(composerJsonAlias.split(' as ').length, 2,
          'we are dealing with a repo that uses an alias');
        test.equal(composerJsonAlias.split('-').shift(), 'dev',
          'the alias part should start with dev- (whats after, is repo name)');
        test.type(composerJson.version, 'undefined',
          'there should not be a version property');
        // todo: should be able to detect this on any repo

        test.equal(composerJson.repositories[0].type, 'vcs',
          'there should be a type subproperty');
        test.equal(composerJson.repositories[0].url,
          'https://github.com/aryehbeitz/monolog-bridge',
          'there should be a url subproperty');
        // the alias is a branch
        test.equal(aliasBranch, ourAliasBranchName, 'alias branch not found on remote github');
        test.end();
      });

      // now to make sure we got it right in the plugin parsing
      t.test('in plugin result', (test) => {
        const deps = result.package.dependencies;
        // @ts-ignore
          const monologBridgeObj = _.find(deps, { name: 'symfony/monolog-bridge' });
        // do we want our found version to contain a dev- prefix or not?
        // guessing not, we should add functionality so this test passes
        test.equal(monologBridgeObj.version, aliasBranch, 'alias branch must match result');
        test.end();
      });
    }).catch(tap.threw);
});

tap.test('versions inacurracy when composer is not installed', (t) => {
  const projFolder = './test/stubs/vulnerable_project';
  // when we pass values, it takes them. if we don't pass them, it checks
  options.composerIsFine = false;
  options.composerPharIsFine = false;
  options.systemVersions = [];

  return plugin.inspect(projFolder, 'composer.lock', options)
    .then((result) => {
      t.test('match packages with expected', (test) => {
        const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps_no_system_versions.json'), 'utf-8'));
        test.deepEqual(result, expectedTree);
        test.end();
      });
    }).catch(tap.threw);
});

tap.test('project name is not empty', (t) => {
  const projFolder = './test/stubs/no_project_name';

  return plugin.inspect(projFolder, 'composer.lock', options)
    .then((result) => {
      t.test('make sure project name is no-name', (test) => {
        test.deepEqual(result.package.name, 'no_project_name');
        test.end();
      });
    }).catch(tap.threw);
});
