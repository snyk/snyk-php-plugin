import * as path from 'path';
import * as childProcess from 'child_process';

type Command = {
  command: string;
  args: string[];
};

function versionCmd(this: Command): Command {
  return {
    command: this.command,
    args: [...this.args, '--version'],
  };
}

function listPlatformDepsCmd(this: Command): Command {
  return {
    command: this.command,
    args: [...this.args, 'show', '-p', '--format=json'],
  };
}

export const globalComposer = {
  command: 'composer',
  args: [],
  version: versionCmd,
  listPlatformDeps: listPlatformDepsCmd,
};
export const localComposer = {
  command: 'php',
  args: [`${path.resolve(path.resolve() + '/composer.phar')}`],
  version: versionCmd,
  listPlatformDeps: listPlatformDepsCmd,
};

function cleanUpComposerWarnings(composerOutput: string): string {
  // Remove all lines preceding the JSON data; including "Deprecated" messages and blank lines.
  const lines = composerOutput.split('\n');
  const jsonStartIndex = lines.findIndex((line) => line.startsWith('{'));

  return lines.slice(jsonStartIndex).join('\n');
}

export function cmdReturnsOk(cmd: Command): boolean {
  const spawnOptions: childProcess.SpawnOptions = { shell: false };
  return (
    !!cmd &&
    childProcess.spawnSync(cmd.command, cmd.args, spawnOptions).status === 0
  );
}

// run a cmd in a specific folder and it's result should be there
export function execWithResult(cmd: Command, basePath: string): string {
  const spawnOptions: childProcess.SpawnOptions = {
    cwd: basePath,
    shell: false,
  };
  const execResult = childProcess.spawnSync(
    cmd.command,
    cmd.args,
    spawnOptions,
  );

  // Throw the whole Result object in case of error, similarly to `execSync`.
  if (execResult.status !== 0) {
    throw execResult;
  }

  return cleanUpComposerWarnings(execResult.stdout.toString());
}
