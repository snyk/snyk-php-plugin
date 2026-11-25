import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as path from 'path';

import { cmdReturnsOk, execWithResult } from '../lib/composer-cmds';

const PRINT_ENV = path.join(__dirname, 'fixtures', 'print-env.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SNYK_KEYS = ['SNYK_TOKEN', 'snyk_config_token'];

describe('child process environment', () => {
  // Set in place: spawn reads the real environment, not a replaced process.env object.
  beforeEach(() => {
    for (const key of SNYK_KEYS) {
      process.env[key] = 'test-token';
    }
  });

  afterEach(() => {
    for (const key of SNYK_KEYS) {
      delete process.env[key];
    }
  });

  it('the child gets no SNYK_* variables', () => {
    const child = JSON.parse(
      execWithResult({ command: 'node', args: [PRINT_ENV] }, FIXTURES_DIR),
    );

    expect(child.snykKeys).toEqual([]);
  });

  it('cmdReturnsOk is true when the child gets no SNYK_* variables', () => {
    expect(
      cmdReturnsOk({
        command: 'node',
        args: [PRINT_ENV, '--fail-if-snyk-env'],
      }),
    ).toBe(true);
  });
});
