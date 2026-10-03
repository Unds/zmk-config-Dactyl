// Generates docs/keymap.html from config/dactyl_manuform_5x6.keymap.
// Usage: node tools/keymap-html.js
// Pure Node, no dependencies. Re-run after every keymap change.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const keymapPath = path.join(root, "config", "dactyl_manuform_5x6.keymap");
const outPath = path.join(root, "docs", "keymap.html");
const src = fs.readFileSync(keymapPath, "utf8");

// ---------- physical layout (positions from the keymap header comment) ----------
// Each hand: 5 finger columns x 5 rows (number, top, home, bottom, extra) plus thumbs.
// null = no key at that spot.
const LEFT_COLS = [
  { name: "pinky", keys: [null, 9, 19, 29, 39] },
  { name: "ring", keys: [0, 10, 20, 30, 40] },
  { name: "middle", keys: [1, 11, 21, 31, 41] },
  { name: "index", keys: [2, 12, 22, 32, null] },
  { name: "inner", keys: [3, 13, 23, 33, null] },
];
const RIGHT_COLS = [
  { name: "inner", keys: [4, 14, 24, 34, null] },
  { name: "index", keys: [5, 15, 25, 35, null] },
  { name: "middle", keys: [6, 16, 26, 36, 42] },
  { name: "ring", keys: [7, 17, 27, 37, 43] },
  { name: "pinky", keys: [8, 18, 28, 38, 44] },
];
// Thumb rows, outer to inner for the left hand, inner to outer for the right.
const LEFT_THUMBS = [[45], [47, 48], [51, 52]];
const RIGHT_THUMBS = [[46], [49, 50], [53, 54]];
const KEY_COUNT = 55;

// ---------- keycode labels ----------
const KEYS = {
  N0: "0", N1: "1", N2: "2", N3: "3", N4: "4", N5: "5", N6: "6", N7: "7", N8: "8", N9: "9",
  COMMA: ",", DOT: ".", SQT: "'", SEMI: ";", FSLH: "/", BSLH: "\\", EQUAL: "=", MINUS: "-",
  LBRC: "{", RBRC: "}", LBKT: "[", RBKT: "]", LPAR: "(", RPAR: ")", STAR: "*", PLUS: "+",
  CARET: "^", AMPS: "&", PIPE: "|", UNDER: "_", EXCL: "!", QMARK: "?", LESS_THAN: "<",
  GREATER_THAN: ">", COLON: ":", TILDE: "~", PERCENT: "%", GRAVE: "`",
  BSPC: "Bksp", DEL: "Del", RET: "Enter", TAB: "Tab", ESC: "Esc", SPACE: "Space",
  LSHFT: "Shift", RSHFT: "Shift", LCTRL: "Ctrl", RCTRL: "Ctrl", LALT: "Alt", RALT: "AltGr",
  LGUI: "Win", RGUI: "Win", CAPS: "Caps", INS: "Ins", K_APP: "Menu",
  PG_UP: "PgUp", PG_DN: "PgDn", HOME: "Home", END: "End",
  UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→",
  PSCRN: "PrtSc", SLCK: "ScrLk", PAUSE_BREAK: "Pause",
  C_PREV: "Prev ⏮", C_PLAY_PAUSE: "Play ⏯", C_NEXT: "Next ⏭", C_MUTE: "Mute",
  C_VOL_DN: "Vol −", C_VOL_UP: "Vol +",
};
for (let i = 1; i <= 24; i++) KEYS["F" + i] = "F" + i;
const MOD_WRAP = { LC: "Ctrl", LS: "Shift", LA: "Alt", LG: "Win", RC: "Ctrl", RS: "Shift", RA: "AltGr", RG: "Win" };
const MOD_SHORT = { LGUI: "Win", LALT: "Alt", LCTRL: "Ctrl", LSHFT: "Shift", RGUI: "Win", RALT: "AltGr", RCTRL: "Ctrl", RSHFT: "Shift" };

function keyLabel(code) {
  const m = code.match(/^([A-Z]{2})\((.+)\)$/);
  if (m && MOD_WRAP[m[1]]) return MOD_WRAP[m[1]] + "+" + keyLabel(m[2]);
  if (KEYS[code] !== undefined) return KEYS[code];
  if (/^[A-Z]$/.test(code)) return code;
  return code.toLowerCase().replace(/_/g, " ");
}

// ---------- layer names ----------
const layerNames = {};
for (const m of src.matchAll(/^#define\s+([A-Z]+)\s+(\d+)\s*$/gm)) layerNames[m[1]] = +m[2];
const layerDisplay = {};
for (const m of src.matchAll(/(\w+)_layer\s*\{\s*display-name\s*=\s*"([^"]+)"/g)) layerDisplay[m[1]] = m[2];

function layerLabel(ref) {
  // ref is a #define name like NAV; find its display-name via index
  const idx = layerNames[ref];
  const entry = Object.entries(layerDisplay)[idx];
  return entry ? entry[1] : ref;
}

// ---------- parse bindings ----------
// Returns {tap, hold, kind} for one binding token such as "kp N2" or "hml LGUI N".
function parseBinding(tok) {
  const parts = tok.trim().split(/\s+/);
  const b = parts[0];
  const a = parts.slice(1);
  switch (b) {
    case "kp": return { tap: keyLabel(a[0]), kind: "key" };
    case "trans": return { tap: "", kind: "trans" };
    case "none": return { tap: "", kind: "none" };
    case "hml": case "hmr": return { tap: keyLabel(a[1]), hold: MOD_SHORT[a[0]] || a[0], kind: "hrm" };
    case "tmt": return { tap: keyLabel(a[1]), hold: MOD_SHORT[a[0]] || a[0], kind: "modtap" };
    case "lt": return { tap: keyLabel(a[1]), hold: layerLabel(a[0]), kind: "layertap" };
    case "mo": return { tap: "", hold: layerLabel(a[0]), kind: "layer" };
    case "tog": return { tap: "Toggle " + layerLabel(a[0]), kind: "toggle" };
    case "bt":
      if (a[0] === "BT_CLR") return { tap: "BT clear", kind: "sys" };
      if (a[0] === "BT_SEL") return { tap: "BT " + a[1], kind: "sys" };
      return { tap: a.join(" "), kind: "sys" };
    case "out": return { tap: a[0] === "OUT_TOG" ? "USB/BT toggle" : a[0], kind: "sys" };
    case "bootloader": return { tap: "Bootloader", kind: "sys" };
    case "sys_reset": return { tap: "Reset", kind: "sys" };
    case "caps_word": return { tap: "Caps Word", kind: "key" };
    case "bs_del": return { tap: "Bksp", hold: "", shift: "Del", kind: "key" };
    default: return { tap: tok.trim(), kind: "key" };
  }
}

const layers = [];
const layerRe = /(\w+)_layer\s*\{\s*display-name\s*=\s*"([^"]+)";\s*bindings\s*=\s*<([\s\S]*?)>;/g;
for (const m of src.matchAll(layerRe)) {
  const body = m[3].replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const toks = body.split("&").map((t) => t.trim()).filter(Boolean);
  if (toks.length !== KEY_COUNT) {
    throw new Error(`Layer ${m[2]} has ${toks.length} bindings, expected ${KEY_COUNT}`);
  }
  layers.push({ id: m[1], name: m[2], keys: toks.map(parseBinding) });
}

// ---------- combos ----------
const posNames = {};
for (const m of src.matchAll(/^#define\s+([LR][TMBH]\d)\s+(\d+)\s*$/gm)) posNames[m[1]] = +m[2];
const combos = [];
for (const m of src.matchAll(/ZMK_COMBO\(\s*(\w+)\s*,\s*&(.+?)\s*,\s*([A-Z0-9 ]+?)\s*,\s*([A-Z]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*(?:\/\/\s*(.*))?/g)) {
  const positions = m[3].trim().split(/\s+/).map((p) => posNames[p] ?? p);
  combos.push({ name: m[1], binding: parseBinding(m[2]), positions, layer: m[4], ms: m[5], idle: m[6], note: (m[7] || "").trim() });
}
const base = layers[0];
function baseLabel(pos) { const k = base.keys[pos]; return k.tap || k.hold || "?"; }

// ---------- HTML ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function keyCell(k, pos) {
  if (k.kind === "none") return `<div class="key none" title="position ${pos}"></div>`;
  if (k.kind === "trans") return `<div class="key trans" title="position ${pos}: falls through to base"><span class="tap">▽</span></div>`;
  const cls = ["key", k.kind].join(" ");
  const hold = k.hold ? `<span class="hold">${esc(k.hold)}</span>` : "";
  const shift = k.shift ? `<span class="shift">⇧ ${esc(k.shift)}</span>` : "";
  const tap = k.tap ? `<span class="tap">${esc(k.tap)}</span>` : `<span class="tap">&nbsp;</span>`;
  return `<div class="${cls}" title="position ${pos}">${hold}${tap}${shift}</div>`;
}

function handHtml(cols, thumbs, layer, side) {
  let h = `<div class="hand ${side}"><div class="hand-label">${side === "left" ? "Left hand" : "Right hand"}</div><div class="cols">`;
  for (const c of cols) {
    h += `<div class="col"><div class="col-name">${c.name}</div>`;
    for (const pos of c.keys) h += pos === null ? `<div class="key gap"></div>` : keyCell(layer.keys[pos], pos);
    h += `</div>`;
  }
  h += `</div><div class="thumbs">`;
  for (const row of thumbs) {
    h += `<div class="thumb-row">`;
    for (const pos of row) h += keyCell(layer.keys[pos], pos);
    h += `</div>`;
  }
  h += `</div></div>`;
  return h;
}

let layersHtml = "";
for (const L of layers) {
  layersHtml += `<section class="layer" id="layer-${L.id}"><h2>${esc(L.name)} <span class="layer-id">layer ${layers.indexOf(L)}</span></h2>
<div class="card"><div class="hands">${handHtml(LEFT_COLS, LEFT_THUMBS, L, "left")}${handHtml(RIGHT_COLS, RIGHT_THUMBS, L, "right")}</div></div></section>\n`;
}

let combosHtml = combos.map((c) => `<tr><td>${esc(c.binding.tap)}</td><td>${esc(c.positions.map(baseLabel).join(" + "))}</td><td>${esc(c.note)}</td><td>${c.ms} ms, after ${c.idle} ms idle</td></tr>`).join("\n");

const generated = new Date().toISOString().slice(0, 10);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dactyl Manuform — Keymap</title>
<style>
  :root { --bg:#ffffff; --card:#f7f6f2; --border:#d9d7cd; --text:#262521; --text-muted:#6b6a63; --blue:#185fa5; --amber:#854f0b; --key:#ffffff; --hold:#e8f0fa; --layer:#fff4e0; --sys:#f3e8f8; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif; background:var(--bg); color:var(--text); margin:0; padding:32px 20px 60px; line-height:1.45; }
  .wrap { max-width:1100px; margin:0 auto; }
  h1 { font-size:22px; font-weight:600; margin:0 0 4px; }
  .subtitle { color:var(--text-muted); font-size:14px; margin-bottom:24px; }
  h2 { font-size:17px; font-weight:600; margin:36px 0 10px; }
  .layer-id { font-weight:400; color:var(--text-muted); font-size:13px; margin-left:8px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px; overflow-x:auto; }
  .hands { display:grid; grid-template-columns:1fr; gap:24px; }
  @media (min-width:900px) { .hands { grid-template-columns:1fr 1fr; } }
  .hand-label { font-size:12px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.03em; margin-bottom:8px; }
  .cols { display:flex; gap:4px; }
  .hand.right .cols { justify-content:flex-end; }
  .col { display:flex; flex-direction:column; gap:4px; }
  .col-name { font-size:10px; color:var(--text-muted); text-align:center; height:14px; }
  .key { width:62px; height:46px; border:1px solid var(--border); border-radius:6px; background:var(--key); display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:12px; padding:2px; text-align:center; line-height:1.15; }
  .key.gap { visibility:hidden; }
  .key.none { background:transparent; border-style:dashed; }
  .key.trans { background:transparent; color:var(--text-muted); }
  .key .tap { font-weight:600; word-break:break-word; }
  .key .hold { font-size:9.5px; color:var(--blue); font-weight:600; }
  .key .shift { font-size:9px; color:var(--text-muted); }
  .key.hrm, .key.modtap { background:var(--hold); }
  .key.layertap, .key.layer, .key.toggle { background:var(--layer); }
  .key.layer .hold { color:var(--amber); font-size:11px; }
  .key.layertap .hold { color:var(--amber); }
  .key.sys { background:var(--sys); }
  .thumbs { margin-top:10px; display:flex; flex-direction:column; gap:4px; }
  .thumb-row { display:flex; gap:4px; }
  .hand.left .thumbs { align-items:flex-end; padding-right:0; }
  .hand.left .thumb-row { justify-content:flex-end; }
  .hand.right .thumbs { align-items:flex-start; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th, td { border:1px solid var(--border); padding:6px 10px; text-align:left; vertical-align:top; }
  th { background:var(--card); font-weight:600; }
  .legend { display:flex; gap:18px; margin:14px 0 0; font-size:12px; color:var(--text-muted); flex-wrap:wrap; }
  .legend span { display:inline-flex; align-items:center; gap:6px; }
  .swatch { width:16px; height:12px; border:1px solid var(--border); border-radius:3px; display:inline-block; }
  .note { font-size:13px; color:var(--text-muted); margin-top:10px; }
  code { background:var(--card); border:1px solid var(--border); border-radius:4px; padding:1px 5px; font-size:12px; }
  nav a { margin-right:12px; font-size:13px; color:var(--blue); }
  ul.plain { padding-left:18px; font-size:14px; }
</style>
</head>
<body>
<div class="wrap">
<h1>Dactyl Manuform — keymap reference</h1>
<div class="subtitle">Generated ${generated} from <code>config/dactyl_manuform_5x6.keymap</code> by <code>tools/keymap-html.js</code>. ${layers.length} layers, ${KEY_COUNT} keys. Base layer is Gallium with home-row mods.</div>

<nav>${layers.map((L) => `<a href="#layer-${L.id}">${esc(L.name)}</a>`).join("")}<a href="#combos">Combos</a><a href="#howto">How layers are reached</a></nav>

<div class="legend">
  <span><i class="swatch" style="background:var(--key)"></i> plain key</span>
  <span><i class="swatch" style="background:var(--hold)"></i> tap = key, hold = modifier (blue)</span>
  <span><i class="swatch" style="background:var(--layer)"></i> layer key (amber = layer while held)</span>
  <span><i class="swatch" style="background:var(--sys)"></i> Bluetooth / system</span>
  <span>▽ falls through to the base layer</span>
  <span><i class="swatch" style="border-style:dashed;background:transparent"></i> does nothing</span>
</div>

<section id="howto">
<h2>How layers are reached</h2>
<div class="card">
<ul class="plain">
  <li><b>NAV</b>: hold the left bottom-row thumb key (outer).</li>
  <li><b>NUM&amp;SYM</b>: hold the right bottom-row thumb key (inner).</li>
  <li><b>ADJUST</b>: hold NAV and NUM together. Bluetooth profiles, USB/BT toggle, bootloader and reset live here.</li>
  <li><b>FN</b>: hold the right middle-row thumb key (inner); tap gives AltGr. Bluetooth profile select and <b>BT clear</b> are on the FN layer's top row, right hand: inner = profile 0, pinky = clear.</li>
  <li><b>NUMPAD</b>: hold the left middle-row thumb key (inner); tap gives Space. The pinky top-row key on NUMPAD toggles it on permanently.</li>
  <li><b>COLEMAK-DH</b> and <b>QWERTY</b>: toggled from the FN layer, left extra row (middle = Colemak, pinky = QWERTY). Toggle again to return to Gallium.</li>
  <li><b>ONE-HAND</b>: toggled from the NAV layer (left middle finger, top row) and from its own bottom-left thumb key.</li>
  <li>Home-row mods: hold the home-row letter for the modifier shown in blue. Balanced flavour, 280 ms tapping term, 150 ms prior-idle so fast rolls stay letters.</li>
  <li>Caps Word: the single left thumb key. Right single thumb key is Delete. Backspace on the left bottom thumb becomes Delete with Shift.</li>
</ul>
</div>
</section>

${layersHtml}

<section id="combos">
<h2>Combos (base layer)</h2>
<div class="card">
<table><thead><tr><th>Output</th><th>Keys (Gallium)</th><th>Note</th><th>Window</th></tr></thead><tbody>
${combosHtml}
</tbody></table>
<div class="note">Press both keys within the window; a combo only fires after the idle time with no other key, so letter rolls inside words do not trigger it.</div>
</div>
</section>

<section>
<h2>Bluetooth recovery</h2>
<div class="card">
<ul class="plain">
  <li>If Windows or the phone says "couldn't connect" after you removed the keyboard on that side, the left half still holds the old bond. Hold FN and press the right pinky top-row key (BT clear), then pair again from the host.</li>
  <li>The right half never types over USB; it only charges there. Its keys reach the host through the left half over Bluetooth.</li>
  <li>If the halves stop seeing each other after a settings reset, flash <code>settings_reset</code> to both halves, then the left and right firmware, and power both on together.</li>
</ul>
</div>
</section>
</div>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`wrote ${path.relative(root, outPath)}: ${layers.length} layers, ${combos.length} combos`);

// ---------- Markdown version for the README (between keymap markers) ----------
function mdCell(k) {
  if (k.kind === "none") return "·";
  if (k.kind === "trans") return "▽";
  const mdEsc = (s) => s.replace(/([\\*_`|<>])/g, "\\$1");
  const tap = k.tap ? `**${mdEsc(k.tap)}**` : "";
  const hold = k.hold ? `*${mdEsc(k.hold)}*` : "";
  const shift = k.shift ? `(⇧ ${k.shift})` : "";
  return [tap, hold, shift].filter(Boolean).join(" ");
}
const ROW_NAMES = ["number", "top", "home", "bottom", "extra"];
function mdLayer(L) {
  const head = "| | " + LEFT_COLS.map((c) => c.name).join(" | ") + " | | " + RIGHT_COLS.map((c) => c.name).join(" | ") + " |";
  const sep = "|---|" + "---|".repeat(LEFT_COLS.length) + "---|" + "---|".repeat(RIGHT_COLS.length);
  const rows = ROW_NAMES.map((rn, r) => {
    const l = LEFT_COLS.map((c) => (c.keys[r] === null ? " " : mdCell(L.keys[c.keys[r]])));
    const rt = RIGHT_COLS.map((c) => (c.keys[r] === null ? " " : mdCell(L.keys[c.keys[r]])));
    return `| ${rn} | ${l.join(" | ")} | | ${rt.join(" | ")} |`;
  });
  const t = (pos) => mdCell(L.keys[pos]);
  const thumbs = [
    "| thumbs | left outer | left inner | | right inner | right outer |",
    "|---|---|---|---|---|---|",
    `| single | | ${t(45)} | | ${t(46)} | |`,
    `| middle pair | ${t(47)} | ${t(48)} | | ${t(49)} | ${t(50)} |`,
    `| bottom pair | ${t(51)} | ${t(52)} | | ${t(53)} | ${t(54)} |`,
  ];
  return `### ${L.name} (layer ${layers.indexOf(L)})\n\n${[head, sep, ...rows].join("\n")}\n\n${thumbs.join("\n")}\n`;
}
const mdCombos = [
  "| Output | Keys (Gallium) | Note | Window |",
  "|---|---|---|---|",
  ...combos.map((c) => `| ${c.binding.tap} | ${c.positions.map(baseLabel).join(" + ")} | ${c.note} | ${c.ms} ms, after ${c.idle} ms idle |`),
].join("\n");
const md = `<!-- keymap:start — generated by tools/keymap-html.js, do not edit by hand -->
_Generated ${generated} from \`config/dactyl_manuform_5x6.keymap\`. **bold** = tap, *italic* = hold, ▽ = falls through to base, · = nothing. The same reference with the physical key shape is in [docs/keymap.html](docs/keymap.html)._

${layers.map(mdLayer).join("\n")}
### Combos (base layer)

${mdCombos}
<!-- keymap:end -->`;

const readmePath = path.join(root, "README.md");
let readme = fs.readFileSync(readmePath, "utf8");
const start = readme.indexOf("<!-- keymap:start");
const end = readme.indexOf("<!-- keymap:end -->");
if (start >= 0 && end > start) {
  readme = readme.slice(0, start) + md + readme.slice(end + "<!-- keymap:end -->".length);
} else {
  readme = readme.trimEnd() + "\n\n## Keymap\n\n" + md + "\n";
}
fs.writeFileSync(readmePath, readme);
console.log("updated README.md keymap section");
