import {describe, expect, it} from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import * as plugin from '../lib';
import {systemVersionsStub} from './stubs/system-deps-stub';
import {PhpOptions} from '../lib/types';

const systemVersionsOptions: PhpOptions = {systemVersions: systemVersionsStub};

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

describe('php plugin', () => {
  it.each(deepTestFolders)('matches expected packages for %s', async (folder) => {
    const projFolder = './test/fixtures/' + folder;
    const result = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);

    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf8'));
    expect(result).toEqual(expectedTree);
  });
});

describe('dev dependencies', () => {
  it('does not parse dev dependencies by default', async () => {
    const projFolder = './test/fixtures/proj_with_dev_deps';
    const result = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);

    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf8'));
    expect(result).toEqual(expectedTree);
  });

  it('parses dev dependencies when include dev true', async () => {
    const projFolder = './test/fixtures/proj_with_dev_deps';
    const result = await plugin.inspect(projFolder, 'composer.lock', {
      ...systemVersionsOptions,
      dev: true
    });

    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps_with_dev.json'), 'utf8'));
    expect(result).toEqual(expectedTree);
  });
});

describe('project with many deps', () => {
  it('generates plugin and root package objects', async () => {
    const projFolder = './test/fixtures/many_deps_php_project';
    const {
      plugin: resultPlugin,
      package: pkg
    } = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);

    // Plugin.
    expect(resultPlugin).toBeTruthy();
    expect(resultPlugin.name).toEqual('snyk-php-plugin');
    expect(resultPlugin.targetFile).toEqual('./composer.lock');

    // Package.
    expect(pkg).toMatchObject({
      name: 'symfony/console',
      version: '4.0-dev',
      packageFormatVersion: 'composer:0.0.1',
    });
  });
});

describe('project with interconnected deps', () => {
  it('generates plugin and root package objects', async () => {
    const projFolder = './test/fixtures/interdependent_modules';
    const {
      plugin: resultPlugin,
      package: pkg
    } = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);

    // Plugin.
    expect(resultPlugin).toBeTruthy();
    expect(resultPlugin.name).toEqual('snyk-php-plugin');
    expect(resultPlugin.targetFile).toEqual('./composer.lock');

    // Package.
    expect(pkg).toMatchObject({
      name: 'foo',
      version: '1.1.1',
      packageFormatVersion: 'composer:0.0.1',
    });

    // Tree size inferior to 200KB.
    expect(JSON.stringify(pkg).length).toBeLessThan(200000);
  });
});

describe('project with alias', () => {
  it('uses the real version and not the alias', async () => {
    const projFolder = './test/fixtures/proj_with_aliases';
    const {package: pkg} = await plugin.inspect(projFolder, './composer.lock', systemVersionsOptions);
    const deps = pkg.dependencies;
    const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf8'));
    const {version} = deps['symfony/monolog-bridge'];
    // remove the trailing .0
    const actualVersionInstalled = version.slice(0, -2);
    const expectedVersionString = composerJson.require && composerJson.require['symfony/monolog-bridge']; // '2.6 as 2.7'
    // real = 2.6, alias = 2.7
    const [realVersion, aliasVersion] = expectedVersionString.split(' as ');

    expect(actualVersionInstalled).toEqual(realVersion);
    expect(actualVersionInstalled).not.toEqual(aliasVersion);
  });
});

describe('project with alias in external repo', () => {
  it('uses the real version and not the alias', async () => {
    const projFolder = './test/fixtures/proj_with_aliases_external_github';
    const {package: pkg} = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);
    const composerJson = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer.json'), 'utf8'));
    const composerJsonAlias = composerJson.require['symfony/monolog-bridge'];
    const aliasBranch = composerJsonAlias.split(' as ').shift().replace('dev-', '');

    // to be really sure, we take a look at repo@`url` and check for branch
    const apiBranchesUrl = composerJson.repositories[0].url.replace(
      'https://github.com/', 'https://api.github.com/repos/') + '/branches';
    let branchesData;

    // sometimes we hit the github api limit, so we use a mock
    try {
      const res = await fetch(apiBranchesUrl, {
        headers: {
          'user-agent': 'CI Testing',
        },
      });

      branchesData = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      branchesData = [{name: 'my-bugfix'}];
    }

    const ourAliasBranchObj = branchesData.find(({name}) => name === aliasBranch);
    const ourAliasBranchName = ourAliasBranchObj && ourAliasBranchObj.name;

    // In composer.json, its version looks like this: "dev-my-bugfix as 2.7"
    expect(composerJsonAlias.split(' as ')).toHaveLength(2);
    expect(composerJsonAlias.split('-').shift()).toEqual('dev');
    expect(composerJson.version).toBeUndefined();
    // todo: should be able to detect this on any repo

    expect(composerJson.repositories[0].type).toEqual('vcs');
    expect(composerJson.repositories[0].url).toEqual('https://github.com/aryehbeitz/monolog-bridge');

    // The alias is a branch.
    expect(aliasBranch).toEqual(ourAliasBranchName);

    // Make sure we got it right in the plugin parsing.
    const deps = pkg.dependencies;
    const {version} = deps['symfony/monolog-bridge'];
    // do we want our found version to contain a dev- prefix or not?
    // guessing not, we should add functionality so this test passes
    expect(version).toEqual(aliasBranch);
  });
});

describe('versions inaccuracy when composer is not installed', () => {
  it('matches expected packages', async () => {
    const projFolder = './test/fixtures/vulnerable_project';
    // when we pass values, it takes them. if we don't pass them, it checks
    const options = {
      composerIsFine: false,
      composerPharIsFine: false,
      systemVersions: {},
    };

    const result = await plugin.inspect(projFolder, 'composer.lock', options);

    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps_no_system_versions.json'),
      'utf8'));
    expect(result).toEqual(expectedTree);
  });
});

describe('project name is not empty', () => {
  it('uses directory name when composer project name is missing', async () => {
    const projFolder = './test/fixtures/no_project_name';

    const {package: pkg} = await plugin.inspect(projFolder, 'composer.lock', systemVersionsOptions);

    expect(pkg.name).toEqual('no_project_name');
  });
});

describe('project with deprecations when running composer', () => {
  it('integrates platform dependencies from composer', async () => {
    const projFolder = './test/fixtures/project_with_composer_deprecations';
    const options = {
      composerIsFine: false,
      // Use the fake composer.phar file at the root of snyk-php-plugin to output system dependencies.
      composerPharIsFine: true,
      systemVersions: {},
    };

    const result = await plugin.inspect(projFolder, 'composer.lock', options);

    const expectedTree = JSON.parse(fs.readFileSync(path.resolve(projFolder, 'composer_deps.json'), 'utf8'));
    expect(result).toEqual(expectedTree);
  });
});
