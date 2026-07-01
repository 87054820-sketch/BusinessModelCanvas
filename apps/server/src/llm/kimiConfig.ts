import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Read / write the Kimi Code CLI configuration at `~/.kimi-code/config.toml`.
 *
 * The schema is documented at
 * https://moonshotai.github.io/kimi-code/en/configuration/config-files
 * — we only need a tiny subset: one provider entry (`managed:kimi-code`)
 * and one model alias (`kimi-code/kimi-for-coding`). The API key lives
 * inline in the TOML file at mode 0600 — this matches Kimi CLI's own
 * default permissions, and we accept it because the CLI itself requires
 * a plaintext key at read time. The PinGarden source-of-truth for the
 * key is the encrypted localStorage blob; this file is a derived
 * rendering that we own and can rewrite/erase at any time.
 *
 * Why we don't merge with an existing user-authored config: in the
 * bundle-Kimi-CLI flow the user never runs `kimi login` themselves, so
 * any pre-existing config came from another install path and we treat
 * it as ours to manage. If the user later runs `kimi login` manually
 * we'd overwrite their login on the next chat — but that's the same
 * trade-off as `kimi login` itself overwriting any prior config.
 */

const KIMI_CODE_DIR = join(homedir(), '.kimi-code');
const CONFIG_PATH = join(KIMI_CODE_DIR, 'config.toml');
const PIN_GARDEN_MARKER = '# Managed by PinGarden Library Copilot';

const EMPTY_STUB = `# ~/.kimi-code/config.toml
# Runtime settings for Kimi Code.
# This file starts empty so built-in defaults can apply.
# Login will populate managed Kimi provider and model entries.
`;

export async function writeConfig(apiKey: string): Promise<void> {
  await fs.mkdir(KIMI_CODE_DIR, { recursive: true });
  const toml = renderToml(apiKey);
  await fs.writeFile(CONFIG_PATH, toml, { encoding: 'utf8', mode: 0o600 });
}

export async function writeConfigToHome(homeDir: string, apiKey: string): Promise<void> {
  const configDir = join(homeDir, '.kimi-code');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(join(configDir, 'config.toml'), renderToml(apiKey), { encoding: 'utf8', mode: 0o600 });
}

export async function clearConfig(): Promise<void> {
  try {
    const existing = await fs.readFile(CONFIG_PATH, 'utf8');
    if (!existing.startsWith(PIN_GARDEN_MARKER)) return;
    await fs.writeFile(CONFIG_PATH, EMPTY_STUB, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
}

function renderToml(apiKey: string): string {
  const escapedKey = apiKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `${PIN_GARDEN_MARKER} — do not edit by hand.
# This file is regenerated whenever the user updates their key in the
# Copilot settings. Source-of-truth lives in the PinGarden encrypted
# blob; this is a derived rendering.

default_model = "kimi-code/kimi-for-coding"
default_permission_mode = "manual"

[providers."managed:kimi-code"]
type = "kimi"
base_url = "https://api.kimi.com/coding/v1"
api_key = "${escapedKey}"

[models."kimi-code/kimi-for-coding"]
provider = "managed:kimi-code"
model = "kimi-for-coding"
max_context_size = 262144
`;
}
