#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, '.agents', 'skills', 'pingarden');
const versionPath = join(sourceDir, '.pingarden-skill-version');
const outDir = join(root, 'apps', 'cli', 'build', 'skill');
const stageDir = join(root, 'apps', 'cli', 'build', 'skill-staging');

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function removeJunkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.name === '.DS_Store') {
      rmSync(fullPath, { force: true });
      continue;
    }
    if (entry.isDirectory()) removeJunkFiles(fullPath);
  }
}

if (!existsSync(join(sourceDir, 'SKILL.md'))) {
  fail('Missing .agents/skills/pingarden/SKILL.md. Run `pnpm --filter @pingarden/cli build && node apps/cli/dist/index.js skill install --local` first.');
}
if (!existsSync(versionPath)) {
  fail('Missing .agents/skills/pingarden/.pingarden-skill-version. Regenerate the project-local skill first.');
}

const version = readFileSync(versionPath, 'utf8').trim();
if (!version) fail('Skill version sentinel is empty.');

const zipName = `pingarden-skill-${version}.zip`;
const zipPath = join(outDir, zipName);

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(join(stageDir, 'pingarden'), { recursive: true });
mkdirSync(outDir, { recursive: true });
cpSync(sourceDir, join(stageDir, 'pingarden'), { recursive: true });
removeJunkFiles(stageDir);

for (const filename of readdirSync(outDir)) {
  if (/^pingarden-skill-.+\.zip$/.test(filename)) {
    rmSync(join(outDir, filename), { force: true });
  }
}

writeFileSync(
  join(stageDir, 'INSTALL.md'),
  `# PinGarden AI Strategy Skill Pack — install\n\nThis zip contains the official PinGarden strategy-learning skill for AI agents. It teaches the agent how to reason with Business Model Canvas, Value Proposition Canvas, JTBD, Empathy Map, Customer Journey, Strategy Canvas, experiments, patterns, and strategy frameworks.\n\nThe skill has two modes:\n\n1. **Learning / advisor mode** — works without the PinGarden app or CLI. The agent can explain frameworks, coach canvas thinking, review assumptions, compare cases, and suggest experiments.\n2. **Connected app mode** — when the PinGarden Mac app and \`pingarden\` CLI are installed, the agent can also read and write local PinGarden projects, canvases, snapshots, and case-library forks.\n\nThe \`pingarden/\` folder is plain markdown — no executable code, no runtime, no credentials.\nVersion: see \`pingarden/.pingarden-skill-version\` (content-addressed SHA-256 over the source canvas and library bundles; identical inputs produce identical zip contents).\n\n## Claude Code\n\n\`\`\`bash\nunzip -o pingarden-skill-*.zip -d ~/.claude/skills/\n# → ~/.claude/skills/pingarden/SKILL.md\n\`\`\`\n\nAuto-loads on the next Claude Code session. Trigger phrases include \"draft a BMC\", \"fill the value proposition\", \"how should I test this assumption\", \"what pattern is this\", or any \`pingarden ...\` invocation.\n\n## Code Cursor\n\n\`\`\`bash\nunzip -o pingarden-skill-*.zip -d <repo>/.cursor/skills/\necho 'See .cursor/skills/pingarden/SKILL.md for strategy-canvas guidance and optional PinGarden CLI workflows.' \\\n  >> <repo>/.cursorrules\n\`\`\`\n\n## Codex\n\n\`\`\`bash\nunzip -o pingarden-skill-*.zip -d ~/.codex/skills/\n# If your Codex setup uses a repo-level instructions file, reference\n# ~/.codex/skills/pingarden/SKILL.md from there.\n\`\`\`\n\n## CodeBuddy / WorkBuddy\n\nUse the official skill installation path for your CodeBuddy or WorkBuddy client, then place the extracted \`pingarden/\` folder there.\n\n## Other AI agents\n\nIf your tool is not listed above, unzip anywhere on disk and point that agent's rules / memory / instructions file at the absolute path of \`pingarden/SKILL.md\`.\n\n## Generic LLM without a rules system\n\nConcatenate the markdown into the system prompt or project instructions:\n\n\`\`\`bash\nunzip -o pingarden-skill-*.zip -d /tmp\ncat /tmp/pingarden/SKILL.md /tmp/pingarden/canvases/*.md /tmp/pingarden/workflows/*.md \\\n  > /tmp/pingarden-context.md\n\`\`\`\n\n## Optional: connect to the PinGarden app\n\nFor learning/advisor use, nothing else is required.\n\nFor app-connected workflows, install and launch the PinGarden Mac app, then run:\n\n\`\`\`bash\npingarden doctor\n\`\`\`\n\nIf \`pingarden\` is missing, launch PinGarden once and use **Help → Install CLI to PATH**. Without the CLI and a running PinGarden server, the agent should stay in learning/advisor mode and must not claim it can write into the app.\n`,
  'utf8',
);

try {
  execFileSync('zip', ['-r', '-X', '--quiet', zipPath, 'pingarden', 'INSTALL.md'], {
    cwd: stageDir,
    stdio: 'inherit',
  });
} catch {
  fail('Could not create skill zip. Ensure the `zip` command is available.');
} finally {
  rmSync(stageDir, { recursive: true, force: true });
}

const sizeBytes = statSync(zipPath).size;
console.log(`✓ Skill pack ready: ${zipPath} (${sizeBytes} bytes, version ${version})`);
