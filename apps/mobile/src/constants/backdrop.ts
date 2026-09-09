/**
 * The all-over-print backdrop — an original seamless tile of cocktail line-art
 * (glasses, lime wheels, a shaker, an olive pick, a mint sprig, bubbles) that
 * sits BENEATH all cards as the page background, for depth and theme.
 *
 * Implemented as a tiled SVG data-URI CSS background injected into the web
 * document shell (app/+html.tsx). Theme-aware: darker amber line-art on the
 * light ground, brighter amber on the dark ground, both at low opacity so cards
 * and text stay readable. Web-only (native uses a solid theme background).
 */

// Cocktail motifs, drawn once, laid out inside a 200×200 tile. Line-art only
// (stroke, no fill) so it reads as a subtle print. Coordinates keep each motif
// clear of the tile edges so the repeat is clean.
const MOTIFS = `
<g transform="translate(42,46)">
  <path d="M-16,-14 L16,-14 L0,5 Z"/><path d="M0,5 L0,17"/><path d="M-11,17 L11,17"/>
</g>
<g transform="translate(150,42)">
  <rect x="-11" y="-16" width="22" height="34" rx="3"/><path d="M5,-22 L9,12"/>
  <circle cx="-3" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="-1" cy="-6" r="1.5"/>
</g>
<g transform="translate(98,104)">
  <circle cx="0" cy="0" r="15"/><circle cx="0" cy="0" r="5"/>
  <path d="M0,-15 L0,-5 M0,5 L0,15 M-15,0 L-5,0 M5,0 L15,0"/>
  <path d="M-10.6,-10.6 L-3.5,-3.5 M10.6,10.6 L3.5,3.5 M-10.6,10.6 L-3.5,3.5 M10.6,-10.6 L3.5,-3.5"/>
</g>
<g transform="translate(38,150)">
  <path d="M-9,18 L-6,-6 L6,-6 L9,18 Z"/><path d="M-7,-6 L-5,-16 L5,-16 L7,-6 Z"/><path d="M-6,-16 L6,-16"/>
</g>
<g transform="translate(158,152)">
  <path d="M-14,14 L11,-13"/><circle cx="2" cy="-4" r="4.5"/><circle cx="-5" cy="3" r="3.5"/>
</g>
<g transform="translate(112,168)">
  <path d="M0,16 C-3,4 3,-6 0,-16"/><path d="M0,-2 C6,-4 9,0 8,4 C4,4 1,2 0,-2 Z"/>
  <path d="M0,6 C-6,4 -9,8 -8,12 C-4,12 -1,10 0,6 Z"/>
</g>
<g transform="translate(180,100)"><circle cx="0" cy="0" r="2"/><circle cx="6" cy="8" r="1.4"/><circle cx="-5" cy="7" r="1.4"/></g>
<g transform="translate(20,96)"><circle cx="0" cy="0" r="2"/><circle cx="7" cy="-6" r="1.4"/></g>
`;

function tile(stroke: string, opacity: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
    `<g fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">` +
    MOTIFS +
    `</g></svg>`
  );
}

function dataUri(stroke: string, opacity: number): string {
  return `url("data:image/svg+xml,${encodeURIComponent(tile(stroke, opacity))}")`;
}

const LIGHT = dataUri('#8a5a1f', 0.1);
const DARK = dataUri('#e8a93c', 0.09);

/**
 * CSS injected into <head>: a fixed, full-viewport print layer behind #root.
 *
 * Keyed on the `data-theme` attribute that <ThemeSync> writes from the app's
 * own useColorScheme — so the backdrop and the RN component theme are driven by
 * ONE signal and can never disagree. Default (no attribute yet, i.e. the SSR
 * render) is light, matching the app's default render.
 */
export const BACKDROP_CSS = `
#tnc-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: #FBF7F0;
  background-image: ${LIGHT};
  background-repeat: repeat;
  background-size: 200px 200px;
}
:root[data-theme="dark"] #tnc-backdrop { background-color: #12100E; background-image: ${DARK}; }
`;
