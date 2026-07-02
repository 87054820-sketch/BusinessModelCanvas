#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const canonical = join(root, '.agents', 'skills', 'pingarden');
const claudeAlias = join(root, '.claude', 'skills', 'pingarden');

function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out.sort();
}

if (!existsSync(join(canonical, 'SKILL.md'))) {
  process.stderr.write('Skill alias check failed: missing .agents/skills/pingarden/SKILL.md.\n');
  process.exit(1);
}

if (!existsSync(claudeAlias) || !lstatSync(claudeAlias).isSymbolicLink()) {
  process.stderr.write('Skill alias check failed: .claude/skills/pingarden must be a symlink to .agents/skills/pingarden.\n');
  process.exit(1);
}

if (realpathSync(claudeAlias) !== realpathSync(canonical)) {
  process.stderr.write('Skill alias check failed: .claude/skills/pingarden points somewhere other than .agents/skills/pingarden.\n');
  process.exit(1);
}

const files = walk(canonical);
const version = readFileSync(join(canonical, '.pingarden-skill-version'), 'utf8').trim();
const size = files.reduce((sum, file) => sum + statSync(join(canonical, file)).size, 0);
process.stdout.write(`✓ skill alias ok (${files.length} files, ${size} bytes, version ${version})\n`);
