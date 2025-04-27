import * as path from 'path';
import * as childProcess from 'child_process';

export const composerCmd = {command: 'composer', args: []};
export const composerPharCmd = {command: 'php', args: [`${path.resolve(path.resolve() + '/composer.phar')}`]};

export const versionArgs = {args: ['--version']};
export const showArgs = {args: ['show', '-p', '--format=json']};

function cleanUpComposerWarnings(composerOutput: string): string {
  // Remove all lines preceding the JSON data; including "Deprecated" messages and blank lines.
  const lines = composerOutput.split('\n');
  const jsonStartIndex = lines.findIndex((line) => line.startsWith('{'));

  return lines.slice(jsonStartIndex).join('\n');
}

export function cmdReturnsOk(cmd: string, args: string[] = []): boolean {
  const spawnOptions: childProcess.SpawnOptions = {shell: false};
  return !!cmd && childProcess.spawnSync(cmd, args, spawnOptions).status === 0;
}

// run a cmd in a specific folder and it's result should be there
export function execWithResult(cmd: string, basePath: string, args: string[] = []): string {
  const spawnOptions: childProcess.SpawnOptions = {cwd: basePath, shell: false}
  const execResult = childProcess.spawnSync(cmd, args, spawnOptions);

  // Throw the whole Result object in case of error, similarly to `execSync`.
  if (execResult.status !== 0) {
    throw execResult;
  }

  return cleanUpComposerWarnings(execResult.stdout.toString());
}
