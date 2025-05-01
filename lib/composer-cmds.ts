import * as path from 'path';
import * as childProcess from 'child_process';

class Command {
  protected constructor(
    readonly command: string,
    readonly args: string[],
  ) {}

  protected withAdditionalArgs(args: string[]): Command {
    return new Command(this.command, [...this.args, ...args]);
  }
}

export class Composer extends Command {
  public static global(): Composer {
    return new Composer('composer', []);
  }

  public static local(): Composer {
    return new Composer('php', [
      `${path.resolve(path.resolve() + '/composer.phar')}`,
    ]);
  }

  version(): Command {
    return this.withAdditionalArgs(['--version']);
  }

  listPlatformDeps(): Command {
    return this.withAdditionalArgs(['show', '-p', '--format=json']);
  }
}

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
