// Wavy text in p5.js
// The text is drawn into an off-screen buffer, then re-drawn on the main
// canvas as horizontal wavy lines wherever the buffer contains ink.
//
// Commands (keyboard):
//   D / d  -> increase / decrease DENSITY   (how many lines fill the letters)
//   W / w  -> increase / decrease WAVYNESS  (wave amplitude)
//   H / h  -> increase / decrease HEAVINESS (font weight / line thickness)
//   F / f  -> increase / decrease wave frequency
//   SPACE  -> pause / resume animation
//   P      -> show / hide the control panel
//   R      -> reset all settings
// The same values can be changed with the sliders in the panel.

const DEFAULTS = {
  txt: 'WAVY',
  density: 40,     // 5..100  -> lines per letter height
  wavyness: 12,    // 0..60   -> wave amplitude in px
  heaviness: 4,    // 1..20   -> font weight / stroke thickness
  frequency: 3,    // 1..15   -> wave frequency
  speed: 2         // 0..10   -> animation speed
};

let settings = { ...DEFAULTS };
let buffer;        // off-screen graphics holding the solid text
let needsRedraw = true;
let paused = false;
let t = 0;
let ui = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  buildUI();
  makeBuffer();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeBuffer();
}

function makeBuffer() {
  buffer = createGraphics(width, height);
  buffer.pixelDensity(1);
  needsRedraw = true;
}

// Render the text into the buffer. Heaviness thickens the glyphs by adding
// a stroke of the same colour around them.
function renderBuffer() {
  buffer.clear();
  buffer.background(0);
  buffer.fill(255);
  buffer.stroke(255);
  buffer.strokeJoin(ROUND);
  buffer.strokeWeight(settings.heaviness * 1.5);
  buffer.textStyle(BOLD);
  buffer.textFont('Arial Black, Helvetica, sans-serif');
  buffer.textAlign(CENTER, CENTER);

  // Fit text to roughly 85% of the canvas width
  let size = height * 0.45;
  buffer.textSize(size);
  const w = buffer.textWidth(settings.txt || ' ');
  if (w > width * 0.85) size *= (width * 0.85) / w;
  buffer.textSize(size);

  buffer.text(settings.txt, width / 2, height / 2);
  buffer.loadPixels();
  settings.textSize = size;
  needsRedraw = false;
}

function inked(x, y) {
  x = floor(x); y = floor(y);
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) return false;
  return buffer.pixels[4 * (y * buffer.width + x)] > 127;
}

function draw() {
  if (needsRedraw) renderBuffer();
  if (!paused) t += settings.speed * 0.01;

  background(14, 14, 18);

  const size = settings.textSize;
  const top = height / 2 - size * 0.75;
  const bottom = height / 2 + size * 0.75;
  const gap = max(2, size / settings.density);   // density -> line spacing
  const step = 3;                                  // horizontal sample step
  const amp = settings.wavyness;
  const freq = settings.frequency * 0.004;

  noFill();
  strokeCap(ROUND);
  strokeWeight(map(settings.heaviness, 1, 20, 1, gap * 0.9, true));

  let row = 0;
  for (let y = top; y <= bottom; y += gap, row++) {
    stroke(color(`hsl(${floor((row * 4 + t * 40) % 360)}, 80%, 65%)`));
    let drawing = false;
    for (let x = 0; x <= width; x += step) {
      // Sample the text at a wave-shifted position so the letters themselves warp
      const wave = sin(x * freq + t * 3 + y * 0.01) * amp;
      const wave2 = cos(y * freq * 1.5 + t * 2) * amp * 0.5;
      if (inked(x + wave2, y + wave)) {
        if (!drawing) { beginShape(); drawing = true; }
        vertex(x, y);
      } else if (drawing) {
        endShape();
        drawing = false;
      }
    }
    if (drawing) endShape();
  }
}

function keyPressed() {
  // Ignore key commands while typing in the text box
  if (document.activeElement === ui.text.elt) return;
  switch (key) {
    case 'D': change('density', +5); break;
    case 'd': change('density', -5); break;
    case 'W': change('wavyness', +3); break;
    case 'w': change('wavyness', -3); break;
    case 'H': change('heaviness', +1); break;
    case 'h': change('heaviness', -1); break;
    case 'F': change('frequency', +1); break;
    case 'f': change('frequency', -1); break;
    case ' ': paused = !paused; return false;
    case 'p': case 'P': select('#panel').toggleClass('hidden'); break;
    case 'r': case 'R':
      settings = { ...DEFAULTS };
      ui.text.value(settings.txt);
      syncSliders();
      needsRedraw = true;
      break;
  }
}

function change(name, delta) {
  const s = ui[name];
  const v = constrain(settings[name] + delta, s.min, s.max);
  settings[name] = v;
  syncSliders();
  if (name === 'heaviness') needsRedraw = true;
}

// ---------- UI ----------
// The panel and its styles are created here, so this file works on its own
// (e.g. pasted straight into editor.p5js.org) without any extra HTML.
const PANEL_CSS = `
html, body { margin: 0; padding: 0; background: #0e0e12; overflow: hidden; font-family: system-ui, sans-serif; }
#panel {
  position: fixed; top: 12px; left: 12px; z-index: 10;
  background: rgba(20, 20, 28, 0.85); color: #eee;
  padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5;
  min-width: 240px;
}
#panel label { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; }
#panel input[type=range] { width: 100%; }
#panel input[type=text] { width: 100%; box-sizing: border-box; margin-top: 4px; padding: 4px 6px;
  background: #1c1c26; color: #fff; border: 1px solid #444; border-radius: 6px; }
#panel .keys { margin-top: 8px; color: #aaa; font-size: 12px; }
#panel.hidden { display: none; }
#panel kbd { background: #2a2a38; border-radius: 4px; padding: 0 5px; color: #fff; }
  
`;

function buildUI() {
  createElement('style', PANEL_CSS);
  const panel = select('#panel') || createDiv().id('panel');
  createDiv('<b>Wavy Text</b>').parent(panel);

  ui.text = createInput(settings.txt).parent(panel);
  ui.text.attribute('type', 'text');
  ui.text.input(() => { settings.txt = ui.text.value(); needsRedraw = true; });

  addSlider(panel, 'density',   'Density',   5, 100, 1);
  addSlider(panel, 'wavyness',  'Wavyness',  0, 60, 1);
  addSlider(panel, 'heaviness', 'Heaviness', 1, 20, 1);
  addSlider(panel, 'frequency', 'Frequency', 1, 15, 1);
  addSlider(panel, 'speed',     'Speed',     0, 10, 1);

  createDiv(
    '<div class="keys"><kbd>D</kbd>/<kbd>d</kbd> density &nbsp; <kbd>W</kbd>/<kbd>w</kbd> wavyness<br>' +
    '<kbd>H</kbd>/<kbd>h</kbd> heaviness &nbsp; <kbd>F</kbd>/<kbd>f</kbd> frequency<br>' +
    '<kbd>Space</kbd> pause &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>P</kbd> hide panel<br>' +
    '(uppercase = increase, lowercase = decrease)</div>'
  ).parent(panel);
}

function addSlider(panel, name, label, min, max, stepVal) {
  const row = createElement('label').parent(panel);
  createSpan(label).parent(row);
  const val = createSpan(settings[name]).parent(row);
  const s = createSlider(min, max, settings[name], stepVal).parent(panel);
  s.input(() => {
    settings[name] = s.value();
    val.html(settings[name]);
    if (name === 'heaviness') needsRedraw = true;
  });
  ui[name] = { slider: s, label: val, min, max };
}

function syncSliders() {
  for (const name of ['density', 'wavyness', 'heaviness', 'frequency', 'speed']) {
    ui[name].slider.value(settings[name]);
    ui[name].label.html(settings[name]);
  }
}
