import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as childProcess from 'child_process';
import * as path from 'path';

import { cmdReturnsOk, execWithResult } from '../lib/composer-cmds';

const PRINT_ENV = path.join(__dirname, 'fixtures', 'print-env.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const TEST_ENV: Record<string, string> = {
  SNYK_TOKEN: 'test-token',
  SNYK_OAUTH_TOKEN: 'test-oauth-token',
  snyk_cfg_api: 'test-cfg-api',
  HTTP_PROXY: 'http://internal:1',
  SNYK_SYSTEM_HTTP_PROXY: 'http://corp:3128',
  UNRELATED_VAR: 'keep',
};

type ChildEnv = {
  keys: string[];
  HTTP_PROXY?: string;
  http_proxy?: string;
  UNRELATED_VAR?: string;
};

const isSnykKey = (key: string) => /^snyk_/i.test(key);
const hasPath = (keys: string[]) =>
  keys.some((key) => key.toUpperCase() === 'PATH');

const runPrintEnv = (): ChildEnv =>
  JSON.parse(
    execWithResult(
      { command: process.execPath, args: [PRINT_ENV] },
      FIXTURES_DIR,
    ),
  );

describe('execWithResult child environment', () => {
  let saved: Map<string, string | undefined>;

  beforeEach(() => {
    saved = new Map(
      Object.keys(TEST_ENV).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, TEST_ENV);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('passes spawnSync an env without SNYK_* variables and with the user proxy', () => {
    const spy = jest.spyOn(childProcess, 'spawnSync');

    runPrintEnv();

    const env = (spy.mock.calls[0][2] as childProcess.SpawnSyncOptions).env;
    expect(env).toBeDefined();
    expect(Object.keys(env!).filter(isSnykKey)).toEqual([]);
    expect(env!.HTTP_PROXY).toBe('http://corp:3128');
    expect(env!.http_proxy).toBe('http://corp:3128');
    expect(env!.UNRELATED_VAR).toBe('keep');
    expect(hasPath(Object.keys(env!))).toBe(true);
  });

  it('the child process sees no SNYK_* variables and gets the user proxy', () => {
    const child: ChildEnv = runPrintEnv();

    expect(child.keys.filter(isSnykKey)).toEqual([]);
    expect(child.HTTP_PROXY).toBe('http://corp:3128');
    expect(child.http_proxy).toBe('http://corp:3128');
    expect(child.UNRELATED_VAR).toBe('keep');
    expect(hasPath(child.keys)).toBe(true);
  });

  it('does not modify process.env', () => {
    runPrintEnv();

    expect(process.env.SNYK_TOKEN).toBe('test-token');
    expect(process.env.HTTP_PROXY).toBe('http://internal:1');
  });
});

describe('cmdReturnsOk child environment', () => {
  let saved: Map<string, string | undefined>;

  beforeEach(() => {
    saved = new Map(
      Object.keys(TEST_ENV).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, TEST_ENV);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('passes spawnSync an env without SNYK_* variables and with the user proxy', () => {
    const spy = jest.spyOn(childProcess, 'spawnSync');

    cmdReturnsOk({ command: process.execPath, args: [PRINT_ENV] });

    const env = (spy.mock.calls[0][2] as childProcess.SpawnSyncOptions).env;
    expect(env).toBeDefined();
    expect(Object.keys(env!).filter(isSnykKey)).toEqual([]);
    expect(env!.HTTP_PROXY).toBe('http://corp:3128');
    expect(env!.http_proxy).toBe('http://corp:3128');
  });

  it('returns true when the child process sees no SNYK_* variables', () => {
    expect(
      cmdReturnsOk({
        command: process.execPath,
        args: [PRINT_ENV, '--fail-if-snyk-env'],
      }),
    ).toBe(true);
  });
});
