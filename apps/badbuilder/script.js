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
  if (!undoStack.length) { showToast("Nothing to undo"); return; }
  const current = { blocks: JSON.parse(JSON.stringify(state.blocks)), variables: JSON.parse(JSON.stringify(state.variables)), selection: [...state.selection], activeStateId: state.activeStateId, _uid: state._uid };
  redoStack.push(current);
  const prev = undoStack.pop();
  prev.collapsedIds = new Set(prev.collapsedIds || []);
  Object.assign(state, prev);
  renderCanvas(); renderSidebar(); renderTree(); renderVars(); renderStateTabs();
  showToast("Undo");
}

function redo() {
  if (!redoStack.length) { showToast("Nothing to redo"); return; }
  const current = { blocks: JSON.parse(JSON.stringify(state.blocks)), variables: JSON.parse(JSON.stringify(state.variables)), selection: [...state.selection], activeStateId: state.activeStateId, _uid: state._uid };
  undoStack.push(current);
  const next = redoStack.pop();
  Object.assign(state, next);
  renderCanvas(); renderSidebar(); renderTree(); renderVars(); renderStateTabs();
  showToast("Redo");
}

function applyZoom() {
  const canvas = document.getElementById("canvas");
  if (canvas) canvas.style.transform = `scale(${canvasZoom})`;
  const label = document.getElementById("zoom-label");
  if (label) label.textContent = Math.round(canvasZoom * 100) + "%";
  updateSelectionDOM();
}

function changeZoom(delta) { canvasZoom = Math.min(3, Math.max(0.1, canvasZoom + delta)); applyZoom(); }
function setZoom(val) { canvasZoom = val; applyZoom(); }

document.getElementById("canvas-wrap")?.addEventListener("wheel", e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    canvasZoom = Math.min(3, Math.max(0.1, canvasZoom - e.deltaY * 0.002));
    applyZoom();
  }
}, { passive: false });

// ═══════════════════════════════════════════════════
// ATOMIC ROLE CONFIGURATIONS
// ═══════════════════════════════════════════════════
const ROLE_DESC = {
  container: "Structural box. Can flow normally or overlay absolute. Holds everything.",
  table: "Grid engine. Master control over inner cell gridlines and patterns.",
  cell: "Auto-sized grid content area. Add background images or colors here.",
  object: "Content primitive. Configure Text, Icon, Tooltips, and Links below.",
};

const CONTAINER_PRESETS = [
  { name: "Desktop", w: 1440, h: 900 },
  { name: "Laptop", w: 1280, h: 800 },
  { name: "Tablet", w: 768, h: 1024 },
  { name: "Mobile", w: 390, h: 844 },
  { name: "Modal", w: 480, h: 320 },
  { name: "Custom", w: null, h: null },
];

const ROLE_SECTIONS = {
  container: ["rs-identity", "rs-layout-flow", "rs-container-presets", "rs-position", "rs-bg", "rs-border", "rs-opacity", "rs-bgimage", "rs-notes"],
  table: ["rs-identity", "rs-layout-flow", "rs-bg", "rs-table-styling", "rs-opacity", "rs-grid", "rs-notes"],
  cell: ["rs-identity", "rs-bg", "rs-opacity", "rs-bgimage", "rs-notes"],
  object: ["rs-identity", "rs-layout-flow", "rs-object-config", "rs-text-color", "rs-typography", "rs-opacity", "rs-notes"]
};

function applyRoleSections(role) {
  const show = new Set(ROLE_SECTIONS[role] || ROLE_SECTIONS.container);
  ["rs-identity", "rs-layout-flow", "rs-container-presets", "rs-position", "rs-bg", "rs-border", "rs-table-styling", "rs-opacity", "rs-bgimage", "rs-grid", "rs-object-config", "rs-text-color", "rs-typography", "rs-notes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show.has(id) ? "" : "none";
  });
}

// ═══════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════
function addVar(type, name, value) {
  const def = { colors: "#7c6bff", fonts: "sans-serif", sizes: "14", icons: { size: 24, stroke: 2, color: "var(--primary)" } };
  const varName = name || (type === "icons" ? "new-style" : "new-var");
  state.variables[type][varName] = value ?? def[type];
  renderVars(); renderAllDropdowns();
}

function removeVar(type, name) { delete state.variables[type][name]; renderVars(); renderAllDropdowns(); }

function updateVar(type, oldName, newName, value) {
  if (oldName !== newName) { state.variables[type][newName] = state.variables[type][oldName]; delete state.variables[type][oldName]; }
  if (value !== undefined) state.variables[type][newName] = value;
}

function getTypedVarOptions(type, currentValue) {
  const vars = state.variables[type] || {};
  let options = `<option value="">Transparent / None</option>`;
  Object.keys(vars).forEach(name => {
    const val = type === "icons" ? name : `var(--${name})`;
    const selected = currentValue === val || currentValue === name ? "selected" : "";
    options += `<option value="${val}" ${selected}>${name}</option>`;
  });
  return options;
}

function resolveColor(ref) {
  if (!ref || ref === "null" || ref === null) return "transparent";
  if (ref.startsWith("var(--") && ref.endsWith(")")) { const name = ref.slice(6, -1); return state.variables.colors[name] || state.variables.colors["primary"] || ref; }
  return state.variables.colors[ref] || ref;
}

function resolveFont(ref) {
  if (ref && ref.startsWith("var(--")) { const name = ref.slice(6, -1); return state.variables.fonts[name] || "'Inter', sans-serif"; }
  return state.variables.fonts[ref] || ref || "'Inter', sans-serif";
}

function resolveSize(ref) {
  if (ref && typeof ref === "string" && ref.startsWith("var(--")) { const name = ref.slice(6, -1); return parseFloat(state.variables.sizes[name]) || 12; }
  return parseFloat(state.variables.sizes[ref]) || (typeof ref === "number" ? ref : 12);
}

function renderVars() {
  ["colors", "fonts", "sizes", "icons"].forEach(type => {
    const el = document.getElementById("left-var-list-" + type); if (!el) return;
    el.innerHTML = "";
    const vars = state.variables[type];
    Object.keys(vars).forEach(name => {
      const val = vars[name];
      const row = document.createElement("div"); row.className = "var-item";
      if (type === "colors") {
        row.innerHTML = `<div class="var-swatch" style="background:${val}"><input type="color" value="${val}" oninput="state.variables.colors['${name}']=this.value; renderCanvas()" onchange="renderVars()"></div><div class="var-item-name"><input value="${name}" onchange="updateVar('colors', '${name}', this.value); renderVars(); renderAllDropdowns()"></div><span class="var-del" onclick="removeVar('colors','${name}')">×</span>`;
      } else if (type === "icons") {
        row.innerHTML = `<div class="var-item-name"><input value="${name}" onchange="updateVar('icons', '${name}', this.value); renderVars(); renderAllDropdowns()"></div><div style="display:flex; gap:4px; align-items:center"><input type="number" style="width:30px" value="${val.size}" oninput="state.variables.icons['${name}'].size=+this.value; renderCanvas()" title="Size"><input type="number" step="0.5" style="width:30px" value="${val.stroke}" oninput="state.variables.icons['${name}'].stroke=+this.value; renderCanvas()" title="Stroke"></div><span class="var-del" onclick="removeVar('icons','${name}')">×</span>`;
      } else {
        row.innerHTML = `<div class="var-item-name"><input value="${name}" onchange="updateVar('${type}', '${name}', this.value); renderVars(); renderAllDropdowns()"></div><input class="var-size-val" value="${val}" oninput="state.variables['${type}']['${name}']=this.value; renderCanvas()" onchange="renderVars()"><span class="var-del" onclick="removeVar('${type}','${name}')">×</span>`;
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
  populateTypedSelect("p-bgColor", "colors", b?.bgColor, true);
  populateTypedSelect("p-borderColor", "colors", b?.borderColor, false);
  populateTypedSelect("p-tableBorderColor", "colors", b?.borderColor, false);
  populateTypedSelect("p-innerGridColor", "colors", b?.innerGridColor, false);
  populateTypedSelect("p-textColor", "colors", b?.textColor, false);
  populateTypedSelect("p-fontId", "fonts", b?.fontId, false);
  populateTypedSelect("p-sizeId", "sizes", b?.sizeId, false);
  populateTypedSelect("p-iconStyle", "icons", b?.iconStyleId, false);
}

// ═══════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════
function switchLeft(tab) {
  ["layers", "components", "vars"].forEach(t => {
    document.getElementById("ltab-" + t)?.classList.toggle("active", t === tab);
    document.getElementById("lpane-" + t)?.classList.toggle("active", t === tab);
  });
}
function switchRight(tab) { document.getElementById("rtab-props")?.classList.add("active"); document.getElementById("rpane-props")?.classList.add("active"); }

// ═══════════════════════════════════════════════════
// GLOBAL STATE & BLOCKS
// ═══════════════════════════════════════════════════
const COUNTERS = {};
function nextName(role) { COUNTERS[role] = (COUNTERS[role] || 0) + 1; return role[0].toUpperCase() + role.slice(1) + "-" + COUNTERS[role]; }
let components = [];

let state = {
  blocks: [],
  selection: [],
  clipboard: [],
  _uid: 1,
  drag: null,
  mq: { active: false, sx: 0, sy: 0 },
  variables: {
    colors: { "background": "#0e0e0f", "surface": "#18181a", "primary": "#7c6bff" },
    fonts: { "main": "'Inter', sans-serif" },
    sizes: { "body": "12" },
    icons: { "standard": { size: 20, stroke: 2, color: "var(--primary)" } }
  },
  activeStateId: null,
  collapsedIds: new Set(),
  globalAiNotes: ""
};
function uid() { return "b" + (state._uid++); }

function addBlock(type, parentId = null) {
  const isContainer = (type === "container");
  const baseOffset = state.blocks.filter(b => !b.parentId).length * 20;

  const b = {
    id: uid(), role: type, name: nextName(type),
    parentId: parentId || null,
    x: isContainer ? (50 + baseOffset) : 0,
    y: isContainer ? (50 + baseOffset) : 0,
    w: isContainer ? 400 : 100, h: isContainer ? 300 : 40,
    fillParent: (type === "table"),
    layoutFlow: "relative",
    
    contentType: type === "object" ? "text" : null,
    text: type === "object" ? "Content" : "",
    iconName: type === "object" ? "circle" : null,
    tooltip: "", action: "",

    bgColor: type === "container" ? "var(--surface)" : null,
    textColor: "var(--primary)", 
    
    // Borders & Grids
    borderColor: "var(--border)", borderWidth: 0, borderStyle: "solid",
    innerGridWidth: type === "table" ? 1 : 0,
    innerGridColor: type === "table" ? "var(--border)" : null,
    innerGridStyle: "solid",
    gridPattern: "all",

    fontId: "var(--main)", sizeId: "var(--body)",
    opacity: 100, bgImage: null,
    bgSize: "cover", bgScale: 100, bgPosX: 50, bgPosY: 50,
    alignH: "left", alignV: "top", iconStyleId: "standard",
    grid: (type === "table") ? { cols: [50, 50], rows: [50, 50] } : null,
    gridCells: {}, aiNotes: "", children: [], isComponent: false
  };
  state.blocks.push(b);
  state.selection = [b.id];
  if (!state.activeStateId && !parentId) state.activeStateId = b.id;
  
  if (type === "table") syncGridCells(b);
  
  renderCanvas(); renderSidebar(); renderTree(); renderStateTabs();
}

function renderStateTabs() {
  const container = document.getElementById("frame-tabs"); if (!container) return;
  const roots = state.blocks.filter(b => !b.parentId);
  if (roots.length <= 1) { container.style.display = "none"; return; }
  container.style.display = "flex";
  container.innerHTML = roots.map(root => `<div class="frame-tab ${state.activeStateId === root.id ? "active" : ""}" onclick="setActiveState('${root.id}')">${root.name}</div>`).join("");
}
function setActiveState(id) { state.activeStateId = id; renderStateTabs(); renderCanvas(); renderTree(); renderSidebar(); }
function ctxAddBlock(role) { if (state.selection.length !== 1) return; addBlock(role, state.selection[0]); hideCtx(); }
function getBlock(id) { return state.blocks.find(b => b.id === id) || null; }
function getSelected() { return state.selection.length === 1 ? getBlock(state.selection[0]) : null; }

function setProp(key, val) {
  const b = getSelected(); if (!b) return;
  saveHistory(); b[key] = val;
  if (["role", "parentId", "grid", "layoutFlow", "contentType"].includes(key) || b.role === "table" || b.role === "cell") { renderCanvas(); } else { refreshBlock(b); }
  renderTree();
  if (key === "name") renderStateTabs();
  if (key === "role") { document.getElementById("role-hint").textContent = ROLE_DESC[val] || ""; applyRoleSections(val); renderAllDropdowns(); }
  if (key === "contentType") renderSidebar();
}

function setPropFromSelect(prop, val) {
  const b = getSelected(); if (!b) return;
  saveHistory(); b[prop] = val || null;
  refreshBlock(b); renderTree(); renderAllDropdowns();
}

function setPropAndPreview(key, val) { setProp(key, val); updateIconPreview(val); }
function updateIconPreview(name) {
  const el = document.getElementById("icon-preview"); if (!el) return;
  el.innerHTML = `<i data-lucide="${name || "circle"}" style="width:20px;height:20px;color:var(--text2)"></i>`;
  if (window.lucide) window.lucide.createIcons({ root: el });
}
function updateIconStyle(styleId) { const b = getSelected(); if (!b) return; b.iconStyleId = styleId; refreshBlock(b); renderSidebar(); }

function applyContainerPreset(w, h) {
  const b = getSelected(); if (!b || b.role !== "container") return;
  if (w === null) { document.getElementById("rs-custom-wh").style.display = ""; document.getElementById("p-cw").value = b.w; document.getElementById("p-ch").value = b.h; } 
  else { document.getElementById("rs-custom-wh").style.display = "none"; b.w = w; b.h = h; refreshBlock(b); renderSidebar(); }
}
function applyCustomContainerSize() { const b = getSelected(); if (!b) return; const w = +document.getElementById("p-cw").value; const h = +document.getElementById("p-ch").value; if (w > 0) b.w = w; if (h > 0) b.h = h; refreshBlock(b); }
function buildContainerPresetGrid() {
  const el = document.getElementById("container-preset-grid"); if (!el) return;
  el.innerHTML = "";
  CONTAINER_PRESETS.forEach(p => {
    const btn = document.createElement("button"); btn.className = "preset-btn-sm";
    btn.innerHTML = `<span style="display:block;font-size:10px;font-weight:500;color:var(--text)">${p.name}</span><span style="font-size:8px;color:var(--text3)">${p.w ? p.w + "×" + p.h : "custom"}</span>`;
    btn.onclick = () => applyContainerPreset(p.w, p.h); el.appendChild(btn);
  });
}

function refreshBlock(b, providedEl = null) {
  const el = providedEl || document.getElementById("bl-" + b.id); if (!el) return;

  // CSS Grid & True Positioning Logic
  if (b.role === "cell") {
    el.style.position = "relative";
    el.style.left = "auto"; el.style.top = "auto";
    el.style.width = "100%"; el.style.height = "100%";
    
    // Grid coordinate placement & INNER GRIDLINES
    const pt = state.blocks.find(p => p.id === b.parentId);
    if (pt && pt.role === "table") {
        const { ri, ci } = b._gridPos || { ri: 0, ci: 0 };
        el.style.gridRow = `${ri + 1}`;
        el.style.gridColumn = `${ci + 1}`;
        
        const iw = (pt.innerGridWidth !== undefined ? pt.innerGridWidth : 1) + "px";
        const ic = resolveColor(pt.innerGridColor || "var(--border)");
        const is = pt.innerGridStyle || "solid";
        const pattern = pt.gridPattern || "all";

        const gridlineStr = `${iw} ${is} ${ic}`;

        const isLastCol = ci === pt.grid.cols.length - 1;
        const isLastRow = ri === pt.grid.rows.length - 1;

        el.style.borderRight = (!isLastCol && (pattern === "all" || pattern === "vertical")) ? gridlineStr : "none";
        el.style.borderBottom = (!isLastRow && (pattern === "all" || pattern === "horizontal")) ? gridlineStr : "none";
        el.style.borderTop = "none";
        el.style.borderLeft = "none";
    } else { el.style.border = "none"; }
  } else if (b.fillParent || b.role === "table") {
    el.style.position = "absolute";
    el.style.left = "0"; el.style.top = "0";
    el.style.width = "100%"; el.style.height = "100%";
  } else {
    el.style.position = b.layoutFlow === "absolute" ? "absolute" : "relative";
    el.style.left = b.layoutFlow === "absolute" ? b.x + "px" : "auto"; 
    el.style.top = b.layoutFlow === "absolute" ? b.y + "px" : "auto";
    el.style.width = b.w + "px"; el.style.height = b.h + "px";
  }

  // Define Table as native grid
  if (b.role === "table") {
     el.style.display = "grid";
     if (b.grid) {
         el.style.gridTemplateColumns = b.grid.cols.map(c => c + "%").join(" ");
         el.style.gridTemplateRows = b.grid.rows.map(r => r + "%").join(" ");
     }
  }

  el.style.background = resolveColor(b.bgColor);
  el.style.opacity = (b.opacity ?? 100) / 100;

  // Outer border applies to Container and Table, NOT cells.
  if (b.role !== "cell") {
      const style = b.borderStyle || "solid";
      el.style.border = b.borderWidth ? `${b.borderWidth}px ${style} ${resolveColor(b.borderColor)}` : "none";
  }

  if (b.tooltip) el.title = b.tooltip;

  const bgImg = el.querySelector(".block-bg-img");
  if (bgImg) {
    bgImg.style.backgroundImage = b.bgImage ? `url(${b.bgImage})` : "none";
    bgImg.style.backgroundSize = b.bgSize === "scale" ? `${b.bgScale || 100}%` : (b.bgSize || "cover");
    bgImg.style.backgroundPosition = `${b.bgPosX ?? 50}% ${b.bgPosY ?? 50}%`;
  }

  const cw = el.querySelector(".block-content");
  if (cw && b.role === "object") {
    const jm = { left: "flex-start", center: "center", right: "flex-end" };
    const am = { top: "flex-start", center: "center", bottom: "flex-end" };
    cw.style.justifyContent = jm[b.alignH] || "flex-start";
    cw.style.alignItems = am[b.alignV] || "flex-start";
    cw.style.display = "flex"; cw.style.gap = "8px";
    cw.innerHTML = "";
    
    if (b.contentType === "icon" || b.contentType === "both") {
      const iw = document.createElement("div"); iw.className = "block-icon-wrap";
      const style = state.variables.icons[b.iconStyleId] || state.variables.icons["standard"] || { size: 20, stroke: 2 };
      const color = resolveColor(b.iconColor || b.textColor || "var(--primary)");
      iw.style.color = color; iw.style.width = style.size + "px"; iw.style.height = style.size + "px";
      iw.innerHTML = `<i data-lucide="${b.iconName || "circle"}"></i>`;
      cw.appendChild(iw);
      if (window.lucide) window.lucide.createIcons({ root: iw, attrs: { "stroke-width": style.stroke, "width": style.size, "height": style.size } });
    }
    if (b.contentType === "text" || b.contentType === "both") {
      const txt = document.createElement("div"); txt.className = "block-text";
      txt.textContent = b.text;
      txt.style.fontFamily = resolveFont(b.fontId);
      txt.style.fontSize = resolveSize(b.sizeId) + "px";
      txt.style.color = resolveColor(b.textColor);
      txt.style.textAlign = b.alignH || "left";
      cw.appendChild(txt);
    }
  }
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
  const toCopy = []; const clipboardIds = new Set();
  function collect(b) { if (clipboardIds.has(b.id)) return; toCopy.push(JSON.parse(JSON.stringify(b))); clipboardIds.add(b.id); state.blocks.filter(child => child.parentId === b.id).forEach(collect); }
  roots.forEach(collect); state.clipboard = toCopy; showToast(roots.length + " block(s) copied");
}

function pasteBlocks() {
  if (!state.clipboard.length) return;
  const idMap = {}; const newBlocks = []; const cbIds = new Set(state.clipboard.map(b => b.id));
  state.clipboard.forEach(b => idMap[b.id] = uid());
  const newSelection = [];
  state.clipboard.forEach(b => {
    const nb = JSON.parse(JSON.stringify(b)); nb.id = idMap[b.id];
    if (!cbIds.has(b.parentId)) { nb.x += 20; nb.y += 20; nb.parentId = null; newSelection.push(nb.id); } else { nb.parentId = idMap[b.parentId]; }
    newBlocks.push(nb);
  });
  state.blocks.push(...newBlocks); state.selection = newSelection; saveHistory();
  renderCanvas(); renderSidebar(); renderTree(); hideCtx();
}
function ctxDuplicate() { copySelected(); pasteBlocks(); }

// ═══════════════════════════════════════════════════
// NATIVE GRID SYSTEM
// ═══════════════════════════════════════════════════
function applyGrid() {
  const b = getSelected(); if (!b || b.role !== "table") return;
  saveHistory();
  const cols = parseInt(document.getElementById("g-cols").value) || 1;
  const rows = parseInt(document.getElementById("g-rows").value) || 1;
  const oldCols = b.grid?.cols?.length || 0;
  const oldRows = b.grid?.rows?.length || 0;
  if (cols === oldCols && rows === oldRows) return;

  if (!b.grid) { b.grid = { cols: new Array(cols).fill(100 / cols), rows: new Array(rows).fill(100 / rows) }; } 
  else {
    if (cols > oldCols) { const added = cols - oldCols; const scale = (100 - (5 * added)) / 100; b.grid.cols = b.grid.cols.map(x => x * scale); for (let i = 0; i < added; i++) b.grid.cols.push(5); } 
    else if (cols < oldCols) { b.grid.cols = b.grid.cols.slice(0, cols); const sum = b.grid.cols.reduce((acc, x) => acc + x, 0); b.grid.cols = b.grid.cols.map(x => x * (100 / sum)); }
    if (rows > oldRows) { const added = rows - oldRows; const scale = (100 - (5 * added)) / 100; b.grid.rows = b.grid.rows.map(x => x * scale); for (let i = 0; i < added; i++) b.grid.rows.push(5); } 
    else if (rows < oldRows) { b.grid.rows = b.grid.rows.slice(0, rows); const sum = b.grid.rows.reduce((acc, x) => acc + x, 0); b.grid.rows = b.grid.rows.map(x => x * (100 / sum)); }
  }
  syncGridCells(b); renderCanvas(); renderSidebar(); renderTree();
}

function syncGridCells(b) {
  const rows = b.grid.rows.length; const cols = b.grid.cols.length;
  state.blocks = state.blocks.filter(bl => { if (bl.role === "cell" && bl.parentId === b.id) { const gp = bl._gridPos || { ri: 0, ci: 0 }; return gp.ri < rows && gp.ci < cols; } return true; });
  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      let cell = state.blocks.find(bl => bl.role === "cell" && bl.parentId === b.id && bl._gridPos?.ri === ri && bl._gridPos?.ci === ci);
      if (!cell) {
        cell = {
          id: uid(), role: "cell", name: `Cell-${ri}-${ci}`, parentId: b.id,
          fillParent: false, bgColor: null, opacity: 100, bgImage: null, aiNotes: "", children: [], _gridPos: { ri, ci }
        };
        state.blocks.push(cell);
      }
      refreshBlock(cell);
    }
  }
}

function updateGridManual(type, index, value) {
  const b = getSelected(); if (!b || !b.grid) return;
  const val = Math.max(1, parseFloat(value) || 1); b.grid[type][index] = val;
  const sum = b.grid[type].reduce((a, v) => a + v, 0); if (sum > 0) b.grid[type] = b.grid[type].map(v => (v / sum) * 100);
  syncGridCells(b); refreshBlock(b); renderSidebar();
}

// ═══════════════════════════════════════════════════
// CANVAS RENDERING
// ═══════════════════════════════════════════════════
function renderCanvas() {
  const canvas = document.getElementById("canvas"); if (!canvas) return;
  canvas.innerHTML = '<div class="canvas-dots"></div><div id="marquee"></div>';
  const roots = state.activeStateId ? state.blocks.filter(b => b.id === state.activeStateId) : state.blocks.filter(b => !b.parentId);
  roots.forEach(b => canvas.appendChild(buildBlockEl(b)));
  updateSelectionDOM();
}

function buildBlockEl(b) {
  const isSel = state.selection.length === 1 && state.selection[0] === b.id;
  const isMulti = state.selection.length > 1 && state.selection.includes(b.id);
  const el = document.createElement("div");
  el.className = "block-el" + (b.role === "cell" ? " cell-block" : "") + (isSel ? " selected" : "") + (isMulti ? " multi-sel" : "");
  el.id = "bl-" + b.id;

  if (b.role === "container" || b.role === "table" || b.role === "cell") {
    const bgImg = document.createElement("div"); bgImg.className = "block-bg-img"; el.appendChild(bgImg);
  }

  if (b.role === "object") {
    const cw = document.createElement("div"); cw.className = "block-content"; el.appendChild(cw);
  }

  refreshBlock(b, el);

  state.blocks.filter(cb => cb.parentId === b.id).forEach(cb => el.appendChild(buildBlockEl(cb)));

  const ring = document.createElement("div"); ring.className = "block-sel-ring"; el.appendChild(ring);

  if (b.role === "container") {
    const rh = document.createElement("div"); rh.className = "resize-handle";
    rh.addEventListener("mousedown", ev => { ev.stopPropagation(); state.drag = { type: "resize", id: b.id, sx: ev.clientX, sy: ev.clientY, ow: b.w, oh: b.h }; });
    el.appendChild(rh);
  }

  el.addEventListener("mousedown", ev => {
    ev.stopPropagation();
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) document.activeElement.blur();
    if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { toggleSel(b.id); } else { if (!state.selection.includes(b.id)) { state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); } }
    saveHistory(); state.drag = { type: "move", id: b.id, sx: ev.clientX, sy: ev.clientY, ox: b.x, oy: b.y };
  });

  el.addEventListener("contextmenu", ev => {
    ev.preventDefault(); ev.stopPropagation();
    if (!state.selection.includes(b.id)) { state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); }
    showCtx(ev.clientX, ev.clientY);
  });

  return el;
}

function toggleSel(id) {
  const i = state.selection.indexOf(id); if (i >= 0) state.selection.splice(i, 1); else state.selection.push(id);
  updateSelectionDOM(); renderSidebar(); renderTree();
}

function updateSelectionDOM() {
  document.querySelectorAll(".block-el").forEach(el => {
    el.classList.remove("selected", "multi-sel");
    const id = el.id.replace("bl-", "");
    if (state.selection.length === 1 && state.selection[0] === id) el.classList.add("selected");
    else if (state.selection.length > 1 && state.selection.includes(id)) el.classList.add("multi-sel");
  });
}

// ═══════════════════════════════════════════════════
// DRAG & SELECTION
// ═══════════════════════════════════════════════════
function onCanvasDown(e) {
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) document.activeElement.blur();
  hideCtx();
  const isCanvas = e.target.id === "canvas-wrap" || e.target.id === "canvas" || e.target.classList.contains("canvas-dots");
  if (isCanvas) {
    if (!e.shiftKey) { state.selection = []; updateSelectionDOM(); renderSidebar(); }
    const wrap = document.getElementById("canvas-wrap"), r = wrap.getBoundingClientRect();
    state.mq = { active: true, sx: (e.clientX - r.left + wrap.scrollLeft) / canvasZoom, sy: (e.clientY - r.top + wrap.scrollTop) / canvasZoom };
    document.getElementById("marquee").style.cssText = "display:none";
  }
}

function onCanvasMove(e) {
  if (state.drag) {
    const b = getBlock(state.drag.id); if (!b) return;
    const dx = (e.clientX - state.drag.sx) / canvasZoom, dy = (e.clientY - state.drag.sy) / canvasZoom;
    if (state.drag.type === "move") {
      b.x = Math.max(0, state.drag.ox + dx); b.y = Math.max(0, state.drag.oy + dy);
      if (state.selection.length > 1) { state.selection.forEach(id => { if (id === state.drag.id) return; const ob = getBlock(id); if (ob && ob.role === "container") { ob.x = Math.max(0, ob.x + (b.x - (state.drag.ox))); ob.y = Math.max(0, ob.y + (b.y - (state.drag.oy))); refreshBlock(ob); } }); }
    } else {
      b.w = Math.max(16, state.drag.ow + dx); b.h = Math.max(16, state.drag.oh + dy);
    }
    refreshBlock(b);
    if (state.selection.length === 1) { const px = document.getElementById("p-x"); if (px) px.value = Math.round(b.x); const py = document.getElementById("p-y"); if (py) py.value = Math.round(b.y); }
    return;
  }
  if (state.mq.active) {
    const wrap = document.getElementById("canvas-wrap"), r = wrap.getBoundingClientRect();
    const cx = (e.clientX - r.left + wrap.scrollLeft) / canvasZoom, cy = (e.clientY - r.top + wrap.scrollTop) / canvasZoom;
    const mx = Math.min(cx, state.mq.sx), my = Math.min(cy, state.mq.sy), mw = Math.abs(cx - state.mq.sx), mh = Math.abs(cy - state.mq.sy);
    if (mw > 4 || mh > 4) { const mqEl = document.getElementById("marquee"); mqEl.style.cssText = `display:block;left:${mx}px;top:${my}px;width:${mw}px;height:${mh}px`; }
  }
}

function onCanvasUp(e) {
  if (state.mq.active) {
    state.mq.active = false;
    const mqEl = document.getElementById("marquee");
    if (mqEl.style.display === "block") {
      const mx = parseInt(mqEl.style.left), my = parseInt(mqEl.style.top), mw = parseInt(mqEl.style.width), mh = parseInt(mqEl.style.height);
      const found = state.blocks.filter(b => { if (b.parentId) return false; return b.x < mx + mw && b.x + b.w > mx && b.y < my + mh && b.y + b.h > my; }).map(b => b.id);
      if (found.length) { state.selection = found; updateSelectionDOM(); renderSidebar(); renderTree(); }
      mqEl.style.display = "none";
    }
  }
  state.drag = null;
}
document.addEventListener("mouseup", () => { state.drag = null; });

// ═══════════════════════════════════════════════════
// SIDEBAR PANELS
// ═══════════════════════════════════════════════════
function renderSidebar() {
  const ns = document.getElementById("no-sel"), mp = document.getElementById("multi-sel-panel"), pp = document.getElementById("props-panel");
  const n = state.selection.length;
  ns.style.display = n === 0 ? "block" : "none";
  mp.style.display = n > 1 ? "block" : "none";
  pp.style.display = n === 1 ? "flex" : "none";
  if (n > 1) { document.getElementById("multi-count").textContent = n; return; }
  if (n === 0) { const gan = document.getElementById("global-ai-notes"); if (gan) gan.value = state.globalAiNotes || ""; return; }
  
  const b = getSelected(); if (!b) return;

  document.getElementById("p-name").value = b.name || "";
  document.getElementById("p-role").value = b.role || "container";
  const pComp = document.getElementById("p-isComponent"); if (pComp) pComp.checked = !!b.isComponent;
  const pFlow = document.getElementById("p-layoutFlow"); if (pFlow) pFlow.value = b.layoutFlow || "relative";
  
  document.getElementById("role-hint").textContent = ROLE_DESC[b.role] || "";

  const px = document.getElementById("p-x"); if (px) px.value = Math.round(b.x);
  const py = document.getElementById("p-y"); if (py) py.value = Math.round(b.y);

  const pop = document.getElementById("p-opacity"); if (pop) pop.value = b.opacity ?? 100;
  const pov = document.getElementById("opacity-val"); if (pov) pov.textContent = (b.opacity ?? 100) + "%";
  const pn = document.getElementById("p-notes"); if (pn) pn.value = b.aiNotes || "";
  
  // Outer Borders
  const pbs = document.getElementById("p-borderStyle"); if (pbs) pbs.value = b.borderStyle || "solid";
  const pbw = document.getElementById("p-border-w"); if (pbw) pbw.value = b.borderWidth || 0;
  const ptbs = document.getElementById("p-tableBorderStyle"); if (ptbs) ptbs.value = b.borderStyle || "solid";
  const ptbw = document.getElementById("p-table-border-w"); if (ptbw) ptbw.value = b.borderWidth || 0;

  // Table specific borders
  if (b.role === "table") {
      const pgp = document.getElementById("p-gridPattern"); if (pgp) pgp.value = b.gridPattern || "all";
      const pigs = document.getElementById("p-innerGridStyle"); if (pigs) pigs.value = b.innerGridStyle || "solid";
      const pigw = document.getElementById("p-innerGridWidth"); if (pigw) pigw.value = b.innerGridWidth !== undefined ? b.innerGridWidth : 1;
  }

  const idzn = document.getElementById("img-drop-zone"); if (idzn) idzn.textContent = b.bgImage ? "(image loaded)" : "Click to upload";
  const pSize = document.getElementById("p-bgSize"); if (pSize) pSize.value = b.bgSize || "cover";
  const pScale = document.getElementById("p-bgScale"); if (pScale) { pScale.value = b.bgScale || 100; pScale.nextElementSibling.textContent = pScale.value + "%"; }
  const pPosX = document.getElementById("p-bgPosX"); if (pPosX) { pPosX.value = b.bgPosX ?? 50; pPosX.nextElementSibling.textContent = pPosX.value + "%"; }
  const pPosY = document.getElementById("p-bgPosY"); if (pPosY) { pPosY.value = b.bgPosY ?? 50; pPosY.nextElementSibling.textContent = pPosY.value + "%"; }

  if (b.role === "table" && b.grid) {
    document.getElementById("g-cols").value = b.grid.cols.length; document.getElementById("g-rows").value = b.grid.rows.length;
    document.getElementById("grid-col-inputs").innerHTML = b.grid.cols.map((w, i) => `<input class="r-input" type="number" style="width:40px" value="${Math.round(w)}" onchange="updateGridManual('cols', ${i}, this.value)">`).join("");
    document.getElementById("grid-row-inputs").innerHTML = b.grid.rows.map((h, i) => `<input class="r-input" type="number" style="width:40px" value="${Math.round(h)}" onchange="updateGridManual('rows', ${i}, this.value)">`).join("");
  }

  if (b.role === "object") {
    document.getElementById("p-contentType").value = b.contentType || "text";
    document.getElementById("obj-text-group").style.display = (b.contentType === "text" || b.contentType === "both") ? "block" : "none";
    document.getElementById("obj-icon-group").style.display = (b.contentType === "icon" || b.contentType === "both") ? "block" : "none";
    document.getElementById("p-textContent").value = b.text || "";
    document.getElementById("p-iconName").value = b.iconName || "";
    document.getElementById("p-tooltip").value = b.tooltip || "";
    document.getElementById("p-action").value = b.action || "";
    updateIconPreview(b.iconName);
  }

  ["left", "center", "right"].forEach(a => document.getElementById("ah-" + a)?.classList.toggle("active", b.alignH === a));
  ["top", "center", "bottom"].forEach(a => document.getElementById("av-" + a)?.classList.toggle("active", b.alignV === a));

  applyRoleSections(b.role); renderAllDropdowns();
  if (b.role === "container") buildContainerPresetGrid();
}

function deleteCurrentState() {
  const roots = state.blocks.filter(b => !b.parentId);
  if (roots.length <= 1) { showToast("Cannot delete the last remaining state."); return; }
  const idToDelete = state.activeStateId; if (!idToDelete) return;
  if (!confirm("Are you sure you want to delete this state?")) return;
  const remainingRoots = roots.filter(r => r.id !== idToDelete);
  state.activeStateId = remainingRoots[0].id;
  const toDelete = new Set(); function collect(id) { toDelete.add(id); state.blocks.forEach(b => { if (b.parentId === id) collect(b.id); }); }
  collect(idToDelete); state.blocks = state.blocks.filter(b => !toDelete.has(b.id));
  saveHistory(); renderStateTabs(); renderCanvas(); renderSidebar(); renderTree(); showToast("State deleted");
}

function renderTree() {
  const container = document.getElementById("tree-content"); if (!container) return;
  container.innerHTML = "";
  function addItem(b, depth) {
    const item = document.createElement("div");
    item.className = `tree-item ${state.selection.includes(b.id) ? "active" : ""}`; item.style.paddingLeft = (depth * 12 + 4) + "px";
    item.onclick = (e) => { e.stopPropagation(); state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); };
    item.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); state.selection = [b.id]; updateSelectionDOM(); renderSidebar(); renderTree(); showCtx(e.clientX, e.clientY); };
    const isCollapsed = state.collapsedIds.has(b.id); const children = state.blocks.filter(c => c.parentId === b.id); const hasChildren = children.length > 0;
    item.innerHTML = `<span class="tree-arrow" onclick="toggleCollapse('${b.id}', event)" style="visibility:${hasChildren ? "visible" : "hidden"}">${isCollapsed ? "▸" : "▾"}</span><span class="tree-icon">${getIconForRole(b.role)}</span><span class="tree-label">${b.name}</span>`;
    container.appendChild(item);
    if (!isCollapsed) { children.forEach(c => addItem(c, depth + 1)); }
  }
  const roots = state.activeStateId ? state.blocks.filter(b => b.id === state.activeStateId) : state.blocks.filter(b => !b.parentId);
  roots.forEach(b => addItem(b, 0));
}

function toggleCollapse(id, e) { e.stopPropagation(); if (state.collapsedIds.has(id)) state.collapsedIds.delete(id); else state.collapsedIds.add(id); renderTree(); }
function getIconForRole(role) { const map = { table: "⊞", container: "▢", cell: "▫", object: "★" }; return map[role] || "•"; }

function showCtx(x, y) {
  const b = getSelected(); if (!b) return;
  const menu = document.getElementById("ctx-menu"); menu.style.display = "block"; menu.style.left = x + "px"; menu.style.top = y + "px";
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 40) { menu.style.left = (window.innerWidth - rect.width - 20) + "px"; menu.classList.add("flip-left"); } else { menu.classList.remove("flip-left"); }
  if (y + rect.height > window.innerHeight - 40) menu.style.top = (window.innerHeight - rect.height - 20) + "px";
}
function hideCtx() { document.getElementById("ctx-menu").style.display = "none"; }
document.addEventListener("click", hideCtx);

function handleBgImage(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => { const b = getSelected(); if (!b) return; b.bgImage = ev.target.result; document.getElementById("img-drop-zone").textContent = file.name; refreshBlock(b); }; reader.readAsDataURL(file); }
function clearBgImage() { const b = getSelected(); if (!b) return; b.bgImage = null; document.getElementById("img-drop-zone").textContent = "Click to upload"; refreshBlock(b); }

// ═══════════════════════════════════════════════════
// EXPORTS & COMPONENT LIBRARY LOGIC
// ═══════════════════════════════════════════════════
let currentProjectName = null;

function ctxEditNewState() {
  const b = getSelected(); if (!b) return; saveHistory();
  const idMap = {}; const newBlocks = []; const cbIds = new Set();
  function collectRecursive(targetId) { cbIds.add(targetId); idMap[targetId] = uid(); state.blocks.filter(c => c.parentId === targetId).forEach(c => collectRecursive(c.id)); }
  collectRecursive(b.id);
  cbIds.forEach(oldId => {
    const original = state.blocks.find(x => x.id === oldId); const nb = JSON.parse(JSON.stringify(original)); nb.id = idMap[oldId];
    if (oldId === b.id) { nb.parentId = null; const currentRoot = state.blocks.find(x => x.id === state.activeStateId) || b; nb.x = (currentRoot.x + currentRoot.w + 200); nb.y = currentRoot.y; nb.name = nb.name + " (New State)"; } 
    else { nb.parentId = idMap[original.parentId]; }
    newBlocks.push(nb);
  });
  state.blocks.push(...newBlocks); state.activeStateId = idMap[b.id]; state.selection = [idMap[b.id]]; renderCanvas(); renderSidebar(); renderTree(); renderStateTabs(); hideCtx(); showToast("State branch created");
}

function newProject() {
  if (!confirm("Start a new project?")) return; saveHistory();
  state.blocks = []; state.selection = []; state.activeStateId = null; state._uid = 1; state.globalAiNotes = "";
  Object.keys(COUNTERS).forEach(k => delete COUNTERS[k]); currentProjectName = null;
  renderCanvas(); renderSidebar(); renderTree(); renderStateTabs(); showToast("New project");
}

function saveProject() { const name = currentProjectName || prompt("Project name:", "my-layout"); if (!name) return; currentProjectName = name; _doSave(name); }
function saveProjectAs() { const name = prompt("Save as:", currentProjectName || "my-layout"); if (!name) return; currentProjectName = name; _doSave(name); }

function loadLayoutData(d) {
  if (d && d.state && d.state.blocks) {
    if (d.vars) state.variables = d.vars;
    state.blocks = d.state.blocks.map(b => {
      if (!["container", "table", "cell", "object"].includes(b.role)) b.role = "container";
      return b;
    });
    state._uid = d.state._uid || state._uid;
    state.globalAiNotes = d.state.globalAiNotes || "";
    state.selection = [];
    renderVars(); renderAllDropdowns(); renderCanvas(); renderSidebar(); renderTree(); renderStateTabs(); applyZoom();
  }
}

function _doSave(name) {
  const data = {
    meta: { tool: "layout-designer-v5", savedAt: new Date().toISOString(), name },
    vars: JSON.parse(JSON.stringify(state.variables)),
    state: { blocks: state.blocks, _uid: state._uid, globalAiNotes: state.globalAiNotes },
  };
  const urlParams = new URLSearchParams(window.location.search); const workspacePath = urlParams.get("workspace");
  if (workspacePath) {
    const layoutPath = workspacePath + "/.evaix/layouts/badbuilderpage.layout.json";
    fetch("/api/vfs/write", { method: "POST", headers: { "Content-Type": "application/json", }, body: JSON.stringify({ path: layoutPath, content: JSON.stringify(data, null, 2) }) })
    .then(r => { if (!r.ok) throw new Error("Save API returned error"); return r.json(); }).then(() => { showToast("Saved: " + name); })
    .catch(err => { showToast("VFS Save failed: " + err.message); });
  } else { download(JSON.stringify(data, null, 2), name.replace(/\s+/g, "-") + ".layout.json"); showToast("Saved: " + name); }
}

function openProject() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".layout.json,.json";
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = ev => { try { const d = JSON.parse(ev.target.result); if (d.state && d.state.blocks) { loadLayoutData(d); currentProjectName = d.meta?.name || file.name.replace(".layout.json", ""); showToast("Opened: " + currentProjectName); } } catch { showToast("Invalid file"); } };
    reader.readAsText(file);
  }; inp.click();
}

function triggerImportJSON() { document.getElementById("import-input-hidden").click(); }
function triggerImport() { triggerImportJSON(); }

function exportContainerJSON() {
  const b = getSelected(); if (!b) { showToast("Select a block first to export as Component"); return; }
  function collectWithChildren(id) { const block = state.blocks.find(x => x.id === id); if (!block) return []; return [block, ...state.blocks.filter(c => c.parentId === id).flatMap(c => collectWithChildren(c.id))]; }
  const blocks = collectWithChildren(b.id);
  const comp = { 
    id: "comp-" + Date.now(), // Fixed ID generation so it saves properly to library
    meta: { tool: "layout-designer-v5", type: "component" }, 
    vars: JSON.parse(JSON.stringify(state.variables)), 
    frame: { name: b.name || "Component", blocks: JSON.parse(JSON.stringify(blocks)) } 
  };
  download(JSON.stringify(comp, null, 2), (b.name || "component").replace(/\s+/g, "-") + ".component.json"); 
  showToast("Component Exported: " + b.name);
}

function handleImport(e) {
  const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
  reader.onload = ev => { 
    try { 
      const c = JSON.parse(ev.target.result); 
      if (!c.frame) throw new Error("Not a component"); 
      if (!c.id) c.id = "comp-" + Date.now(); // Patch for legacy files
      
      if (!components.find(x => x.id === c.id)) { 
        components.push(c); 
        localStorage.setItem("ld4-components", JSON.stringify(components)); 
      } 
      renderComponents(); 
      showToast("Added to Component Library: " + c.frame.name); 
    } catch(err) { 
      showToast("Invalid component file"); 
    } 
  };
  reader.readAsText(file); e.target.value = "";
}

function dropComponent(comp) { 
  const idMap = {}; 
  const newBlocks = [];
  const cbIds = new Set(comp.frame.blocks.map(b => b.id)); 
  
  // Create unique IDs for the stamped clone to prevent canvas crashing
  comp.frame.blocks.forEach(b => { idMap[b.id] = uid(); }); 
  
  // Decide where to nest the drop. If 1 block is selected, drop inside it. Otherwise, drop at root.
  const targetParentId = state.selection.length === 1 ? state.selection[0] : null;

  comp.frame.blocks.forEach(b => { 
    const nb = { ...JSON.parse(JSON.stringify(b)), id: idMap[b.id] }; 
    
    // Connect root component block to the target selection
    if (!cbIds.has(b.parentId)) {
        nb.parentId = targetParentId;
        if (!targetParentId) { nb.x += 20; nb.y += 20; } // Offset if dropping on open canvas
    } else {
        nb.parentId = idMap[b.parentId];
    }
    newBlocks.push(nb);
  }); 
  
  state.blocks.push(...newBlocks); 
  state.selection = [newBlocks[0].id]; // Select the dropped component
  saveHistory();
  renderCanvas(); renderTree(); renderSidebar();
  showToast("Component Stamped on Canvas"); 
}

function renderComponents() {
  const el = document.getElementById("comp-list"); if (!el) return;
  if (!components.length) { el.innerHTML = `<div style="color:var(--text3);font-size:9px;padding:4px 2px;line-height:1.7">No saved components. Use "Export JSON" on a block, then Import here.</div>`; return; }
  el.innerHTML = "";
  components.forEach((c, i) => {
    const d = document.createElement("div"); d.className = "comp-item";
    const name = c.frame?.name || "Unnamed Component";
    d.innerHTML = `<div style="flex:1"><div style="font-size:10px;color:var(--text)">${name}</div><div style="font-size:8px;color:var(--text3)">${c.frame?.blocks?.length || 0} blocks</div></div><button class="tb-btn" style="font-size:8px;padding:2px 6px" onclick="dropComponent(components[${i}])">Use</button><span style="color:var(--text3);font-size:12px;cursor:pointer;padding:0 2px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'" onclick="delComp(${i})" title="Remove from Library">×</span>`;
    el.appendChild(d);
  });
}

function delComp(i) { 
  components.splice(i, 1); 
  localStorage.setItem("ld4-components", JSON.stringify(components)); 
  renderComponents(); 
}

// ═══════════════════════════════════════════════════
// DATA EXPORTS
// ═══════════════════════════════════════════════════
function exportForAI() {
  const lines = [];
  lines.push("# UI COMPILER INSTRUCTIONS");
  lines.push("> Generated: " + new Date().toISOString());
  lines.push("");
  lines.push("You are an expert Frontend AI. Your task is to compile the following JSON UI tree and design tokens into production-ready React (TSX) code.");
  lines.push("");

  lines.push("## 1. GLOBAL ARCHITECTURE NOTES");
  if (state.globalAiNotes && state.globalAiNotes.trim() !== "") { 
    lines.push(state.globalAiNotes); 
  } else { 
    lines.push("Use standard React conventions. Use Tailwind CSS for styling based on the provided design tokens."); 
  }

  lines.push("");
  lines.push("## 2. DESIGN TOKENS (CSS Variables)");
  lines.push("Please implement these using Tailwind arbitrary values (e.g., `bg-[var(--surface)]`) or map them in tailwind.config.js.");
  lines.push("```css");
  lines.push(":root {");
  Object.entries(state.variables.colors).forEach(([k, v]) => lines.push("  --" + k + ": " + v + ";"));
  Object.entries(state.variables.fonts).forEach(([k, v]) => lines.push("  --font-" + k + ": " + v + ";"));
  Object.entries(state.variables.sizes).forEach(([k, v]) => lines.push("  --size-" + k + ": " + v + "px;"));
  lines.push("}");
  lines.push("```");
  lines.push("");

  lines.push("## 3. UI COMPONENT TREE (JSON)");
  lines.push("Below is the exact hierarchical structure of the layout. Nodes marked with `\"isComponent\": true` should be extracted into their own modular React components if possible.");
  lines.push("");
  
  const roots = state.activeStateId ? state.blocks.filter(b => b.id === state.activeStateId) : state.blocks.filter(b => !b.parentId);
  const exportTree = buildExportTree(roots, state.blocks);
  
  lines.push("```json");
  lines.push(JSON.stringify(exportTree, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## 4. COMPILATION RULES");
  lines.push("1. **Atomic Mapping**: `container` = div/section. `table` = CSS Grid. `object` = Typography, Button, or Icon Component.");
  lines.push("2. **AI Notes**: Pay close attention to the `aiNotes` field on individual blocks. These contain specific logic or interaction requirements.");
  lines.push("3. **Flow vs Absolute**: If layoutFlow is \"absolute\", apply absolute positioning based on x/y coordinates.");
  lines.push("4. **Grid**: If a block has a `grid` property, use CSS Grid (`grid-cols-X`) mapping to the defined percentages.");
  lines.push("5. **Output**: Output ONLY the complete, copy-pasteable TSX code. Do not include markdown explanations outside of the code block.");

  download(lines.join("\n"), (currentProjectName || "layout") + "-ai-prompt.md");
  showToast("AI Compiler Prompt Downloaded!");
}

function buildExportTree(blocks, allBlocks) {
  return blocks.map(b => ({
    id: b.id, name: b.name, role: b.role,
    position: { x: Math.round(b.x), y: Math.round(b.y), flow: b.layoutFlow || "relative" },
    size: { w: Math.round(b.w), h: Math.round(b.h) },
    fillParent: !!b.fillParent, isComponent: !!b.isComponent,
    style: {
      backgroundColor: b.bgColor, backgroundColorValue: resolveColor(b.bgColor),
      textColor: b.textColor, textColorValue: resolveColor(b.textColor),
      borderColor: b.borderColor, borderColorValue: resolveColor(b.borderColor),
      borderWidth: b.borderWidth || 0, borderStyle: b.borderStyle || "solid",
      font: b.fontId, fontValue: resolveFont(b.fontId), fontSize: b.sizeId, fontSizeValue: resolveSize(b.sizeId),
      opacity: b.opacity ?? 100, textAlign: b.alignH || "left", verticalAlign: b.alignV || "top",
    },
    tableStyles: b.role === "table" ? {
        innerGridWidth: b.innerGridWidth,
        innerGridColor: b.innerGridColor,
        innerGridColorValue: resolveColor(b.innerGridColor),
        innerGridStyle: b.innerGridStyle,
        gridPattern: b.gridPattern
    } : null,
    objectContent: b.role === "object" ? { type: b.contentType, text: b.text, icon: b.iconName, tooltip: b.tooltip, action: b.action } : null,
    aiNotes: b.aiNotes || "",
    grid: b.grid ? { columns: b.grid.cols.map((w, i) => ({ index: i, widthPx: Math.round(w), pct: Math.round(w / b.w * 1000) / 10 })), rows: b.grid.rows.map((h, i) => ({ index: i, heightPx: Math.round(h), pct: Math.round(h / b.h * 1000) / 10 })) } : null,
    children: buildExportTree(allBlocks.filter(c => c.parentId === b.id), allBlocks),
  }));
}

function download(content, filename) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
}

// ═══════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2200);
}

document.addEventListener("keydown", e => {
  const editing = e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
  if (editing) return;
  if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
  if (e.key === "Escape") { state.selection = []; updateSelectionDOM(); renderSidebar(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); ctxDuplicate(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "c") { e.preventDefault(); copySelected(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "v") { e.preventDefault(); pasteBlocks(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "a") { e.preventDefault(); state.selection = state.blocks.map(b => b.id); updateSelectionDOM(); renderSidebar(); renderTree(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
  if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
});

function init() {
  // NEW: Boot up library memory
  try {
    const savedComps = localStorage.getItem("ld4-components");
    if (savedComps) components = JSON.parse(savedComps);
  } catch (err) { console.warn("Failed to load components library", err); }

  renderVars(); renderLeftVars(); renderComponents(); renderCanvas(); renderStateTabs(); applyZoom();
  const urlParams = new URLSearchParams(window.location.search); const workspacePath = urlParams.get("workspace");
  if (workspacePath) {
    const layoutPath = workspacePath + "/.evaix/layouts/badbuilderpage.layout.json";
    fetch(`/api/vfs/read?path=${encodeURIComponent(layoutPath)}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(data => { if (data && data.content) { loadLayoutData(JSON.parse(data.content)); showToast("Loaded workspace layout"); } })
      .catch(err => { console.warn("[BadBuilder] Failed to load workspace layout", err); });
  }
}
init();