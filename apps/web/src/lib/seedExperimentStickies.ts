import type {
  BusinessModelExperimentDetail,
  Experiment,
  Lang,
} from '@pingarden/shared';

/**
 * Shape of a single sticky entry accepted by `POST
 * /canvases/:id/stickies/bulk` (web client wrapper at
 * `apps/web/src/api/client.ts:bulkStickies`). Plain text or HTML
 * fragment per the server's round-trip contract.
 */
export interface SeedStickyPayload {
  zoneId: string;
  text: string;
  color?: string;
}

/**
 * Build the bulk-stickies payload that seeds a freshly created
 * experiment-canvas with the experiment's scaffold template.
 *
 * Two callers consume this:
 *   1. `NewProjectPage` — when the user clicks "Create new project"
 *      from the library picker, lands on /p/new with `seedExperiment`
 *      query param, types a name, hits Create. After project + canvas
 *      creation, this builds the seed.
 *   2. `LibraryPage` — when the user clicks "Add to existing project"
 *      in the picker. The flow creates the canvas in the chosen
 *      project then immediately seeds it with the same payload.
 *
 * Both paths produce identical canvas content from the same template.
 * If a future experiment ships without a template (V1 has all 12
 * authored), the function falls back to a single setup-zone sticky
 * matching Round 11's shape.
 */
export function buildSeedPayload(
  detail: BusinessModelExperimentDetail,
  lang: Lang,
): SeedStickyPayload[] {
  const exp = detail.experiment;
  if (exp.template && exp.template.stickies.length > 0) {
    return exp.template.stickies.map((s) => ({
      zoneId: s.zoneId,
      text: s.text[lang] ?? s.text.en,
      ...(s.color ? { color: s.color } : {}),
    }));
  }
  // Fallback for templateless experiments — same shape as Round 11.
  // Localised name + summary in the setup zone, every other zone
  // empty.
  const expName = exp.name[lang] ?? exp.name.en;
  const expSummary = exp.summary[lang] ?? exp.summary.en;
  return [
    {
      zoneId: 'experiment-setup',
      text: `<p><strong>Method: ${expName}</strong></p><p>${expSummary}</p>`,
    },
  ];
}

/**
 * Helper used by callers that have only the lightweight `Experiment`
 * (not the full `BusinessModelExperimentDetail`). Convenience for places
 * where you've already fetched the detail and want to pass the inner
 * `Experiment` directly. Same return shape, same fallback.
 */
export function buildSeedPayloadFromExperiment(
  experiment: Experiment,
  lang: Lang,
): SeedStickyPayload[] {
  return buildSeedPayload({ experiment, description: { en: '', zh: '' } }, lang);
}
