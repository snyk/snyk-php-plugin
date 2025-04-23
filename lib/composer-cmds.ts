import * as path from 'path';
import * as childProcess from 'child_process';

export const composerVersionCmd = {command: 'composer', args: ['--version']};
export const composerShowCmd = {command: 'composer', args: ['show', '-p']};
export const pharVersionCmd = {
  command: `php`,
  args: [`${path.resolve(path.resolve() + '/composer.phar')}`, '--version']
};
export const pharShowCmd = {
  command: `php`, args: [`${path.resolve(path.resolve() + '/composer.phar')}`, 'show', '-p', '--format=json']
};

export function cmdReturnsOk(cmd, args: string[] = []): boolean {
  const spawnOptions: childProcess.SpawnOptions = { shell: false };
  return cmd && childProcess.spawnSync(cmd, args, spawnOptions).status === 0;
}

// run a cmd in a specific folder and it's result should be there
export function execWithResult(cmd, basePath, args: string[] = []): string {
  const spawnOptions: childProcess.SpawnOptions = { cwd: basePath, shell: false }
  const execResult = childProcess.spawnSync(cmd, args, spawnOptions);
  if (execResult.status !== 0) {
    throw execResult;
  }
  return execResult.stdout.toString();
}
