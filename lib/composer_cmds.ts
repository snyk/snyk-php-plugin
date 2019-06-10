import * as path from 'path';
import * as childProcess from 'child_process';

export const composerCmd = 'composer --version';
export const composerShowCmd = 'composer show -p';
export const pharCmd = `php ${path.resolve(path.resolve() + '/composer.phar')} show -p --format=json`;

export function cmdReturnsOk(cmd) {
  return cmd && childProcess.spawnSync(cmd, { shell: true }).status === 0;
}

// run a cmd in a specific folder and it's result should be there
export function execWithResult(cmd, basePath) {
  return childProcess.execSync(cmd, {cwd: basePath}).toString();
}
