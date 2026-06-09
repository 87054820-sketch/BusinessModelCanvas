import { Builtins, Cli } from 'clipanion';
import { CLI_VERSION } from './lib/version.js';
import { DoctorCommand } from './commands/doctor.js';
import {
  ProjectCreateCommand,
  ProjectDeleteCommand,
  ProjectGetCommand,
  ProjectListCommand,
  ProjectUpdateCommand,
} from './commands/project.js';
import {
  CanvasCreateCommand,
  CanvasDeleteCommand,
  CanvasDescribeCommand,
  CanvasDescribeTemplateCommand,
  CanvasGetCommand,
  CanvasListCommand,
  CanvasReadCommand,
  CanvasUpdateCommand,
} from './commands/canvas.js';
import { CanvasWriteCommand } from './commands/canvasWrite.js';
import {
  SnapshotCreateCommand,
  SnapshotDeleteCommand,
  SnapshotListCommand,
  SnapshotRestoreCommand,
} from './commands/snapshot.js';
import {
  StoryCreateCommand,
  StoryDeleteCommand,
  StoryGetCommand,
  StoryListCommand,
  StoryUpdateCommand,
} from './commands/story.js';
import { SkillBuildCommand, SkillInstallCommand } from './commands/skill.js';
import { TemplateGetCommand, TemplateListCommand } from './commands/template.js';

const [, , ...args] = process.argv;

const cli = new Cli({
  binaryLabel: 'PinGarden CLI',
  binaryName: 'pingarden',
  binaryVersion: CLI_VERSION,
  enableCapture: false,
});

// Built-ins: --help, --version, definitions
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

// Diagnostics
cli.register(DoctorCommand);

// Projects
cli.register(ProjectListCommand);
cli.register(ProjectGetCommand);
cli.register(ProjectCreateCommand);
cli.register(ProjectUpdateCommand);
cli.register(ProjectDeleteCommand);

// Canvases
cli.register(CanvasListCommand);
cli.register(CanvasGetCommand);
cli.register(CanvasCreateCommand);
cli.register(CanvasUpdateCommand);
cli.register(CanvasDeleteCommand);
cli.register(CanvasDescribeCommand);
cli.register(CanvasDescribeTemplateCommand);
cli.register(CanvasReadCommand);
cli.register(CanvasWriteCommand);

// Snapshots
cli.register(SnapshotListCommand);
cli.register(SnapshotCreateCommand);
cli.register(SnapshotRestoreCommand);
cli.register(SnapshotDeleteCommand);

// Stories
cli.register(StoryListCommand);
cli.register(StoryGetCommand);
cli.register(StoryCreateCommand);
cli.register(StoryUpdateCommand);
cli.register(StoryDeleteCommand);

// Templates (canvas-defs)
cli.register(TemplateListCommand);
cli.register(TemplateGetCommand);

// Skill
cli.register(SkillBuildCommand);
cli.register(SkillInstallCommand);

cli
  .runExit(args)
  .catch((err: unknown) => {
    process.stderr.write(`unexpected: ${(err as Error).message ?? err}\n`);
    process.exit(1);
  });
