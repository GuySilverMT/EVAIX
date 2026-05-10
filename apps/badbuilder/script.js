// ═══════════════════════════════════════════════════
// ZOOM & HISTORY
// ═══════════════════════════════════════════════════
let canvasZoom = 1;
let undoStack = [];
let redoStack = [];

function saveHistory() {
  const snapshot = {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    variables: JSON.parse(JSON.stringify(state.variables)),
    selection: [...state.selection],
    activeStateId: state.activeStateId,
    _uid: state._uid
  };
  undoStack.push(snapshot);
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) { showToast('Nothing to undo'); return; }
  const current = {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    variables: JSON.parse(JSON.stringify(state.variables)),
    selection: [...state.selection],
    activeStateId: state.activeStateId,
    _uid: state._uid
  };
  redoStack.push(current);
  const prev = undoStack.pop();
  prev.collapsedIds = new Set(prev.collapsedIds || []);
  Object.assign(state, prev);
  renderCanvas(); renderSidebar(); renderTree(); renderVars(); renderStateTabs();
  showToast('Undo');
}

function redo() {
  if (!redoStack.length) { showToast('Nothing to redo'); return; }
  const current = {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    variables: JSON.parse(JSON.stringify(state.variables)),
    selection: [...state.selection],
    activeStateId: state.activeStateId,
    _uid: state._uid
  };
  undoStack.push(current);
  const next = redoStack.pop();
  Object.assign(state, next);
  renderCanvas(); renderSidebar(); renderTree(); renderVars(); renderStateTabs();
  showToast('Redo');
}

function applyZoom() {
  const canvas = document.getElementById('canvas');
  if (canvas) canvas.style.transform = `scale(${canvasZoom})`;
  const label = document.getElementById('zoom-label');
  if (label) label.textContent = Math.round(canvasZoom * 100) + '%';
  updateSelectionDOM();
}

function changeZoom(delta) {
  canvasZoom = Math.min(3, Math.max(0.1, canvasZoom + delta));
  applyZoom();
}

function setZoom(val) {
  canvasZoom = val;
  applyZoom();
}

document.getElementById('canvas-wrap')?.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    canvasZoom = Math.min(3, Math.max(0.1, canvasZoom - e.deltaY * 0.002));
    applyZoom();
  }
}, { passive: false });

// ═══════════════════════════════════════════════════
// ROLE CONFIGURATIONS
// ═══════════════════════════════════════════════════
const ROLE_DESC = {
  container: 'Proportion + background setting device. Can hold all other elements.',
  navbar: 'Top/side navigation bar. Fills parent width.',
  sidebar: 'Persistent vertical panel. Nav, filters, controls.',
  card: 'Self-contained tile. Image + text + optional action.',
  modal: 'Overlay dialog. Blocks background. Dismissable.',
  hero: 'Full-width banner. Large visual + headline + CTA.',
  button: 'Action trigger. Has hover/active/disabled states.',
  input: 'Form entry field. Has label, placeholder, error state.',
  dropdown: 'Collapsed: shows selection + chevron. Open: list overlay.',
  table: 'Rows and columns of structured data. Apply grid to spawn cells.',
  cell: 'A table cell. Right-click to nest elements inside it.',
  image: 'Media placeholder. Define aspect ratio in AI notes.',
  text: 'Standalone typographic element. Label, heading, or body copy.',
  icon: 'Vector icon. Set icon name below. Browse lucide.dev.',
};

const CONTAINER_PRESETS = [
  { name: 'Desktop', w: 1440, h: 900 },
  { name: 'Laptop', w: 1280, h: 800 },
  { name: 'Tablet', w: 768, h: 1024 },
  { name: 'Mobile', w: 390, h: 844 },
  { name: 'Modal', w: 480, h: 320 },
  { name: 'Custom', w: null, h: null },
];

const ROLE_SECTIONS = {
  container: ['rs-identity', 'rs-container-presets', 'rs-position', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  navbar: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  sidebar: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  hero: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  card: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  modal: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  image: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-bgimage', 'rs-notes'],
  button: ['rs-identity', 'rs-bg', 'rs-border', 'rs-text-color', 'rs-typography', 'rs-text-content', 'rs-opacity', 'rs-notes'],
  input: ['rs-identity', 'rs-bg', 'rs-border', 'rs-text-color', 'rs-typography', 'rs-text-content', 'rs-opacity', 'rs-notes'],
  dropdown: ['rs-identity', 'rs-bg', 'rs-border', 'rs-text-color', 'rs-typography', 'rs-text-content', 'rs-opacity', 'rs-dropdown-options', 'rs-notes'],
  text: ['rs-identity', 'rs-bg', 'rs-text-color', 'rs-typography', 'rs-text-content', 'rs-opacity', 'rs-notes'],
  icon: ['rs-identity', 'rs-icon', 'rs-opacity', 'rs-notes'],
  table: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-grid', 'rs-notes'],
  cell: ['rs-identity', 'rs-bg', 'rs-border', 'rs-opacity', 'rs-notes'],
};
const ALL_SECTIONS = [
  'rs-identity', 'rs-container-presets', 'rs-position',
  'rs-bg', 'rs-border', 'rs-text-color', 'rs-typography', 'rs-text-content',
  'rs-icon', 'rs-opacity', 'rs-bgimage', 'rs-grid', 'rs-dropdown-options', 'rs-notes'
];

function applyRoleSections(role) {
  const show = new Set(ROLE_SECTIONS[role] || ALL_SECTIONS);
  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show.has(id) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════
function addVar(type, name, value) {
  const def = { colors: '#7c6bff', fonts: 'sans-serif', sizes: '14', icons: { size: 24, stroke: 2, color: "var(--primary)" } };
  const varName = name || (type === 'icons' ? 'new-style' : 'new-var');
  state.variables[type][varName] = value ?? def[type];
  renderVars(); renderAllDropdowns();
}

function removeVar(type, name) {
  delete state.variables[type][name];
  renderVars(); renderAllDropdowns();
}

function updateVar(type, oldName, newName, value) {
  if (oldName !== newName) {
    state.variables[type][newName] = state.variables[type][oldName];
    delete state.variables[type][oldName];
  }
  if (value !== undefined) state.variables[type][newName] = value;
}

function getTypedVarOptions(type, currentValue) {
  const vars = state.variables[type] || {};
  let options = `<option value="">Transparent / None</option>`;
  Object.keys(vars).forEach(name => {
    const val = type === 'icons' ? name : `var(--${name})`;
    const selected = currentValue === val || currentValue === name ? 'selected' : '';
    options += `<option value="${val}" ${selected}>${name}</option>`;
  });
  return options;
}

function resolveColor(ref) {
  if (!ref || ref === 'null' || ref === null) return 'transparent';
  if (ref.startsWith('var(--') && ref.endsWith(')')) {
    const name = ref.slice(6, -1);
    return state.variables.colors[name] || state.variables.colors['primary'] || ref;
  }
  return state.variables.colors[ref] || ref;
}

function resolveFont(ref) {
  if (ref && ref.startsWith('var(--')) {
    const name = ref.slice(6, -1);
    return state.variables.fonts[name] || "'JetBrains Mono', monospace";
  }
  return state.variables.fonts[ref] || ref || "'JetBrains Mono', monospace";
}

function resolveSize(ref) {
  if (ref && typeof ref === 'string' && ref.startsWith('var(--')) {
    const name = ref.slice(6, -1);
    return parseFloat(state.variables.sizes[name]) || 12;
  }
  return parseFloat(state.variables.sizes[ref]) || (typeof ref === 'number' ? ref : 12);
}

function renderVars() {
  ['colors', 'fonts', 'sizes', 'icons'].forEach(type => {
    const el = document.getElementById('left-var-list-' + type); if (!el) return;
    el.innerHTML = '';
    const vars = state.variables[type];
    Object.keys(vars).forEach(name => {
      const val = vars[name];
      const row = document.createElement('div'); row.className = 'var-item';

      if (type === 'colors') {
        row.innerHTML = `
          <div class="var-swatch" style="background:${val}">
            <input type="color" value="${val}" oninput="state.variables.colors['${name}']=this.value; renderCanvas()" onchange="renderVars()">
          </div>
          <div class="var-item-name">
            <input value="${name}" onchange="updateVar('colors', '${name}', this.value); renderVars(); renderAllDropdowns()">
          </div>
          <span class="var-del" onclick="removeVar('colors','${name}')">×</span>`;
      } else if (type === 'icons') {
        row.innerHTML = `
          <div class="var-item-name">
            <input value="${name}" onchange="updateVar('icons', '${name}', this.value); renderVars(); renderAllDropdowns()">
          </div>
          <div style="display:flex; gap:4px; align-items:center">
            <input type="number" style="width:30px" value="${val.size}" oninput="state.variables.icons['${name}'].size=+this.value; renderCanvas()" title="Size">
            <input type="number" step="0.5" style="width:30px" value="${val.stroke}" oninput="state.variables.icons['${name}'].stroke=+this.value; renderCanvas()" title="Stroke">
          </div>
          <span class="var-del" onclick="removeVar('icons','${name}')">×</span>`;
      } else {
        row.innerHTML = `
          <div class="var-item-name">
            <input value="${name}" onchange="updateVar('${type}', '${name}', this.value); renderVars(); renderAllDropdowns()">
          </div>
          <input class="var-size-val" value="${val}" oninput="state.variables['${type}']['${name}']=this.value; renderCanvas()" onchange="renderVars()">
          <span class="var-del" onclick="removeVar('${type}','${name}')">×</span>`;
      }
      el.appendChild(row);
    });
  });
}

function renderLeftVars() { renderVars(); }

function populateTypedSelect(id, type, currentValue, includeTransparent) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = getTypedVarOptions(type, currentValue);
}

function renderAllDropdowns() {
  const b = getSelected();
  populateTypedSelect('p-bgColor', 'colors', b?.bgColor, true);
  populateTypedSelect('p-borderColor', 'colors', b?.borderColor, false);
  populateTypedSelect('p-textColor', 'colors', b?.textColor, false);
  populateTypedSelect('p-fontId', 'fonts', b?.fontId, false);
  populateTypedSelect('p-sizeId', 'sizes', b?.sizeId, false);
  populateTypedSelect('p-iconStyle', 'icons', b?.iconStyleId, false);
  populateTypedSelect('p-iconColor', 'colors', b?.iconColor, false);
}

// ═══════════════════════════════════════════════════
// UI STATE & TABS
// ═══════════════════════════════════════════════════
function switchLeft(tab) {
  ['layers', 'components', 'vars'].forEach(t => {
    document.getElementById('ltab-' + t)?.classList.toggle('active', t === tab);
    document.getElementById('lpane-' + t)?.classList.toggle('active', t === tab);
  });
}

function switchRight(tab) {
  document.getElementById('rtab-props')?.classList.add('active');
  document.getElementById('rpane-props')?.classList.add('active');
}

// ═══════════════════════════════════════════════════
// GLOBAL STATE & BLOCKS
// ═══════════════════════════════════════════════════
const BLOCK_DEFAULTS = {
  container: { w: 1440, h: 900 },
  navbar: { w: 200, h: 60 }, sidebar: { w: 200, h: 400 },
  card: { w: 200, h: 150 }, modal: { w: 200, h: 200 }, hero: { w: 200, h: 200 },
  button: { w: 100, h: 36 }, input: { w: 200, h: 36 }, dropdown: { w: 160, h: 36 },
  table: { w: 200, h: 150 }, cell: { w: 100, h: 75 }, text: { w: 200, h: 50 }, image: { w: 200, h: 150 }, icon: { w: 48, h: 48 },
};

const COUNTERS = {};
function nextName(role) { COUNTERS[role] = (COUNTERS[role] || 0) + 1; return role[0].toUpperCase() + role.slice(1) + '-' + COUNTERS[role]; }

let components = [];

let state = {
  blocks: [],
  selection: [],
  clipboard: [],
  _uid: 1,
  drag: null,
  mq: { active: false, sx: 0, sy: 0 },
  variables: {
    colors: { "primary": "#7c6bff", "surface": "#18181a", "background": "#0e0e0f", "text": "#e8e8ec", "accent": "#7c6bff" },
    fonts: { "main": "'JetBrains Mono', monospace", "display": "'Syne', sans-serif" },
    sizes: { "body": "12", "heading": "20", "small": "10" },
    icons: {
      "standard": { size: 60, stroke: 2, color: "var(--primary)" },
      "small": { size: 40, stroke: 1, color: "var(--text)" }
    }
  },
  activeStateId: null,
  collapsedIds: new Set()
};
function uid() { return 'b' + (state._uid++); }

function addBlock(type, parentId = null) {
  const def = BLOCK_DEFAULTS[type] || { w: 200, h: 100 };
  const isContainer = (type === 'container');
  const baseOffset = state.blocks.filter(b => !b.parentId).length * 20;

  const b = {
    id: uid(), role: type, name: nextName(type),
    parentId: parentId || null,
    x: isContainer ? (50 + baseOffset) : 0,
    y: isContainer ? (50 + baseOffset) : 0,
    w: def.w, h: def.h,
    fillParent: !isContainer && !!parentId,
    text: type === 'text' ? 'Double-click to edit text'
      : (type === 'button' ? 'Button'
        : (type === 'input' ? 'Input field'
          : (type === 'dropdown' ? 'Select option…' : ''))),
    bgColor: (type === 'container' || type === 'image') ? 'var(--surface)' : null,
    textColor: type === 'button' ? '#ffffff' : 'var(--text)',
    borderColor: 'var(--primary)',
    borderWidth: (type === 'input' || type === 'dropdown' || type === 'table') ? 1 : 0,
    fontId: 'var(--main)', sizeId: type === 'hero' ? 'var(--heading)' : 'var(--body)',
    opacity: 100, bgImage: null,
    bgSize: 'cover', bgScale: 100, bgPosX: 50, bgPosY: 50,
    alignH: (type === 'button' || type === 'icon') ? 'center' : 'left',
    alignV: (type === 'button' || type === 'icon') ? 'center' : 'top',
    iconName: type === 'icon' ? 'camera' : null,
    iconStyleId: 'standard',
    grid: (type === 'table') ? { cols: [50, 50], rows: [50, 50] } : null,
    gridCells: {},
    showGridlines: true,
    aiNotes: '', children: [],
  };
  state.blocks.push(b);
  state.selection = [b.id];
  if (!state.activeStateId && !parentId) state.activeStateId = b.id;
  renderCanvas(); renderSidebar(); renderTree(); renderStateTabs();
}

function renderStateTabs() {
  const container = document.getElementById('frame-tabs');
  if (!container) return;
  const roots = state.blocks.filter(b => !b.parentId);
  if (roots.length <= 1) { container.style.display = 'none'; return; }
  container.style.display = 'flex';
  container.innerHTML = roots.map(root => `
    <div class="frame-tab ${state.activeStateId === root.id ? 'active' : ''}" onclick="setActiveState('${root.id}')">
      ${root.name}
    </div>
  `).join('');
}

function setActiveState(id) {
  state.activeStateId = id;
  renderStateTabs(); renderCanvas(); renderTree(); renderSidebar();
}

function ctxAddBlock(role) {
  if (state.selection.length !== 1) return;
  addBlock(role, state.selection[0]);
  hideCtx();
}

function getBlock(id) { return state.blocks.find(b => b.id === id) || null; }
function getSelected() { return state.selection.length === 1 ? getBlock(state.selection[0]) : null; }

function setProp(key, val) {
  const b = getSelected(); if (!b) return;
  saveHistory();
  b[key] = val;

  // CRITICAL FIX: Structural changes require full re-render
  if (['role', 'parentId', 'grid', 'showGridlines'].includes(key) || b.role === 'table' || b.role === 'cell') {
    renderCanvas();
  } else {
    refreshBlock(b);
  }

  renderTree();
  if (key === 'name') renderStateTabs();
  if (key === 'role') {
    document.getElementById('role-hint').textContent = ROLE_DESC[val] || '';
    applyRoleSections(val);
    renderAllDropdowns();
    buildContainerPresetGrid();
  }
}

function setPropFromSelect(prop, val) {
  const b = getSelected(); if (!b) return;
  saveHistory();
  b[prop] = val || null;

  // CRITICAL FIX: Structural changes require full re-render
  if (['role', 'parentId', 'grid', 'showGridlines'].includes(prop) || b.role === 'table' || b.role === 'cell') {
    renderCanvas();
  } else {
    refreshBlock(b);
  }

  renderTree();
  renderAllDropdowns();
}

function setPropAndPreview(key, val) {
  setProp(key, val);
  updateIconPreview(val);
}

function updateIconPreview(name) {
  const el = document.getElementById('icon-preview'); if (!el) return;
  el.innerHTML = `<i data-lucide="${name || 'camera'}" style="width:28px;height:28px;color:var(--text2)"></i>`;
  if (window.lucide) window.lucide.createIcons({ root: el });
}

function updateIconStyle(styleId) {
  const b = getSelected();
  if (!b) return;
  b.iconStyleId = styleId;
  refreshBlock(b);
  renderSidebar();
}

function applyContainerPreset(w, h) {
  const b = getSelected(); if (!b || b.role !== 'container') return;
  if (w === null) {
    document.getElementById('rs-custom-wh').style.display = '';
    document.getElementById('p-cw').value = b.w;
    document.getElementById('p-ch').value = b.h;
  } else {
    document.getElementById('rs-custom-wh').style.display = 'none';
    b.w = w; b.h = h;
    refreshBlock(b);
    renderSidebar();
  }
}

function applyCustomContainerSize() {
  const b = getSelected(); if (!b) return;
  const w = +document.getElementById('p-cw').value;
  const h = +document.getElementById('p-ch').value;
  if (w > 0) b.w = w;
  if (h > 0) b.h = h;
  refreshBlock(b);
}

function buildContainerPresetGrid() {
  const el = document.getElementById('container-preset-grid'); if (!el) return;
  el.innerHTML = '';
  CONTAINER_PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn-sm';
    btn.innerHTML = `<span style="display:block;font-size:10px;font-weight:500;color:var(--text)">${p.name}</span><span style="font-size:8px;color:var(--text3)">${p.w ? p.w + '×' + p.h : 'custom'}</span>`;
    btn.onclick = () => applyContainerPreset(p.w, p.h);
    el.appendChild(btn);
  });
}

function refreshBlock(b, providedEl = null) {
  const el = providedEl || document.getElementById('bl-' + b.id);
  if (!el) return;

  // ICON LOGIC: Force wrapper to match configured size correctly
  if (b.role === 'icon') {
    const style = state.variables.icons[b.iconStyleId] || state.variables.icons['standard'] || { size: 24, stroke: 2 };
    if (b.w !== style.size || b.h !== style.size) {
      b.w = style.size;
      b.h = style.size;
    }
  }

  // Positioning
  if (b.role === 'cell') {
    el.style.left = (b.xPct ?? 0) + '%'; el.style.top = (b.yPct ?? 0) + '%';
    el.style.width = (b.wPct ?? 100) + '%'; el.style.height = (b.hPct ?? 100) + '%';
    el.style.position = 'absolute';
  } else if (b.fillParent && b.parentId) {
    el.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box';
  } else {
    el.style.position = 'absolute';
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
    el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
  }

  el.style.background = resolveColor(b.bgColor);
  el.style.opacity = (b.opacity ?? 100) / 100;
  el.style.border = b.borderWidth ? `${b.borderWidth}px solid ${resolveColor(b.borderColor)}` : 'none';

  const bgImg = el.querySelector('.block-bg-img');
  if (bgImg) {
    bgImg.style.backgroundImage = b.bgImage ? `url(${b.bgImage})` : 'none';
    const size = b.bgSize === 'scale' ? `${b.bgScale || 100}%` : (b.bgSize || 'cover');
    bgImg.style.backgroundSize = size;
    bgImg.style.backgroundPosition = `${b.bgPosX ?? 50}% ${b.bgPosY ?? 50}%`;
  }

  const cw = el.querySelector('.block-content');
  if (cw) {
    const jm = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const am = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
    cw.style.justifyContent = jm[b.alignH] || 'flex-start';
    cw.style.alignItems = am[b.alignV] || 'flex-start';

    const txt = el.querySelector('.block-text');
    if (txt && !txt.classList.contains('editing')) {
      txt.textContent = b.text;
      txt.style.fontFamily = resolveFont(b.fontId);
      txt.style.fontSize = resolveSize(b.sizeId) + 'px';
      txt.style.color = resolveColor(b.textColor);
      txt.style.textAlign = b.alignH || 'left';
    }

    const iw = el.querySelector('.block-icon-wrap');
    if (iw) {
      const style = state.variables.icons[b.iconStyleId] || state.variables.icons['standard'] || { size: 24, stroke: 2 };
      const size = style.size;
      const stroke = style.stroke;
      const color = resolveColor(b.iconColor || b.textColor || 'var(--text)');

      // Cache check: prevent infinite SVG rebuilding which causes jitter/loss
      const currentSig = `${b.iconName}-${size}-${stroke}-${color}`;
      if (iw.dataset.sig !== currentSig) {
        iw.style.color = color;
        iw.style.width = size + 'px';
        iw.style.height = size + 'px';
        iw.innerHTML = `<i data-lucide="${b.iconName || 'camera'}"></i>`;

        if (window.lucide) {
          window.lucide.createIcons({
            root: iw,
            attrs: {
              'stroke-width': stroke,
              'width': size,
              'height': size
            }
          });
        }
        iw.dataset.sig = currentSig;
      }
    }
  }
  renderGridDOM(el, b);
}

function deleteSelected() {
  const ids = new Set(state.selection);
  function collect(id) { state.blocks.forEach(b => { if (b.parentId === id) { ids.add(b.id); collect(b.id); } }); }
  [...ids].forEach(collect);
  state.blocks = state.blocks.filter(b => !ids.has(b.id));
  state.selection = [];
  renderCanvas(); renderSidebar(); renderTree(); hideCtx();
}

function copySelected() {
  const roots = state.selection.map(id => state.blocks.find(b => b.id === id)).filter(Boolean);
  if (!roots.length) return;

  const toCopy = [];
  const clipboardIds = new Set();

  function collect(b) {
    if (clipboardIds.has(b.id)) return;
    toCopy.push(JSON.parse(JSON.stringify(b)));
    clipboardIds.add(b.id);
    state.blocks.filter(child => child.parentId === b.id).forEach(collect);
  }

  roots.forEach(collect);
  state.clipboard = toCopy;
  showToast(roots.length + ' block(s) copied');
}

function pasteBlocks() {
  if (!state.clipboard.length) return;
  const idMap = {};
  const newBlocks = [];
  const cbIds = new Set(state.clipboard.map(b => b.id));

  state.clipboard.forEach(b => idMap[b.id] = uid());
  const newSelection = [];

  state.clipboard.forEach(b => {
    const nb = JSON.parse(JSON.stringify(b));
    nb.id = idMap[b.id];

    if (!cbIds.has(b.parentId)) {
      nb.x += 20; nb.y += 20;
      nb.parentId = null;
      newSelection.push(nb.id);
    } else {
      nb.parentId = idMap[b.parentId];
    }
    newBlocks.push(nb);
  });

  state.blocks.push(...newBlocks);
  state.selection = newSelection;
  saveHistory();
  renderCanvas(); renderSidebar(); renderTree(); hideCtx();
}

function ctxDuplicate() { copySelected(); pasteBlocks(); }

// ═══════════════════════════════════════════════════
// GRID SYSTEM
// ═══════════════════════════════════════════════════
function applyGrid() {
  const b = getSelected(); if (!b || b.role !== 'table') return;
  saveHistory();
  const cols = parseInt(document.getElementById('g-cols').value) || 1;
  const rows = parseInt(document.getElementById('g-rows').value) || 1;
  const oldCols = b.grid?.cols?.length || 0;
  const oldRows = b.grid?.rows?.length || 0;
  if (cols === oldCols && rows === oldRows) return;

  if (!b.grid) {
    b.grid = { cols: new Array(cols).fill(100 / cols), rows: new Array(rows).fill(100 / rows) };
  } else {
    // Columns logic
    if (cols > oldCols) {
      const added = cols - oldCols; const scale = (100 - (5 * added)) / 100;
      b.grid.cols = b.grid.cols.map(x => x * scale);
      for (let i = 0; i < added; i++) b.grid.cols.push(5);
    } else if (cols < oldCols) {
      b.grid.cols = b.grid.cols.slice(0, cols);
      const sum = b.grid.cols.reduce((acc, x) => acc + x, 0);
      b.grid.cols = b.grid.cols.map(x => x * (100 / sum));
    }
    // Rows logic
    if (rows > oldRows) {
      const added = rows - oldRows; const scale = (100 - (5 * added)) / 100;
      b.grid.rows = b.grid.rows.map(x => x * scale);
      for (let i = 0; i < added; i++) b.grid.rows.push(5);
    } else if (rows < oldRows) {
      b.grid.rows = b.grid.rows.slice(0, rows);
      const sum = b.grid.rows.reduce((acc, x) => acc + x, 0);
      b.grid.rows = b.grid.rows.map(x => x * (100 / sum));
    }
  }
  syncGridCells(b);
  renderCanvas(); renderSidebar(); renderTree();
}

function syncGridCells(b) {
  const rows = b.grid.rows.length;
  const cols = b.grid.cols.length;

  state.blocks = state.blocks.filter(bl => {
    if (bl.role === 'cell' && bl.parentId === b.id) {
      const gp = bl._gridPos || { ri: 0, ci: 0 };
      return gp.ri < rows && gp.ci < cols;
    }
    return true;
  });

  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      let cell = state.blocks.find(bl => bl.role === 'cell' && bl.parentId === b.id && bl._gridPos?.ri === ri && bl._gridPos?.ci === ci);
      const x = b.grid.cols.slice(0, ci).reduce((a, v) => a + v, 0);
      const y = b.grid.rows.slice(0, ri).reduce((a, v) => a + v, 0);
      const w = b.grid.cols[ci];
      const h = b.grid.rows[ri];

      if (!cell) {
        cell = {
          id: uid(), role: 'cell', name: `Cell-${ri}-${ci}`, parentId: b.id,
          xPct: x, yPct: y, wPct: w, hPct: h, x: 0, y: 0, w: 0, h: 0, fillParent: false,
          bgColor: null, textColor: 'var(--text)', borderColor: 'var(--primary)', borderWidth: 0,
          fontId: 'var(--main)', sizeId: 'var(--body)', opacity: 100, bgImage: null,
          alignH: 'left', alignV: 'top', text: '', iconName: null, grid: null, gridCells: {}, aiNotes: '', children: [],
          _gridPos: { ri, ci }
        };
        state.blocks.push(cell);
      } else {
        cell.xPct = x; cell.yPct = y; cell.wPct = w; cell.hPct = h; cell.borderWidth = 0;
      }
      refreshBlock(cell);
    }
  }
}

function updateGridManual(type, index, value) {
  const b = getSelected();
  if (!b || !b.grid) return;
  const val = Math.max(1, parseFloat(value) || 1);
  b.grid[type][index] = val;
  const sum = b.grid[type].reduce((a, v) => a + v, 0);
  if (sum > 0) b.grid[type] = b.grid[type].map(v => (v / sum) * 100);
  syncGridCells(b);
  renderGridDOM(document.getElementById('bl-' + b.id), b);
  renderSidebar();
}

function renderGridDOM(el, b) {
  Array.from(el.children).forEach(ch => {
    if (ch.classList.contains('grid-line') || ch.classList.contains('grid-container')) ch.remove();
  });
  if (!b.grid) return;

  const { cols, rows } = b.grid;
  const gridColor = b.showGridlines !== false ? (resolveColor(b.borderColor || 'var(--primary)') || 'var(--border)') : 'transparent';
  const dividerColor = 'white';

  const gridEl = document.createElement('div');
  gridEl.className = 'grid-container';
  gridEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:grid;pointer-events:none;z-index:2;box-sizing:border-box';
  gridEl.style.gridTemplateColumns = cols.map(c => c + '%').join(' ');
  gridEl.style.gridTemplateRows = rows.map(r => r + '%').join(' ');

  rows.forEach((rh, ri) => cols.forEach((cw, ci) => {
    const c = document.createElement('div');
    c.style.cssText = 'position:relative;pointer-events:auto;';
    c.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); showCellMenu(ev, b, ri, ci, c); });
    gridEl.appendChild(c);
  }));
  el.appendChild(gridEl);

  let currentX = 0;
  for (let i = 0; i < cols.length - 1; i++) {
    currentX += cols[i];
    const line = document.createElement('div');
    line.className = 'grid-line col-line';
    line.style.left = `${currentX}%`;
    line.style.background = dividerColor;
    line.onmousedown = (e) => { e.stopPropagation(); startColDivDrag(e, b, i, el); };
    el.appendChild(line);
  }

  let currentY = 0;
  for (let i = 0; i < rows.length - 1; i++) {
    currentY += rows[i];
    const line = document.createElement('div');
    line.className = 'grid-line row-line';
    line.style.top = `${currentY}%`;
    line.style.background = dividerColor;
    line.onmousedown = (e) => { e.stopPropagation(); startRowDivDrag(e, b, i, el); };
    el.appendChild(line);
  }
}

function startColDivDrag(e, b, i, tableEl) {
  e.stopPropagation(); saveHistory();
  const startX = e.clientX;
  const origA = b.grid.cols[i]; const origB = b.grid.cols[i + 1];

  const onMove = (ev) => {
    const deltaX = (ev.clientX - startX) / (canvasZoom || 1);
    const deltaPct = (deltaX / tableEl.offsetWidth) * 100;
    if (origA + deltaPct > 2 && origB - deltaPct > 2) {
      b.grid.cols[i] = origA + deltaPct; b.grid.cols[i + 1] = origB - deltaPct;
      syncGridCells(b); renderGridDOM(tableEl, b);
    }
  };
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); renderSidebar(); };
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
}

function startRowDivDrag(e, b, i, tableEl) {
  e.stopPropagation(); saveHistory();
  const startY = e.clientY;
  const origA = b.grid.rows[i]; const origB = b.grid.rows[i + 1];

  const onMove = (ev) => {
    const deltaY = (ev.clientY - startY) / (canvasZoom || 1);
    const deltaPct = (deltaY / tableEl.offsetHeight) * 100;
    if (origA + deltaPct > 2 && origB - deltaPct > 2) {
      b.grid.rows[i] = origA + deltaPct; b.grid.rows[i + 1] = origB - deltaPct;
      syncGridCells(b); renderGridDOM(tableEl, b);
    }
  };
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); renderSidebar(); };
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
}

function showCellMenu(e, block, ri, ci, cellEl) {
  hideCtx();
  const key = `${ri},${ci}`;
  if (!block.gridCells) block.gridCells = {};
  const existing = (block.gridCells[key] || {}).blocks;
  const m = document.createElement('div'); m.id = 'cell-menu';
  m.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:4px;z-index:9999;min-width:150px;box-shadow:0 8px 24px rgba(0,0,0,.6)`;
  m.innerHTML = `<div class="ctx-sub-label">Add to cell (${ri},${ci})</div>` +
    ['text', 'button', 'image', 'input', 'dropdown', 'icon'].map(r => `<div class="ctx-item" onclick="addCellBlock('${block.id}',${ri},${ci},'${r}',event)">${r}</div>`).join('') +
    (existing && existing.length ? `<div class="ctx-sep"></div><div class="ctx-item danger" onclick="clearCell('${block.id}',${ri},${ci},event)">Clear cell</div>` : '');
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 10);
}

function addCellBlock(blockId, ri, ci, role, e) {
  e.stopPropagation();
  const b = state.blocks.find(b => b.id === blockId); if (!b || !b.grid) return;
  const key = `${ri},${ci}`;
  if (!b.gridCells) b.gridCells = {};
  if (!b.gridCells[key]) b.gridCells[key] = { blocks: [] };
  const eb = {
    id: uid(), role, name: nextName(role),
    text: role === 'text' ? 'Double-click to edit' : (role === 'button' ? 'Button' : ''),
    bgColor: role === 'button' ? 'vc4' : null, textColor: role === 'button' ? 'vc5' : 'vc3',
    fontId: 'vf1', sizeId: 'vs1', alignH: 'left', alignV: 'top', opacity: 100, bgImage: null
  };
  b.gridCells[key].blocks.push(eb);
  refreshBlock(b);
  document.getElementById('cell-menu')?.remove();
  showToast(role + ' added to cell');
}

function clearCell(blockId, ri, ci, e) {
  e.stopPropagation();
  const b = state.blocks.find(b => b.id === blockId);
  if (b && b.gridCells) { delete b.gridCells[`${ri},${ci}`]; refreshBlock(b); }
  document.getElementById('cell-menu')?.remove();
}

// ═══════════════════════════════════════════════════
// CANVAS RENDERING
// ═══════════════════════════════════════════════════
function renderCanvas() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  canvas.innerHTML = '<div class="canvas-dots"></div><div id="marquee"></div>';

  const roots = state.activeStateId
    ? state.blocks.filter(b => b.id === state.activeStateId)
    : state.blocks.filter(b => !b.parentId);

  roots.forEach(b => canvas.appendChild(buildBlockEl(b)));
  updateSelectionDOM();
}

function buildBlockEl(b) {
  const isSel = state.selection.length === 1 && state.selection[0] === b.id;
  const isMulti = state.selection.length > 1 && state.selection.includes(b.id);
  const el = document.createElement('div');
  el.className = 'block-el' + (b.role === 'cell' ? ' cell-block' : '') + (isSel ? ' selected' : '') + (isMulti ? ' multi-sel' : '');
  el.id = 'bl-' + b.id;

  if (b.bgImage) {
    const bgImg = document.createElement('div'); bgImg.className = 'block-bg-img';
    el.appendChild(bgImg);
  }

  const cw = document.createElement('div'); cw.className = 'block-content';
  if (b.role === 'icon') {
    const iw = document.createElement('div'); iw.className = 'block-icon-wrap';
    cw.appendChild(iw);
  } else {
    const txt = document.createElement('div'); txt.className = 'block-text';
    txt.addEventListener('dblclick', ev => {
      ev.stopPropagation();
      txt.classList.add('editing');
      txt.contentEditable = 'true'; txt.style.userSelect = 'text'; txt.style.webkitUserSelect = 'text';
      txt.focus();
      const range = document.createRange(); range.selectNodeContents(txt);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    });
    txt.addEventListener('blur', () => {
      txt.classList.remove('editing');
      txt.contentEditable = 'false'; txt.style.userSelect = ''; txt.style.webkitUserSelect = '';
      b.text = txt.innerText;
      const pt = document.getElementById('p-text'); if (pt) pt.value = b.text;
    });
    txt.addEventListener('mousedown', ev => { if (txt.contentEditable === 'true') ev.stopPropagation(); });
    cw.appendChild(txt);
  }
  el.appendChild(cw);

  refreshBlock(b, el);

  state.blocks.filter(cb => cb.parentId === b.id).forEach(cb => el.appendChild(buildBlockEl(cb)));

  const ring = document.createElement('div'); ring.className = 'block-sel-ring'; el.appendChild(ring);

  if (b.role === 'container') {
    const rh = document.createElement('div'); rh.className = 'resize-handle';
    rh.addEventListener('mousedown', ev => { ev.stopPropagation(); state.drag = { type: 'resize', id: b.id, sx: ev.clientX, sy: ev.clientY, ow: b.w, oh: b.h }; });
    el.appendChild(rh);
  }

  el.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    const txt = el.querySelector('.block-text.editing');
    if (txt) return;

    // Critical Input Blur fix for notes overriding
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      document.activeElement.blur();
    }

    if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { toggleSel(b.id); }
    else {
      if (!state.selection.includes(b.id)) { state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); }
    }
    saveHistory();
    state.drag = { type: 'move', id: b.id, sx: ev.clientX, sy: ev.clientY, ox: b.x, oy: b.y };
  });

  el.addEventListener('contextmenu', ev => {
    ev.preventDefault(); ev.stopPropagation();
    if (!state.selection.includes(b.id)) { state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); }
    showCtx(ev.clientX, ev.clientY);
  });

  return el;
}

function toggleSel(id) {
  const i = state.selection.indexOf(id);
  if (i >= 0) state.selection.splice(i, 1); else state.selection.push(id);
  updateSelectionDOM(); renderSidebar(); renderTree();
}

function updateSelectionDOM() {
  document.querySelectorAll('.block-el').forEach(el => {
    el.classList.remove('selected', 'multi-sel');
    const id = el.id.replace('bl-', '');
    if (state.selection.length === 1 && state.selection[0] === id) el.classList.add('selected');
    else if (state.selection.length > 1 && state.selection.includes(id)) el.classList.add('multi-sel');
  });
}

// ═══════════════════════════════════════════════════
// DRAG & SELECTION
// ═══════════════════════════════════════════════════
function onCanvasDown(e) {
  // Sync uncommitted input fields (fixes "AI Notes not saving" bug)
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
    document.activeElement.blur();
  }

  hideCtx();
  const isCanvas = e.target.id === 'canvas-wrap' || e.target.id === 'canvas' || e.target.classList.contains('canvas-dots');
  if (isCanvas) {
    if (!e.shiftKey) { state.selection = []; updateSelectionDOM(); renderSidebar(); }
    const wrap = document.getElementById('canvas-wrap'), r = wrap.getBoundingClientRect();
    state.mq = { active: true, sx: (e.clientX - r.left + wrap.scrollLeft) / canvasZoom, sy: (e.clientY - r.top + wrap.scrollTop) / canvasZoom };
    document.getElementById('marquee').style.cssText = 'display:none';
  }
}

function onCanvasMove(e) {
  if (state.drag) {
    const b = getBlock(state.drag.id); if (!b) return;
    const dx = (e.clientX - state.drag.sx) / canvasZoom, dy = (e.clientY - state.drag.sy) / canvasZoom;

    if (state.drag.type === 'move') {
      b.x = Math.max(0, state.drag.ox + dx); b.y = Math.max(0, state.drag.oy + dy);
      if (state.selection.length > 1) {
        state.selection.forEach(id => { if (id === state.drag.id) return; const ob = getBlock(id); if (ob && ob.role === 'container') { ob.x = Math.max(0, ob.x + (b.x - (state.drag.ox))); ob.y = Math.max(0, ob.y + (b.y - (state.drag.oy))); refreshBlock(ob); } });
      }
    } else {
      if (b.role === 'icon') return; // Do not resize icons via drag (controlled by style props)
      b.w = Math.max(16, state.drag.ow + dx);
      b.h = Math.max(16, state.drag.oh + dy);
    }
    refreshBlock(b);
    if (state.selection.length === 1) {
      const px = document.getElementById('p-x'); if (px) px.value = Math.round(b.x);
      const py = document.getElementById('p-y'); if (py) py.value = Math.round(b.y);
    }
    return;
  }
  if (state.mq.active) {
    const wrap = document.getElementById('canvas-wrap'), r = wrap.getBoundingClientRect();
    const cx = (e.clientX - r.left + wrap.scrollLeft) / canvasZoom, cy = (e.clientY - r.top + wrap.scrollTop) / canvasZoom;
    const mx = Math.min(cx, state.mq.sx), my = Math.min(cy, state.mq.sy), mw = Math.abs(cx - state.mq.sx), mh = Math.abs(cy - state.mq.sy);
    if (mw > 4 || mh > 4) {
      const mqEl = document.getElementById('marquee');
      mqEl.style.cssText = `display:block;left:${mx}px;top:${my}px;width:${mw}px;height:${mh}px`;
    }
  }
}

function onCanvasUp(e) {
  if (state.mq.active) {
    state.mq.active = false;
    const mqEl = document.getElementById('marquee');
    if (mqEl.style.display === 'block') {
      const mx = parseInt(mqEl.style.left), my = parseInt(mqEl.style.top), mw = parseInt(mqEl.style.width), mh = parseInt(mqEl.style.height);
      const found = state.blocks.filter(b => {
        if (b.parentId) return false;
        return b.x < mx + mw && b.x + b.w > mx && b.y < my + mh && b.y + b.h > my;
      }).map(b => b.id);
      if (found.length) { state.selection = found; updateSelectionDOM(); renderSidebar(); renderTree(); }
      mqEl.style.display = 'none';
    }
  }
  state.drag = null;
}
document.addEventListener('mouseup', () => { state.drag = null; });

// ═══════════════════════════════════════════════════
// SIDEBAR PANELS
// ═══════════════════════════════════════════════════
function renderSidebar() {
  const ns = document.getElementById('no-sel'), mp = document.getElementById('multi-sel-panel'), pp = document.getElementById('props-panel');
  const n = state.selection.length;
  ns.style.display = n === 0 ? 'block' : 'none';
  mp.style.display = n > 1 ? 'block' : 'none';
  pp.style.display = n === 1 ? 'flex' : 'none';
  if (n > 1) { document.getElementById('multi-count').textContent = n; return; }
  if (n === 0) return;
  const b = getSelected(); if (!b) return;

  document.getElementById('p-name').value = b.name || '';
  document.getElementById('p-role').value = b.role || 'container';
  document.getElementById('role-hint').textContent = ROLE_DESC[b.role] || '';

  const px = document.getElementById('p-x'); if (px) px.value = Math.round(b.x);
  const py = document.getElementById('p-y'); if (py) py.value = Math.round(b.y);

  const pop = document.getElementById('p-opacity'); if (pop) pop.value = b.opacity ?? 100;
  const pov = document.getElementById('opacity-val'); if (pov) pov.textContent = (b.opacity ?? 100) + '%';

  const pn = document.getElementById('p-notes'); if (pn) pn.value = b.aiNotes || '';
  const pbw = document.getElementById('p-border-w'); if (pbw) pbw.value = b.borderWidth || 0;

  const idzn = document.getElementById('img-drop-zone'); if (idzn) idzn.textContent = b.bgImage ? '(image loaded)' : 'Click to upload';
  const pSize = document.getElementById('p-bgSize'); if (pSize) pSize.value = b.bgSize || 'cover';
  const pScale = document.getElementById('p-bgScale'); if (pScale) { pScale.value = b.bgScale || 100; pScale.nextElementSibling.textContent = pScale.value + '%'; }
  const pPosX = document.getElementById('p-bgPosX'); if (pPosX) { pPosX.value = b.bgPosX ?? 50; pPosX.nextElementSibling.textContent = pPosX.value + '%'; }
  const pPosY = document.getElementById('p-bgPosY'); if (pPosY) { pPosY.value = b.bgPosY ?? 50; pPosY.nextElementSibling.textContent = pPosY.value + '%'; }

  if (b.grid) {
    document.getElementById('g-cols').value = b.grid.cols.length;
    document.getElementById('g-rows').value = b.grid.rows.length;
    document.getElementById('grid-col-inputs').innerHTML = b.grid.cols.map((w, i) => `<input class="r-input" type="number" style="width:40px" value="${Math.round(w)}" onchange="updateGridManual('cols', ${i}, this.value)">`).join('');
    document.getElementById('grid-row-inputs').innerHTML = b.grid.rows.map((h, i) => `<input class="r-input" type="number" style="width:40px" value="${Math.round(h)}" onchange="updateGridManual('rows', ${i}, this.value)">`).join('');
  } else {
    document.getElementById('g-cols').value = '';
    document.getElementById('g-rows').value = '';
  }

  const ptxt = document.getElementById('p-text'); if (ptxt) ptxt.value = b.text || '';
  const picn = document.getElementById('p-icon'); if (picn) picn.value = b.iconName || '';
  updateIconPreview(b.iconName);

  ['left', 'center', 'right'].forEach(a => document.getElementById('ah-' + a)?.classList.toggle('active', b.alignH === a));
  ['top', 'center', 'bottom'].forEach(a => document.getElementById('av-' + a)?.classList.toggle('active', b.alignV === a));

  // Dropdown Options
  if (b.role === 'dropdown') {
    if (!b.dropdownOptions) b.dropdownOptions = [];
    const list = document.getElementById('dropdown-options-list');
    if (list) {
      list.innerHTML = b.dropdownOptions.map((opt, i) => `
        <div style="background: var(--surface3); padding: 8px; margin-bottom: 8px; border-radius: 4px; border: 1px solid var(--border2);">
          <input type="text" class="r-input" value="${opt.label || ''}" placeholder="Label (e.g. Settings)" onchange="updateDropdownOpt(${i}, 'label', this.value)" style="margin-bottom: 4px; width: 100%;">
          <div style="display: flex; gap: 4px; margin-bottom: 4px;">
            <input type="text" class="r-input" value="${opt.icon || ''}" placeholder="Icon (e.g. gear)" onchange="updateDropdownOpt(${i}, 'icon', this.value)" style="width: 50%;">
            <input type="text" class="r-input" value="${opt.action || ''}" placeholder="Action/Link" onchange="updateDropdownOpt(${i}, 'action', this.value)" style="width: 50%;">
          </div>
          <textarea class="r-input" placeholder="AI Notes" onchange="updateDropdownOpt(${i}, 'aiNote', this.value)" style="width: 100%; height: 40px; resize: none;">${opt.aiNote || ''}</textarea>
          <button class="tb-btn red" onclick="removeDropdownOpt(${i})" style="width: 100%; margin-top: 4px; font-size:9px">Remove Option</button>
        </div>
      `).join('');
    }
  }

  applyRoleSections(b.role);
  renderAllDropdowns();
  if (b.role === 'container') buildContainerPresetGrid();
}

function addDropdownOpt() {
  const b = getSelected(); if (!b) return;
  if (!b.dropdownOptions) b.dropdownOptions = [];
  b.dropdownOptions.push({ label: '', icon: '', action: '', aiNote: '' });
  saveHistory(); renderSidebar();
}
function updateDropdownOpt(i, field, val) {
  const b = getSelected(); if (!b || !b.dropdownOptions[i]) return;
  b.dropdownOptions[i][field] = val;
  saveHistory();
}
function removeDropdownOpt(i) {
  const b = getSelected(); if (!b || !b.dropdownOptions) return;
  b.dropdownOptions.splice(i, 1);
  saveHistory(); renderSidebar();
}

function deleteCurrentState() {
  const roots = state.blocks.filter(b => !b.parentId);
  if (roots.length <= 1) { showToast('Cannot delete the last remaining state.'); return; }
  const idToDelete = state.activeStateId;
  if (!idToDelete) return;
  if (!confirm('Are you sure you want to delete this state?')) return;
  const remainingRoots = roots.filter(r => r.id !== idToDelete);
  state.activeStateId = remainingRoots[0].id;
  const toDelete = new Set();
  function collect(id) {
    toDelete.add(id);
    state.blocks.forEach(b => { if (b.parentId === id) collect(b.id); });
  }
  collect(idToDelete);
  state.blocks = state.blocks.filter(b => !toDelete.has(b.id));
  saveHistory(); renderStateTabs(); renderCanvas(); renderSidebar(); renderTree();
  showToast('State deleted');
}

function renderTree() {
  const container = document.getElementById('tree-content');
  if (!container) return;
  container.innerHTML = '';

  function addItem(b, depth) {
    const item = document.createElement('div');
    item.className = `tree-item ${state.selection.includes(b.id) ? 'active' : ''}`;
    item.style.paddingLeft = (depth * 12 + 4) + 'px';
    item.onclick = (e) => { e.stopPropagation(); state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); };
    item.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); showCtx(e.clientX, e.clientY); };

    const isCollapsed = state.collapsedIds.has(b.id);
    const children = state.blocks.filter(c => c.parentId === b.id);
    const hasChildren = children.length > 0;

    item.innerHTML = `
      <span class="tree-arrow" onclick="toggleCollapse('${b.id}', event)" style="visibility:${hasChildren ? 'visible' : 'hidden'}">
        ${isCollapsed ? '▸' : '▾'}
      </span>
      <span class="tree-icon">${getIconForRole(b.role)}</span>
      <span class="tree-label">${b.name}</span>
    `;
    container.appendChild(item);

    if (!isCollapsed) {
      children.forEach(c => addItem(c, depth + 1));
    }
  }

  const roots = state.activeStateId ? state.blocks.filter(b => b.id === state.activeStateId) : state.blocks.filter(b => !b.parentId);
  roots.forEach(b => addItem(b, 0));
}

function toggleCollapse(id, e) {
  e.stopPropagation();
  if (state.collapsedIds.has(id)) state.collapsedIds.delete(id); else state.collapsedIds.add(id);
  renderTree();
}

function getIconForRole(role) {
  const map = { table: '⊞', container: '▢', text: 'T', image: '🖼', button: '▭', input: '⌨', icon: '★', cell: '▫' };
  return map[role] || '•';
}

function showCtx(x, y) {
  const b = getSelected(); if (!b) return;
  const menu = document.getElementById('ctx-menu');
  menu.style.display = 'block'; menu.style.left = x + 'px'; menu.style.top = y + 'px';
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 40) { menu.style.left = (window.innerWidth - rect.width - 20) + 'px'; menu.classList.add('flip-left'); } else { menu.classList.remove('flip-left'); }
  if (y + rect.height > window.innerHeight - 40) menu.style.top = (window.innerHeight - rect.height - 20) + 'px';
}
function hideCtx() { document.getElementById('ctx-menu').style.display = 'none'; }
document.addEventListener('click', hideCtx);

function handleBgImage(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { const b = getSelected(); if (!b) return; b.bgImage = ev.target.result; document.getElementById('img-drop-zone').textContent = file.name; refreshBlock(b); };
  reader.readAsDataURL(file);
}
function clearBgImage() { const b = getSelected(); if (!b) return; b.bgImage = null; document.getElementById('img-drop-zone').textContent = 'Click to upload'; refreshBlock(b); }

// ═══════════════════════════════════════════════════
// EXPORTS & PROJECT LOGIC
// ═══════════════════════════════════════════════════
let currentProjectName = null;

function ctxEditNewState() {
  const b = getSelected(); if (!b) return;
  saveHistory();

  const idMap = {}; const newBlocks = []; const cbIds = new Set();
  function collectRecursive(targetId) {
    cbIds.add(targetId); idMap[targetId] = uid();
    state.blocks.filter(c => c.parentId === targetId).forEach(c => collectRecursive(c.id));
  }
  collectRecursive(b.id);

  cbIds.forEach(oldId => {
    const original = state.blocks.find(x => x.id === oldId);
    const nb = JSON.parse(JSON.stringify(original));
    nb.id = idMap[oldId];
    if (oldId === b.id) {
      nb.parentId = null;
      const currentRoot = state.blocks.find(x => x.id === state.activeStateId) || b;
      nb.x = (currentRoot.x + currentRoot.w + 200); nb.y = currentRoot.y; nb.name = nb.name + ' (New State)';
    } else { nb.parentId = idMap[original.parentId]; }
    newBlocks.push(nb);
  });

  state.blocks.push(...newBlocks);
  state.activeStateId = idMap[b.id];
  state.selection = [idMap[b.id]];
  renderCanvas(); renderSidebar(); renderTree(); renderStateTabs(); hideCtx();
  showToast('State branch created: ' + b.name);
}

function newProject() {
  if (!confirm('Start a new project?')) return;
  saveHistory();
  state.blocks = []; state.selection = []; state.activeStateId = null; state._uid = 1;
  Object.keys(COUNTERS).forEach(k => delete COUNTERS[k]); currentProjectName = null;
  renderCanvas(); renderSidebar(); renderTree(); renderStateTabs(); showToast('New project');
}

function saveProject() {
  const name = currentProjectName || prompt('Project name:', 'my-layout');
  if (!name) return;
  currentProjectName = name;
  _doSave(name);
}

function saveProjectAs() {
  const name = prompt('Save as:', currentProjectName || 'my-layout');
  if (!name) return;
  currentProjectName = name;
  _doSave(name);
}

function _doSave(name) {
  const data = {
    meta: { tool: 'layout-designer-v4', savedAt: new Date().toISOString(), name },
    vars: JSON.parse(JSON.stringify(state.variables)),
    state: { blocks: state.blocks, _uid: state._uid },
  };
  download(JSON.stringify(data, null, 2), name.replace(/\s+/g, '-') + '.layout.json'); showToast('Saved: ' + name);
}

function openProject() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.layout.json,.json';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.state && d.state.blocks) {
          if (d.vars) state.variables = d.vars;
          state.blocks = d.state.blocks; state._uid = d.state._uid || state._uid; state.selection = [];
          currentProjectName = d.meta?.name || file.name.replace('.layout.json', '');
          renderVars(); renderAllDropdowns(); renderCanvas(); renderSidebar(); renderTree();
          showToast('Opened: ' + currentProjectName);
        } else { showToast('Not a valid layout file'); }
      } catch { showToast('Invalid file'); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

function triggerImportJSON() { document.getElementById('import-input-hidden').click(); }
function triggerImport() { triggerImportJSON(); }

function exportContainerJSON() {
  const b = getSelected();
  if (!b) { showToast('Select a container first'); return; }
  function collectWithChildren(id) {
    const block = state.blocks.find(x => x.id === id); if (!block) return [];
    return [block, ...state.blocks.filter(c => c.parentId === id).flatMap(c => collectWithChildren(c.id))];
  }
  const blocks = collectWithChildren(b.id);
  const comp = {
    meta: { tool: 'layout-designer-v4', exportedAt: new Date().toISOString(), type: 'component' },
    vars: JSON.parse(JSON.stringify(state.variables)),
    frame: { name: b.name, blocks: JSON.parse(JSON.stringify(blocks)) },
  };
  download(JSON.stringify(comp, null, 2), (b.name || 'component').replace(/\s+/g, '-') + '.component.json'); showToast('Exported: ' + b.name);
}

function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { try { const c = JSON.parse(ev.target.result); if (!c.frame) throw 0; if (!components.find(x => x.id === c.id)) { components.push(c); localStorage.setItem('ld4-components', JSON.stringify(components)); } dropComponent(c); renderComponents(); showToast('Imported: ' + c.frame.name); } catch { showToast('Invalid file'); } };
  reader.readAsText(file); e.target.value = '';
}

function dropComponent(comp) {
  comp.frame.blocks.forEach(b => { const nb = { ...JSON.parse(JSON.stringify(b)), id: uid(), parentId: null }; state.blocks.push(nb); });
  renderCanvas(); renderTree();
}

function renderComponents() {
  const el = document.getElementById('comp-list'); if (!el) return;
  if (!components.length) { el.innerHTML = '<div style="color:var(--text3);font-size:9px;padding:4px 2px;line-height:1.7">No saved components.</div>'; return; }
  el.innerHTML = '';
  components.forEach((c, i) => {
    const d = document.createElement('div'); d.className = 'comp-item';
    d.innerHTML = `<div style="flex:1"><div style="font-size:10px;color:var(--text)">${c.name}</div><div style="font-size:8px;color:var(--text3)">${c.frame?.blocks?.length || 0} blocks</div></div><button class="tb-btn" style="font-size:8px;padding:2px 6px" onclick="dropComponent(components[${i}]);showToast('Dropped')">Use</button><span style="color:var(--text3);font-size:12px;cursor:pointer;padding:0 2px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'" onclick="delComp(${i})">×</span>`;
    el.appendChild(d);
  });
}
function delComp(i) { components.splice(i, 1); localStorage.setItem('ld4-components', JSON.stringify(components)); renderComponents(); }

// ═══════════════════════════════════════════════════
// DATA EXPORTS
// ═══════════════════════════════════════════════════
function exportJSON() {
  const output = {
    meta: { tool: 'layout-designer-v4', exportedAt: new Date().toISOString(), description: 'Wireframe export.' },
    designVariables: {
      colors: Object.entries(state.variables.colors).map(([k, v]) => ({ name: k, cssVar: `--${k}`, value: v })),
      fonts: Object.entries(state.variables.fonts).map(([k, v]) => ({ name: k, cssVar: `--font-${k}`, value: v })),
      fontSizes: Object.entries(state.variables.sizes).map(([k, v]) => ({ name: k, cssVar: `--size-${k}`, value: v, unit: 'px' }))
    },
    canvas: { tree: buildExportTree(state.blocks.filter(b => !b.parentId), state.blocks) },
  };
  download(JSON.stringify(output, null, 2), 'layout-' + Date.now() + '.json');
  showToast('JSON exported');
}

function exportForAI() {
  const lines = [];
  lines.push('# UI LAYOUT SPEC');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('# This file is a machine-readable layout guide. Use it to build consistent UI.\n');

  lines.push('## DESIGN TOKENS');
  lines.push('### Colors');
  Object.entries(state.variables.colors).forEach(([k, v]) => lines.push(`  ${k}: ${v}  /* var(--${k}) */`));
  lines.push('### Fonts');
  Object.entries(state.variables.fonts).forEach(([k, v]) => lines.push(`  ${k}: ${v}  /* var(--font-${k}) */`));
  lines.push('### Font Sizes');
  Object.entries(state.variables.sizes).forEach(([k, v]) => lines.push(`  ${k}: ${v}px  /* var(--size-${k}) */`));

  lines.push('\n## CSS VARIABLES (copy into :root)');
  lines.push(':root {');
  Object.entries(state.variables.colors).forEach(([k, v]) => lines.push(`  --${k}: ${v};`));
  Object.entries(state.variables.fonts).forEach(([k, v]) => lines.push(`  --font-${k}: ${v};`));
  Object.entries(state.variables.sizes).forEach(([k, v]) => lines.push(`  --size-${k}: ${v}px;`));
  lines.push('}\n');

  lines.push('## CANVAS BLOCKS');
  const roots = state.blocks.filter(b => !b.parentId);

  function getVarName(val) {
    if (val && val.startsWith('var(--') && val.endsWith(')')) return val.slice(6, -1);
    return null;
  }

  function describeBlock(b, indent = 0) {
    const pad = '  '.repeat(indent);
    const bgV = getVarName(b.bgColor); const txtV = getVarName(b.textColor); const fntV = getVarName(b.fontId); const szV = getVarName(b.sizeId);

    lines.push(`${pad}[${b.role.toUpperCase()}] "${b.name}"`);
    lines.push(`${pad}  position: x=${Math.round(b.x)} y=${Math.round(b.y)}, size: ${Math.round(b.w)}×${Math.round(b.h)}px${b.fillParent ? ' (fills parent)' : ''}`);
    lines.push(`${pad}  background: ${bgV ? `var(--${bgV})` : (b.bgColor || 'transparent')}`);
    lines.push(`${pad}  text-color: ${txtV ? `var(--${txtV})` : (b.textColor || 'inherit')}`);
    lines.push(`${pad}  font: ${fntV ? `var(--font-${fntV})` : (b.fontId || 'inherit')} / ${szV ? `var(--size-${szV})px` : `${b.sizeId || 12}px`}`);
    lines.push(`${pad}  text-align: ${b.alignH || 'left'}, valign: ${b.alignV || 'top'}`);

    if (b.borderWidth) lines.push(`${pad}  border: ${b.borderWidth}px solid ${getVarName(b.borderColor) ? `var(--${getVarName(b.borderColor)})` : b.borderColor}`);
    if (b.opacity !== undefined && b.opacity !== 100) lines.push(`${pad}  opacity: ${b.opacity}%`);
    if (b.text) lines.push(`${pad}  content: "${b.text}"`);
    if (b.iconName) lines.push(`${pad}  icon: ${b.iconName}`);
    if (b.aiNotes) lines.push(`${pad}  AI_NOTES: ${b.aiNotes}`);

    if (b.grid) {
      lines.push(`${pad}  grid: ${b.grid.cols.length} cols × ${b.grid.rows.length} rows`);
      lines.push(`${pad}  col-widths: [${b.grid.cols.map(v => Math.round(v) + '%').join(', ')}]`);
      lines.push(`${pad}  row-heights: [${b.grid.rows.map(v => Math.round(v) + '%').join(', ')}]`);
    }
    const children = state.blocks.filter(c => c.parentId === b.id);
    children.forEach(c => describeBlock(c, indent + 1));
  }
  roots.forEach(b => describeBlock(b, 0));

  lines.push('\n## IMPLEMENTATION GUIDANCE');
  lines.push('- All colors must be applied via CSS variables only (never hardcoded hex)');
  lines.push('- Font families must be applied via CSS variables only');
  lines.push('- AI_NOTES describe behavioral requirements and interactions');
  lines.push('- Blocks with fillParent=true must be width:100%; height:100% of their parent');

  download(lines.join('\n'), 'layout-ai-' + Date.now() + '.txt');
  showToast('AI Export downloaded');
}

function buildExportTree(blocks, allBlocks) {
  return blocks.map(b => ({
    id: b.id, name: b.name, role: b.role, roleDescription: ROLE_DESC[b.role] || '',
    position: { x: Math.round(b.x), y: Math.round(b.y) },
    size: { w: Math.round(b.w), h: Math.round(b.h) },
    fillParent: !!b.fillParent,
    style: {
      backgroundColor: b.bgColor, backgroundColorValue: resolveColor(b.bgColor),
      textColor: b.textColor, textColorValue: resolveColor(b.textColor),
      borderColor: b.borderColor, borderColorValue: resolveColor(b.borderColor),
      borderWidth: b.borderWidth || 0,
      font: b.fontId, fontValue: resolveFont(b.fontId),
      fontSize: b.sizeId, fontSizeValue: resolveSize(b.sizeId),
      opacity: b.opacity ?? 100, textAlign: b.alignH || 'left', verticalAlign: b.alignV || 'top',
    },
    text: b.text || '', icon: b.iconName || '', aiNotes: b.aiNotes || '',
    grid: b.grid ? {
      columns: b.grid.cols.map((w, i) => ({ index: i, widthPx: Math.round(w), pct: Math.round(w / b.w * 1000) / 10 })),
      rows: b.grid.rows.map((h, i) => ({ index: i, heightPx: Math.round(h), pct: Math.round(h / b.h * 1000) / 10 }))
    } : null,
    children: buildExportTree(allBlocks.filter(c => c.parentId === b.id), allBlocks),
  }));
}

function download(content, filename) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
}

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

document.addEventListener('keydown', e => {
  const editing = e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (editing) return;
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.key === 'Escape') { state.selection = []; updateSelectionDOM(); renderSidebar(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); ctxDuplicate(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'v') { e.preventDefault(); pasteBlocks(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); state.selection = state.blocks.map(b => b.id); updateSelectionDOM(); renderSidebar(); renderTree(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
});

function init() {
  renderVars();
  renderLeftVars();
  renderComponents();
  renderCanvas();
  renderStateTabs();
  applyZoom();
}
init();