import * as fs from 'fs';
import * as tap from 'tap';
import * as path from 'path';
import * as request from 'sync-request';

import * as plugin from '../lib';
import { systemVersionsStub } from './stubs/system-deps-stub';
import { PhpOptions } from '../lib/types';

const systemVersionsOptions: PhpOptions = { systemVersions: systemVersionsStub };
const systemVersionsAndDevOptions: PhpOptions = { systemVersions: systemVersionsStub, dev: true };

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
  tap.test('php plugin for ' + folder, async (t) => {
    const projFolder = './test/fixtures/' + folder;
    const result = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);
    t.test('match packages with expected', (test) => {
      const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf-8'));
      test.deepEqual(result, expectedTree);
      test.end();
    });
  });
});

tap.test('dev dependencies are not parsed by default', async (t) => {
  const projFolder = './test/fixtures/proj_with_dev_deps';
  const result = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);
  t.test('match packages with expected', (test) => {
    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf-8'));
    test.deepEqual(result, expectedTree);
    test.end();
  });
});

tap.test('dev dependencies are parsed when include dev true', async (t) => {
  const projFolder = './test/fixtures/proj_with_dev_deps';
  const result = await plugin.inspect(projFolder, 'composer.lock', systemVersionsAndDevOptions);
  t.test('match packages with expected', (test) => {
    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps_with_dev.json'), 'utf-8'));
    test.deepEqual(result, expectedTree);
    test.end();
  });
});

tap.test('php plugin for project with many deps', async (t) => {
  const projFolder = './test/fixtures/many_deps_php_project';
  const { plugin: resultPlugin, package: pkg } = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);

  t.test('match plugin object', (test) => {
    test.ok(resultPlugin, 'plugin');
    test.equal(resultPlugin.name, 'snyk-php-plugin', 'name');
    test.equal(resultPlugin.targetFile, './composer.lock');
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

tap.test('php plugin for project with interconnected deps', async (t) => {
  const projFolder = './test/fixtures/interdependent_modules';
  const { plugin: resultPlugin, package: pkg } = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);

  t.test('match plugin object', (test) => {
    test.ok(plugin, 'plugin');
    test.equal(resultPlugin.name, 'snyk-php-plugin', 'name');
    test.equal(resultPlugin.targetFile, './composer.lock');
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

tap.test('with alias, uses correct version', async (t) => {
  const projFolder = './test/fixtures/proj_with_aliases';
  const { package: pkg } = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);
  const deps = pkg.dependencies;
  const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf-8'));
  const { version } = deps['symfony/monolog-bridge'];
  // remove the trailing .0
  const actualVersionInstalled = version.slice(0, -2);
  const expectedVersionString = composerJson.require && composerJson.require['symfony/monolog-bridge']; // '2.6 as 2.7'
  // real = 2.6, alias = 2.7
  const [ realVersion, aliasVersion ] = expectedVersionString.split(' as ');

  t.test('so versions to real version and not alias', (test) => {
    test.equal(actualVersionInstalled, realVersion, 'version mismatch');
    test.notEqual(actualVersionInstalled, aliasVersion, 'matches alias!');
    test.end();
  });
});

tap.test('with alias in external repo', async (t) => {
  const projFolder = './test/fixtures/proj_with_aliases_external_github';
  const { package: pkg } = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);
  const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf-8'));
  const composerJsonAlias = composerJson.require['symfony/monolog-bridge'];
  const aliasBranch = composerJsonAlias.split(' as ').shift().replace('dev-', '');

  // to be really sure, we take a look at repo@`url` and check for branch
  const apiBranchesUrl = composerJson.repositories[0].url.replace(
    'https://github.com/', 'https://api.github.com/repos/') + '/branches';
  let branchesData;

  // sometimes we hit the github api limit, so we use a mock
  try {
    const res = request('GET', apiBranchesUrl, {
      headers: {
        'user-agent': 'CI Testing',
      },
    });

    branchesData = JSON.parse(res.getBody());
  } catch (error) {
    branchesData = [{name: 'my-bugfix'}];
  }

  const ourAliasBranchObj = branchesData.find(({name}) => name === aliasBranch);
  const ourAliasBranchName = ourAliasBranchObj && ourAliasBranchObj.name;

  t.test('in composer.json', (test) => {
    // it's version looks like this: dev-my-bugfix as 2.7
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
    const deps = pkg.dependencies;
    const {version} = deps['symfony/monolog-bridge'];
    // do we want our found version to contain a dev- prefix or not?
    // guessing not, we should add functionality so this test passes
    test.equal(version, aliasBranch, 'alias branch must match result');
    test.end();
  });
});

tap.test('versions inacurracy when composer is not installed', async (t) => {
  const projFolder = './test/fixtures/vulnerable_project';
  // when we pass values, it takes them. if we don't pass them, it checks
  const options = {
    composerIsFine: false,
    composerPharIsFine: false,
    systemVersions: [],
  };

  const result = await plugin.inspect(projFolder, 'composer.lock', options);

  t.test('match packages with expected', (test) => {
    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps_no_system_versions.json'),
      'utf-8'));
    test.deepEqual(result, expectedTree);
    test.end();
  });
});

tap.test('project name is not empty', async (t) => {
  const projFolder = './test/fixtures/no_project_name';

  const { package: pkg } = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);

  t.test('make sure project name is no-name', (test) => {
    test.deepEqual(pkg.name, 'no_project_name');
    test.end();
  });
});

tap.test('project with composer deprecations [no system version stubs]', async (t) => {
  const projFolder = './test/fixtures/project_with_composer_deprecations';
  // Use the fake composer.phar file to output system dependencies.
  const options = {
    composerIsFine: false,
    composerPharIsFine: true,
    systemVersions: [],
  };

  const result = await plugin.inspect(projFolder, 'composer.lock', options);

  t.test('match packages with expected', (test) => {
    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf-8'));
    test.deepEqual(result, expectedTree);
    test.end();
  });
});
