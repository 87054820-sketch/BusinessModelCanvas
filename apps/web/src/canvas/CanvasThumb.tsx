/**
 * Tiny thumbnail icon for a canvas type. Used in:
 *   – AddCanvasMenu (template picker)
 *   – ProjectSidebar (per-row indicator next to canvas title)
 *
 * Each branch matches the actual visual signature of the live canvas
 * background, so the icon at-a-glance answers "which template is this?"
 * Falls back to a plain rectangle for canvas IDs we haven't drawn a
 * thumbnail for yet.
 */
interface Props {
  id: string;
  /** Render size in CSS pixels. Defaults to 28×20. */
  width?: number;
  height?: number;
}

export function CanvasThumb({ id, width = 40, height = 28 }: Props) {
  const sizeProps = { width, height, preserveAspectRatio: 'xMidYMid meet' as const };

  if (id === 'business-model-canvas') {
    return (
      <svg viewBox="0 0 60 42" {...sizeProps}>
        <rect x="0.5" y="0.5" width="59" height="41" fill="#FAFAF7" stroke="#1F2937" strokeWidth="0.6" />
        <g fill="none" stroke="#9CA3AF" strokeWidth="0.5">
          <line x1="12" y1="0" x2="12" y2="29" />
          <line x1="24" y1="0" x2="24" y2="29" />
          <line x1="36" y1="0" x2="36" y2="29" />
          <line x1="48" y1="0" x2="48" y2="29" />
          <line x1="0" y1="29" x2="60" y2="29" />
          <line x1="30" y1="29" x2="30" y2="42" />
          <line x1="12" y1="14.5" x2="24" y2="14.5" />
          <line x1="36" y1="14.5" x2="48" y2="14.5" />
        </g>
      </svg>
    );
  }
  if (id === 'value-proposition-canvas') {
    // Square (3 wedges via >—< from centre) + circle (3 wedges) with arrows in the gap.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3" y="5" width="24" height="30" />
          <line x1="15" y1="20" x2="3"  y2="5" />
          <line x1="15" y1="20" x2="3"  y2="35" />
          <line x1="15" y1="20" x2="27" y2="20" />
          <circle cx="46" cy="20" r="11" />
          <line x1="46" y1="20" x2="35" y2="20" />
          <line x1="46" y1="20" x2="55.5" y2="14.5" />
          <line x1="46" y1="20" x2="55.5" y2="25.5" />
        </g>
        <g fill="#1F2937" stroke="none">
          <polygon points="29,18.5 29,21.5 31,20" />
          <polygon points="34,18.5 34,21.5 32,20" />
        </g>
      </svg>
    );
  }
  if (id === 'portfolio-map') {
    // Diagonal halves: Explore (lower-left) + Exploit (upper-right) with Transfer arrow.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3" y="20" width="26" height="17" />
          <rect x="31" y="3" width="26" height="17" />
          <line x1="16" y1="20" x2="16" y2="37" strokeDasharray="1 1" stroke="#9CA3AF" />
          <line x1="3"  y1="28.5" x2="29" y2="28.5" strokeDasharray="1 1" stroke="#9CA3AF" />
          <line x1="44" y1="3"  x2="44" y2="20" strokeDasharray="1 1" stroke="#9CA3AF" />
          <line x1="31" y1="11.5" x2="57" y2="11.5" strokeDasharray="1 1" stroke="#9CA3AF" />
        </g>
        <g stroke="#1F2937" strokeWidth="0.7" fill="none">
          <line x1="27" y1="22" x2="33" y2="18" />
        </g>
      </svg>
    );
  }
  if (id === 'three-horizons-map') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3" y="5" width="16" height="18" rx="1" />
          <rect x="22" y="5" width="16" height="18" rx="1" />
          <rect x="41" y="5" width="16" height="18" rx="1" />
          <rect x="3" y="27" width="26" height="9" rx="1" />
          <rect x="31" y="27" width="26" height="9" rx="1" />
        </g>
        <g stroke="#4A7FC1" strokeWidth="0.8" fill="none" strokeLinecap="round">
          <path d="M7 20 C12 15 16 10 19 6" opacity="0.45" />
          <path d="M26 20 C31 15 35 10 38 6" opacity="0.55" />
          <path d="M45 20 C50 15 54 10 57 6" opacity="0.65" />
        </g>
      </svg>
    );
  }
  if (id === 'bcg-growth-share-matrix') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="4" y="4" width="24" height="12" />
          <rect x="32" y="4" width="24" height="12" />
          <rect x="4" y="19" width="24" height="12" />
          <rect x="32" y="19" width="24" height="12" />
          <rect x="4" y="34" width="52" height="3" />
        </g>
        <g stroke="#9CA3AF" strokeWidth="0.4" strokeDasharray="1 1">
          <line x1="30" y1="4" x2="30" y2="31" />
          <line x1="4" y1="17.5" x2="56" y2="17.5" />
        </g>
        <g fill="#4A7FC1" stroke="none">
          <circle cx="44" cy="10" r="1.1" />
          <circle cx="44" cy="25" r="1.1" />
        </g>
      </svg>
    );
  }
  if (id === 'ad-lib-value-proposition') {
    // Vertical fill-in-the-blank lines, the visual signature of an ad-lib template.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <rect x="0" y="0" width="14" height="40" fill="#E5E7EB" />
        <g stroke="#1F2937" strokeWidth="0.6" fill="none">
          <line x1="20" y1="9"  x2="56" y2="9" />
          <line x1="20" y1="17" x2="56" y2="17" />
          <line x1="20" y1="25" x2="56" y2="25" />
          <line x1="20" y1="33" x2="36" y2="33" />
          <line x1="40" y1="33" x2="56" y2="33" />
        </g>
      </svg>
    );
  }
  if (id === 'blue-ocean-strategy-canvas') {
    // 0–5 grid + two contrasting value curves (one zigzaggy "industry"
    // curve, one focused "blue ocean" curve) + a couple of pin glyphs.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        {/* gridlines */}
        <g stroke="#E5E7EB" strokeWidth="0.4" fill="none">
          <line x1="6" y1="6"  x2="56" y2="6" />
          <line x1="6" y1="14" x2="56" y2="14" />
          <line x1="6" y1="22" x2="56" y2="22" />
          <line x1="6" y1="30" x2="56" y2="30" />
          <line x1="6" y1="36" x2="56" y2="36" />
        </g>
        {/* industry curve (red, busy / sawtooth) */}
        <polyline
          points="10,16 18,20 26,12 34,22 42,16 50,20"
          fill="none"
          stroke="#D62728"
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* blue ocean curve (blue, focused / clean shape) */}
        <polyline
          points="10,30 18,28 26,8 34,8 42,30 50,32"
          fill="none"
          stroke="#1F77B4"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* pin (star) on a blue-ocean point */}
        <polygon
          points="26,4 27.2,6.6 30,6.6 27.7,8.3 28.6,11 26,9.4 23.4,11 24.3,8.3 22,6.6 24.8,6.6"
          fill="#FF7F0E"
          stroke="#FFFFFF"
          strokeWidth="0.4"
        />
      </svg>
    );
  }
  if (id === 'jobs-to-be-done') {
    // JTBD Story format: three columns at top (When / I want to / So
    // I can) and a wide bottom row for emotional + social companion
    // jobs. The three coloured pips on the right of the header echo
    // the on-canvas Functional / Emotional / Social legend.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          {/* three top columns */}
          <rect x="3"  y="6" width="17" height="20" />
          <rect x="22" y="6" width="17" height="20" />
          <rect x="41" y="6" width="16" height="20" />
          {/* wide bottom row */}
          <rect x="3"  y="29" width="54" height="8" />
        </g>
        {/* tiny F/E/S pips top-right of header — sticky-color hint */}
        <g stroke="none">
          <circle cx="48" cy="3" r="1.1" fill="#FCD34D" />
          <circle cx="52" cy="3" r="1.1" fill="#F9A8D4" />
          <circle cx="56" cy="3" r="1.1" fill="#93C5FD" />
        </g>
      </svg>
    );
  }
  if (id === 'business-model-environment') {
    // Compass: top + bottom strips, left + right squares, BMC mini-grid
    // sitting at the centre — visual signature of the four-around-centre
    // environment map.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3"  y="3"  width="54" height="8" />
          <rect x="3"  y="29" width="54" height="8" />
          <rect x="3"  y="13" width="14" height="14" />
          <rect x="43" y="13" width="14" height="14" />
        </g>
        <g fill="none" stroke="#1F2937" strokeWidth="0.5">
          <rect x="20" y="14" width="20" height="12" />
          <line x1="24" y1="14" x2="24" y2="26" />
          <line x1="30" y1="14" x2="30" y2="26" />
          <line x1="36" y1="14" x2="36" y2="26" />
          <line x1="20" y1="22" x2="40" y2="22" />
        </g>
      </svg>
    );
  }
  if (id === 'customer-journey') {
    // Three horizontal rows + four dashed verticals splitting them into
    // five timeline stages — visual signature of a journey map (DABB
    // convention: Customer Needs / Key Moment / Customer Satisfaction).
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          {/* persona band */}
          <rect x="3" y="3" width="54" height="4" />
          {/* three rows */}
          <rect x="11" y="9"  width="46" height="9" />
          <rect x="11" y="20" width="46" height="9" />
          <rect x="11" y="31" width="46" height="6" />
        </g>
        {/* dashed stage dividers */}
        <g stroke="#9CA3AF" strokeWidth="0.4" strokeDasharray="1 1">
          <line x1="20.2" y1="9" x2="20.2" y2="37" />
          <line x1="29.4" y1="9" x2="29.4" y2="37" />
          <line x1="38.6" y1="9" x2="38.6" y2="37" />
          <line x1="47.8" y1="9" x2="47.8" y2="37" />
        </g>
        {/* tiny smiley/neutral/sad legend in left margin of bottom row */}
        <g fill="#1F2937" stroke="none">
          <circle cx="6" cy="32"   r="0.9" />
          <circle cx="6" cy="34"   r="0.9" />
          <circle cx="6" cy="36"   r="0.9" />
        </g>
      </svg>
    );
  }
  if (id === 'design-criteria-canvas') {
    // Four horizontal MoSCoW-style bands: Must / Should / Could / Won't.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="4" y="5" width="52" height="30" />
          <line x1="4" y1="12.5" x2="56" y2="12.5" />
          <line x1="4" y1="20" x2="56" y2="20" />
          <line x1="4" y1="27.5" x2="56" y2="27.5" />
        </g>
        <g fill="#9CA3AF" stroke="none">
          <circle cx="8" cy="8.5" r="0.9" />
          <circle cx="8" cy="16" r="0.9" />
          <circle cx="8" cy="23.5" r="0.9" />
          <circle cx="8" cy="31" r="0.9" />
        </g>
      </svg>
    );
  }
  if (id === 'experiment-canvas') {
    // Experiment flow: assumption + hypothesis, setup, then metrics/results/next.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="4" y="5" width="52" height="30" />
          <line x1="22" y1="5" x2="22" y2="14" />
          <line x1="4" y1="14" x2="56" y2="14" />
          <line x1="4" y1="25" x2="56" y2="25" />
          <line x1="22" y1="25" x2="22" y2="35" />
          <line x1="39" y1="25" x2="39" y2="35" />
        </g>
        <g stroke="#9CA3AF" strokeWidth="0.5" fill="none" strokeLinecap="round">
          <line x1="8" y1="9" x2="17" y2="9" />
          <line x1="26" y1="9" x2="52" y2="9" />
          <line x1="8" y1="19" x2="52" y2="19" />
          <line x1="8" y1="30" x2="17" y2="30" />
          <line x1="26" y1="30" x2="34" y2="30" />
          <line x1="43" y1="30" x2="52" y2="30" />
        </g>
      </svg>
    );
  }
  if (id === 'empathy-map') {
    // XPLANE-style layout: thin persona strip + big square with X diagonals
    // (4 triangle wedges) + head circle at the X intersection + a merged
    // Pain/Gain row with vertical divider beneath.
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          {/* persona strip */}
          <rect x="3" y="3" width="54" height="5" />
          {/* upper square + X diagonals */}
          <rect x="3" y="10" width="54" height="20" />
          <line x1="3"  y1="10" x2="57" y2="30" />
          <line x1="57" y1="10" x2="3"  y2="30" />
          {/* merged pain/gain rect with vertical divider */}
          <rect x="3" y="32" width="54" height="5" />
          <line x1="30" y1="32" x2="30" y2="37" />
        </g>
        {/* head circle at the X intersection */}
        <circle cx="30" cy="20" r="3" fill="#FAFAF7" stroke="#1F2937" strokeWidth="0.6" />
      </svg>
    );
  }
  if (id === 'innovation-culture-map') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3" y="3" width="54" height="5" />
          <rect x="14" y="10" width="20" height="7" />
          <rect x="37" y="10" width="20" height="7" />
          <rect x="14" y="19" width="20" height="8" />
          <rect x="37" y="19" width="20" height="8" />
          <rect x="14" y="29" width="20" height="8" />
          <rect x="37" y="29" width="20" height="8" />
        </g>
        <g stroke="#9CA3AF" strokeWidth="0.5" fill="none">
          <line x1="34" y1="13.5" x2="37" y2="13.5" />
          <line x1="34" y1="23" x2="37" y2="23" />
          <line x1="34" y1="33" x2="37" y2="33" />
        </g>
      </svg>
    );
  }
  if (id === 'evidence-scorecard') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="4" y="5" width="15" height="9" />
          <rect x="22.5" y="5" width="15" height="9" />
          <rect x="41" y="5" width="15" height="9" />
          <rect x="4" y="17" width="15" height="9" />
          <rect x="22.5" y="17" width="15" height="9" />
          <rect x="41" y="17" width="15" height="9" />
          <rect x="4" y="29" width="52" height="8" />
        </g>
        <g stroke="#9CA3AF" strokeWidth="0.5" fill="none" strokeLinecap="round">
          <line x1="7" y1="9" x2="16" y2="9" />
          <line x1="25.5" y1="9" x2="34.5" y2="9" />
          <line x1="44" y1="9" x2="53" y2="9" />
        </g>
      </svg>
    );
  }
  if (id === 'scenario-matrix') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="4" y="3" width="24" height="6" />
          <rect x="32" y="3" width="24" height="6" />
          <rect x="4" y="12" width="24" height="10" />
          <rect x="32" y="12" width="24" height="10" />
          <rect x="4" y="24" width="24" height="10" />
          <rect x="32" y="24" width="24" height="10" />
          <rect x="4" y="36" width="52" height="2" />
        </g>
        <g fill="#9CA3AF" stroke="none">
          <circle cx="30" cy="17" r="1" />
          <circle cx="30" cy="29" r="1" />
        </g>
      </svg>
    );
  }
  if (id === 'platform-ecosystem-map') {
    return (
      <svg viewBox="0 0 60 40" {...sizeProps}>
        <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
        <g fill="none" stroke="#1F2937" strokeWidth="0.6">
          <rect x="3" y="4" width="15" height="12" />
          <rect x="22" y="4" width="16" height="12" />
          <rect x="42" y="4" width="15" height="12" />
          <rect x="3" y="20" width="17" height="8" />
          <rect x="22" y="20" width="16" height="8" />
          <rect x="40" y="20" width="17" height="8" />
          <rect x="3" y="32" width="54" height="5" />
        </g>
        <g stroke="#9CA3AF" strokeWidth="0.7" fill="none" strokeLinecap="round">
          <path d="M18 10 C20 8 20 8 22 10" />
          <path d="M38 10 C40 8 40 8 42 10" />
        </g>
      </svg>
    );
  }
  // Generic fallback (e.g. for future canvas types).
  return (
    <svg viewBox="0 0 60 40" {...sizeProps}>
      <rect x="0" y="0" width="60" height="40" fill="#FAFAF7" />
      <g fill="none" stroke="#1F2937" strokeWidth="0.6">
        <rect x="4" y="4" width="52" height="32" />
      </g>
    </svg>
  );
}
