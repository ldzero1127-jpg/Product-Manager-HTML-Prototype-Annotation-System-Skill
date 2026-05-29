/* ================================================================
   Prototype Annotator — Injectable JavaScript Framework
   All functions and variables are scoped to (function(){...})() IIFE
   to avoid conflicts with host page scripts.
   ================================================================ */

(function() {
'use strict';

var AnnoNS = window.AnnoNS || {};

/* ---- Constants ---- */
var STORAGE_KEY = 'anno_custom_data';
var COLORS = ['blue','orange','red','purple'];
var modes = { VIEW: 'view', EDIT: 'edit', ADD: 'add' };

/* ---- State ---- */
var currentMode = modes.VIEW;
var currentCardIdx = -1;
var isAdding = false;
var isCollapsed = false;
var isPanelOpen = false;
var addTipEl = null;

/* ---- Data ---- */
var customAnnotations = AnnoNS.customAnnotations || [];
var mergedAnnotations = [];
var undoStack = [];
var redoStack = [];
var MAX_UNDO = 30;

function loadCustom() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    customAnnotations = raw ? JSON.parse(raw) : [];
  } catch(e) { customAnnotations = []; }
}
function saveCustom() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customAnnotations)); } catch(e) {}
}
function getMerged() {
  return (typeof ANNOTATIONS !== 'undefined' ? ANNOTATIONS : []).concat(customAnnotations);
}

/* ---- Color Assignment ---- */
function getColor(idx) { return COLORS[idx % COLORS.length]; }
function getDate() { return (new Date().getMonth()+1) + '-' + new Date().getDate(); }

/* ---- Undo/Redo ---- */
function deepCloneAnnotations(arr) {
  try { return JSON.parse(JSON.stringify(arr)); } catch(e) { return []; }
}
function pushUndo() {
  undoStack.push(deepCloneAnnotations(customAnnotations));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
}
function undo() {
  if (undoStack.length === 0) { showToast('没有可撤销的操作', 'warning'); return; }
  redoStack.push(deepCloneAnnotations(customAnnotations));
  customAnnotations = undoStack.pop();
  saveCustom();
  removeAllDots();
  renderAllDots();
  if (isPanelOpen) renderPanel();
  hideCard();
  showToast('已撤销', 'success');
}
function redo() {
  if (redoStack.length === 0) { showToast('没有可重做的操作', 'warning'); return; }
  undoStack.push(deepCloneAnnotations(customAnnotations));
  customAnnotations = redoStack.pop();
  saveCustom();
  removeAllDots();
  renderAllDots();
  if (isPanelOpen) renderPanel();
  hideCard();
  showToast('已重做', 'success');
}

/* ---- Export/Import ---- */
function exportAnnotations() {
  var data = getMerged();
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'annotations-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('标注数据已导出', 'success');
}

function importAnnotations() {
  var input = $('annoImportFile');
  if (!input) return;
  input.value = '';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var arr = JSON.parse(ev.target.result);
        if (!Array.isArray(arr)) {
          showToast('导入失败：文件格式不正确', 'warning');
          return;
        }
        var valid = arr.filter(function(a) {
          return a && typeof a.selector === 'string' && typeof a.summary === 'string';
        });
        if (valid.length === 0) {
          showToast('导入失败：未找到有效标注', 'warning');
          return;
        }
        pushUndo();
        customAnnotations = customAnnotations.concat(valid);
        saveCustom();
        removeAllDots();
        renderAllDots();
        if (isPanelOpen) renderPanel();
        showToast('成功导入 ' + valid.length + ' 条标注', 'success');
      } catch(err) {
        showToast('导入失败：JSON解析错误', 'warning');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ---- DOM References (lazy) ---- */
function $(id) { return document.getElementById(id); }
function c(sel) { try { return document.querySelectorAll(sel); } catch(e) { return []; } }

/* ---- Safe Query Selector ---- */
function safeQuery(sel) {
  try { return document.querySelector(sel); } catch(e) { return null; }
}

/* ---- Generate Selector ---- */
var annoElCounter = 1000;
function generateSelector(el) {
  if (el.id) return '#' + el.id;
  if (!el.getAttribute('data-anno-el-id')) {
    annoElCounter++;
    el.setAttribute('data-anno-el-id', 'ae' + annoElCounter);
  }
  return '[data-anno-el-id="' + el.getAttribute('data-anno-el-id') + '"]';
}

/* ---- Page Detection (generic heuristic cascade) --- */
function detectCurrentPage() {
  // 1. Hash routing
  if (location.hash && location.hash.length > 1) {
    return location.hash.replace(/^#\/?/, '').replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
  }

  // 2. ARIA tabpanel
  var panels = document.querySelectorAll('[role="tabpanel"]');
  for (var i = 0; i < panels.length; i++) {
    if (getComputedStyle(panels[i]).display !== 'none') {
      return panels[i].id || 'tabpanel-' + i;
    }
  }

  // 3. Common tab class patterns (Bootstrap + generic)
  var tabSelectors = [
    '.tab-pane.active', '.tab-pane.show',
    '.tab-panel.active', '.tab-page.active',
    '.page.active', '.view.active',
    '[class*="tab-content"] > [class*="active"]'
  ];
  for (var s = 0; s < tabSelectors.length; s++) {
    try {
      var tabEl = document.querySelector(tabSelectors[s]);
      if (tabEl) return tabEl.id || slugFromClass(tabEl.className);
    } catch(e) {}
  }

  // 4. Visible sections with IDs and page-like class names
  var sections = document.querySelectorAll('section[id], div[id]');
  for (var j = 0; j < sections.length; j++) {
    var sec = sections[j];
    var rect = sec.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 &&
        getComputedStyle(sec).display !== 'none' &&
        sec.offsetParent !== null) {
      var cls = sec.className || '';
      if (/page|view|tab|screen|route|panel/i.test(cls)) {
        return sec.id;
      }
    }
  }

  // 5. Body class fallback
  var bodyClasses = (document.body.className || '').split(/\s+/);
  for (var k = 0; k < bodyClasses.length; k++) {
    if (/^(page-|view-|route-|screen-)/.test(bodyClasses[k])) {
      return bodyClasses[k];
    }
  }

  // 6. Default (single-page)
  return 'default';
}

function slugFromClass(cls) {
  if (!cls) return 'unknown';
  var tokens = cls.split(/\s+/);
  for (var i = 0; i < tokens.length; i++) {
    if (/active|show|current|visible/.test(tokens[i])) continue;
    if (/^[a-zA-Z]/.test(tokens[i])) return tokens[i];
  }
  return tokens[0] || 'unknown';
}

/* ================================================================
   Markers — body-level absolute container
   Uses getBoundingClientRect + scroll offset for precise positioning.
   Avoids both overflow:hidden clipping and transform containing-block issues.
   ================================================================ */
var _markerContainer = null;
var _activeDots = [];
var _repositionTimer = null;

function ensureMarkerContainer() {
  if (_markerContainer) return;
  _markerContainer = document.createElement('div');
  _markerContainer.id = 'annoMarkerContainer';
  _markerContainer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(_markerContainer);
}

function getMarkerPos(el) {
  var rect = el.getBoundingClientRect();
  return {
    top:  rect.top  + window.pageYOffset - 13,
    left: rect.right + window.pageXOffset - 13
  };
}

function renderAllDots() {
  removeAllDots();
  ensureMarkerContainer();
  mergedAnnotations = getMerged();
  var currentPage = detectCurrentPage();
  mergedAnnotations.forEach(function(a, i) {
    if (a.page && currentPage !== 'default' && a.page !== currentPage) return;
    var el = safeQuery(a.selector);
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var pos = getMarkerPos(el);
    var dot = document.createElement('div');
    dot.className = 'anno-marker ' + (a.color || getColor(i));
    dot.style.cssText = 'position:absolute;top:' + pos.top + 'px;left:' + pos.left + 'px;pointer-events:auto;';
    dot.innerHTML = '<span class="anno-number">' + (i + 1) + '</span>';
    dot.addEventListener('click', function(e) {
      e.stopPropagation(); e.preventDefault();
      showCard(i, e);
    });
    _markerContainer.appendChild(dot);
    _activeDots.push({ dot: dot, target: el });
  });
}

function removeAllDots() {
  _activeDots.forEach(function(d) {
    if (d.dot.parentNode) d.dot.parentNode.removeChild(d.dot);
  });
  _activeDots = [];
}

function repositionMarkers() {
  clearTimeout(_repositionTimer);
  _repositionTimer = setTimeout(function() {
    if (isCollapsed || _activeDots.length === 0) return;
    _activeDots.forEach(function(d) {
      var rect = d.target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        d.dot.style.display = 'none';
      } else {
        var pos = getMarkerPos(d.target);
        d.dot.style.display = '';
        d.dot.style.top  = pos.top  + 'px';
        d.dot.style.left = pos.left + 'px';
      }
    });
  }, 30);
}
window.addEventListener('scroll', repositionMarkers, true);
window.addEventListener('resize', repositionMarkers);

/* ================================================================
   Toolbar
   ================================================================ */
function initToolbar() {
  var toggleBtn = $('annoToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      isCollapsed = !isCollapsed;
      var tb = $('annoToolbar');
      if (tb) tb.classList.toggle('collapsed', isCollapsed);
      toggleBtn.classList.toggle('active', isCollapsed);
      // Show/hide markers
      if (_markerContainer) _markerContainer.style.display = isCollapsed ? 'none' : '';
    });
  }
  // View mode button
  var viewBtn = $('annoViewBtn');
  if (viewBtn) viewBtn.addEventListener('click', function() { setMode(modes.VIEW); });
  // Edit mode button
  var editBtn = $('annoEditBtn');
  if (editBtn) editBtn.addEventListener('click', function() { setMode(modes.EDIT); });
  // Panel button
  var panelBtn = $('annoPanelBtn');
  if (panelBtn) panelBtn.addEventListener('click', togglePanel);
  // Add button
  var addBtn = $('annoAddBtn');
  if (addBtn) addBtn.addEventListener('click', toggleAddMode);
  // Save button
  var saveBtn = $('annoSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', function() { saveCustom(); showToast('保存成功！', 'success'); });
  // Close panel
  var closePanel = $('annoPanelClose');
  if (closePanel) closePanel.addEventListener('click', function() { togglePanel(); });
  // Undo/Redo
  var undoBtn = $('annoUndoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  var redoBtn = $('annoRedoBtn');
  if (redoBtn) redoBtn.addEventListener('click', redo);
  // Export/Import
  var exportBtn = $('annoExportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportAnnotations);
  var importBtn = $('annoImportBtn');
  if (importBtn) importBtn.addEventListener('click', importAnnotations);
}

function setMode(mode) {
  currentMode = mode;
  exitAddMode();
  // Update toolbar active states
  var buttons = {
    'annoViewBtn': modes.VIEW,
    'annoEditBtn': modes.EDIT,
    'annoAddBtn': modes.ADD
  };
  Object.keys(buttons).forEach(function(id) {
    var btn = $(id);
    if (btn) btn.classList.toggle('active', buttons[id] === currentMode);
  });
  var modeTextEl = $('annoModeText');
  if (modeTextEl) {
    modeTextEl.textContent = mode === modes.VIEW ? '查看模式' : mode === modes.EDIT ? '编辑模式' : '新增模式';
  }
}

function togglePanel() {
  isPanelOpen = !isPanelOpen;
  var panel = $('annoRightPanel');
  if (panel) panel.classList.toggle('show', isPanelOpen);
  if (isPanelOpen) renderPanel();
}

function renderPanel() {
  var listEl = $('annoPanelList');
  if (!listEl) return;
  mergedAnnotations = getMerged();
  var html = '';
  mergedAnnotations.forEach(function(a, i) {
    var c = a.color || getColor(i);
    html += '<div class="anno-panel-item" data-idx="' + i + '">' +
      '<div class="anno-panel-item-num ' + c + '">' + (i + 1) + '</div>' +
      '<div class="anno-panel-item-content">' +
        '<div class="anno-panel-item-title">' + (a.title || a.summary) + '</div>' +
        '<div class="anno-panel-item-meta">' +
          '<span>' + (a.date || getDate()) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  listEl.innerHTML = html;
  // Click handlers
  listEl.querySelectorAll('.anno-panel-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var idx = parseInt(this.getAttribute('data-idx'));
      if (idx >= 0) showCard(idx, null);
    });
  });
}

/* ================================================================
   Add Mode — window capture listener + stopPropagation
   ================================================================ */
var _annoJustAdded = false;

function handleAddClick(e) {
  if (!isAdding) return;

  // Block host page navigation (table row clicks, tab switches, etc.)
  e.stopPropagation();
  e.preventDefault();

  // Find the real element — try event target first, fallback to elementFromPoint
  var t = e.target;
  if (t.nodeType === 3) t = t.parentNode; // text node → parent element
  if (!t || t === document.documentElement || t === document.body) {
    // Fallback: use elementFromPoint for edge cases
    t = document.elementFromPoint(e.clientX, e.clientY);
  }
  if (!t) return;

  // Skip annotation UI elements
  if (t.closest('.anno-marker') || t.closest('.anno-card') ||
      t.closest('.anno-toolbar-combo') || t.closest('.anno-panel') ||
      t.closest('.anno-add-mode-tip')) return;

  // Generate selector — use ID if available, otherwise data-anno-el-id
  var selector = generateSelector(t);
  var color = getColor(customAnnotations.length + (typeof ANNOTATIONS !== 'undefined' ? ANNOTATIONS.length : 0));
  var newAnno = {
    selector: selector,
    title: '新标注',
    summary: '点击编辑修改标注内容',
    detail: ['请修改为具体的业务说明'],
    date: getDate(),
    color: color,
    page: detectCurrentPage()
  };
  pushUndo();
  customAnnotations.push(newAnno);
  saveCustom();

  exitAddMode();
  setMode(modes.EDIT);
  removeAllDots();
  renderAllDots();

  _annoJustAdded = true;
  var newIdx = (typeof ANNOTATIONS !== 'undefined' ? ANNOTATIONS.length : 0) + customAnnotations.length - 1;
  showCard(newIdx, e);
  showToast('标注已添加，请编辑内容', 'success');
  setTimeout(function() { _annoJustAdded = false; }, 200);
}

function toggleAddMode() {
  isAdding = !isAdding;
  var addBtn = $('annoAddBtn');
  if (isAdding) {
    // Do NOT call setMode() — it calls exitAddMode() which would undo everything
    currentMode = modes.ADD;
    var modeTextEl = $('annoModeText');
    if (modeTextEl) modeTextEl.textContent = '新增模式';
    // Deactivate view/edit buttons, activate add button
    ['annoViewBtn','annoEditBtn'].forEach(function(id) {
      var b = $(id); if (b) b.classList.remove('active');
    });
    if (addBtn) addBtn.classList.add('active');
    // Crosshair cursor on all elements
    document.body.classList.add('anno-add-mode-active');
    // Tip bar
    addTipEl = document.createElement('div');
    addTipEl.className = 'anno-add-mode-tip';
    addTipEl.textContent = '点击原型任意位置添加标注，按ESC或点击"新增"按钮退出';
    document.body.appendChild(addTipEl);
    // Capture listener on window (fires before everything else)
    window.addEventListener('click', handleAddClick, true);
  } else {
    exitAddMode();
  }
}

function exitAddMode() {
  isAdding = false;
  var addBtn = $('annoAddBtn');
  if (addBtn) addBtn.classList.remove('active');
  document.body.classList.remove('anno-add-mode-active');
  if (addTipEl) { addTipEl.remove(); addTipEl = null; }
  window.removeEventListener('click', handleAddClick, true);
}

/* ================================================================
   Card
   ================================================================ */
function showCard(idx, event) {
  mergedAnnotations = getMerged();
  var a = mergedAnnotations[idx];
  if (!a) return;
  currentCardIdx = idx;
  var card = $('annoCard');
  if (!card) return;

  // Number badge
  var numEl = $('annoCardNum');
  if (numEl) { numEl.textContent = idx + 1; numEl.className = 'anno-card-num ' + (a.color || getColor(idx)); }
  // Title (short label) vs Summary (description)
  var titleEl = $('annoCardTitle');
  if (titleEl) titleEl.textContent = a.title || a.summary || '';
  // Summary
  var summaryEl = $('annoCardSummary');
  if (summaryEl) summaryEl.textContent = a.title ? (a.summary || '') : '';
  // Detail
  var detailEl = $('annoCardDetail');
  if (detailEl) {
    var detailHtml = '';
    if (a.detail && a.detail.length > 0) {
      detailHtml = '<div class="anno-card-detail-title">详细说明</div><ul>' +
        a.detail.map(function(d) { return '<li>' + d + '</li>'; }).join('') +
        '</ul>';
    }
    detailEl.innerHTML = detailHtml;
  }
  // Time
  var timeEl = $('annoCardTime');
  if (timeEl) timeEl.textContent = '更新于 ' + (a.date || getDate());

  // View vs Edit mode
  var viewModeEl = $('annoCardViewMode');
  var editModeEl = $('annoCardEditMode');
  if (currentMode === modes.EDIT) {
    if (viewModeEl) viewModeEl.style.display = 'none';
    if (editModeEl) editModeEl.style.display = 'block';
    // Fill edit form
    var editTitle = $('annoEditTitle');
    if (editTitle) editTitle.value = a.summary || '';
    var editContent = $('annoEditContent');
    if (editContent) editContent.value = (a.detail || []).join('\n') || '';
    // Store the original data for this annotation
    card.dataset.editingAnnoIdx = idx;
  } else {
    if (viewModeEl) viewModeEl.style.display = '';
    if (editModeEl) editModeEl.style.display = 'none';
  }

  // Position card
  var left, top;
  if (event) {
    left = event.clientX + 20;
    top = event.clientY + 20;
  } else {
    left = window.innerWidth / 2 - 180;
    top = 100;
  }
  if (left + 360 > window.innerWidth) left = window.innerWidth - 390;
  if (left < 10) left = 10;
  if (top + 300 > window.innerHeight) top = window.innerHeight - 320;
  if (top < 10) top = 10;
  card.style.left = left + 'px';
  card.style.top = top + 'px';
  card.classList.add('show');
}

function hideCard() {
  var card = $('annoCard');
  if (card) card.classList.remove('show');
  currentCardIdx = -1;
}

/* ---- Card Save ---- */
function saveCardEdit() {
  var card = $('annoCard');
  if (!card) return;
  var idx = parseInt(card.dataset.editingAnnoIdx);
  mergedAnnotations = getMerged();
  var a = mergedAnnotations[idx];
  if (!a) return;

  var newSummary = ($('annoEditTitle') || {}).value || '';
  var newContent = ($('annoEditContent') || {}).value || '';

  a.summary = newSummary;
  a.detail = newContent.split('\n').filter(function(l) { return l.trim(); });
  a.date = getDate();

  // If it's a custom annotation, update the stored version
  var customIdx = idx - (typeof ANNOTATIONS !== 'undefined' ? ANNOTATIONS.length : 0);
  if (customIdx >= 0 && customIdx < customAnnotations.length) {
    pushUndo();
    customAnnotations[customIdx] = a;
    saveCustom();
  }

  // Switch back to view mode
  var viewModeEl = $('annoCardViewMode');
  var editModeEl = $('annoCardEditMode');
  if (viewModeEl) viewModeEl.style.display = '';
  if (editModeEl) editModeEl.style.display = 'none';
  // Update card view
  var summaryEl = $('annoCardSummary');
  if (summaryEl) summaryEl.textContent = a.summary;
  var detailEl = $('annoCardDetail');
  if (detailEl) {
    detailEl.innerHTML = a.detail && a.detail.length > 0
      ? '<div class="anno-card-detail-title">详细说明</div><ul>' +
        a.detail.map(function(d) { return '<li>' + d + '</li>'; }).join('') + '</ul>'
      : '';
  }
  var timeEl = $('annoCardTime');
  if (timeEl) timeEl.textContent = '更新于 ' + a.date;

  // Refresh dots and panel
  removeAllDots();
  renderAllDots();
  if (isPanelOpen) renderPanel();
  showToast('保存成功！', 'success');
}

function cancelCardEdit() {
  var viewModeEl = $('annoCardViewMode');
  var editModeEl = $('annoCardEditMode');
  if (viewModeEl) viewModeEl.style.display = '';
  if (editModeEl) editModeEl.style.display = 'none';
}

function deleteCardAnnotation() {
  var card = $('annoCard');
  if (!card) return;
  var idx = parseInt(card.dataset.editingAnnoIdx);
  mergedAnnotations = getMerged();
  var a = mergedAnnotations[idx];
  if (!a) return;
  if (!confirm('确定要删除标注"' + (a.summary || a.title) + '"吗？')) return;

  var customIdx = idx - (typeof ANNOTATIONS !== 'undefined' ? ANNOTATIONS.length : 0);
  if (customIdx >= 0 && customIdx < customAnnotations.length) {
    pushUndo();
    customAnnotations.splice(customIdx, 1);
    saveCustom();
  }
  hideCard();
  removeAllDots();
  renderAllDots();
  if (isPanelOpen) renderPanel();
  showToast('标注已删除', 'warning');
}

/* ================================================================
   Global Event Handlers
   ================================================================ */
// Click outside: close card
document.addEventListener('click', function(e) {
  if (_annoJustAdded) return;
  var card = $('annoCard');
  if (!card) return;
  var t = e.target;
  while (t && t.nodeType === 3) t = t.parentNode;
  if (!t) return;
  if (!card.contains(t) && !t.closest('.anno-marker') &&
      !t.closest('.anno-panel-item')) {
    hideCard();
  }
});

// ESC: exit add mode or close card; Ctrl+Z: undo; Ctrl+Y/Ctrl+Shift+Z: redo
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault(); undo(); return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
    e.preventDefault(); redo(); return;
  }
  if (e.key === 'Escape') {
    if (isAdding) { exitAddMode(); return; }
    if ($('annoCard') && $('annoCard').classList.contains('show')) { hideCard(); return; }
  }
});

/* ================================================================
   Card Event Delegation
   ================================================================ */
function initCardEvents() {
  var card = $('annoCard');
  if (!card) return;

  // Close
  var closeBtn = card.querySelector('.anno-card-close');
  if (closeBtn) closeBtn.addEventListener('click', function(e) { e.stopPropagation(); hideCard(); });

  // Edit button
  var editBtn = card.querySelector('.anno-card-edit-btn');
  if (editBtn) editBtn.addEventListener('click', function() {
    setMode(modes.EDIT);
    showCard(currentCardIdx, null);
  });

  // Save
  var saveBtn = $('annoCardSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveCardEdit);

  // Cancel
  var cancelBtn = $('annoCardCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', cancelCardEdit);

  // Delete
  var deleteBtn = $('annoCardDeleteBtn');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteCardAnnotation);
}

/* ================================================================
   Toast
   ================================================================ */
function showToast(msg, type) {
  var toast = document.createElement('div');
  toast.className = 'anno-toast ' + (type || 'success');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 2000);
}

/* ================================================================
   Initialization
   ================================================================ */
function init() {
  loadCustom();
  initToolbar();
  initCardEvents();
  renderAllDots();

  // Track current page and re-render when it changes (generic DOM observation)
  var _lastPage = detectCurrentPage();
  var _recheckTimer = null;
  function recheckPage() {
    clearTimeout(_recheckTimer);
    _recheckTimer = setTimeout(function() {
      var newPage = detectCurrentPage();
      if (newPage !== _lastPage) {
        _lastPage = newPage;
        if (!isCollapsed) { removeAllDots(); renderAllDots(); }
        if (isPanelOpen) renderPanel();
      }
    }, 300);
  }

  // Generic DOM observation: watch body subtree for attribute/display changes
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) {
        recheckPage();
        return;
      }
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        recheckPage();
        return;
      }
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    subtree: true,
    childList: true
  });

  // Expose to window for external use
  window.AnnoNS = window.AnnoNS || {};
  window.AnnoNS.refresh = function() { removeAllDots(); renderAllDots(); };
  window.AnnoNS.showPanel = function() { isPanelOpen = true; $('annoRightPanel') && ($('annoRightPanel').classList.add('show')); renderPanel(); };
  window.AnnoNS.hidePanel = function() { isPanelOpen = false; $('annoRightPanel') && ($('annoRightPanel').classList.remove('show')); };
  window.AnnoNS.getAnnotations = getMerged;
  window.AnnoNS.exportJSON = function() { return JSON.stringify(getMerged(), null, 2); };
  window.AnnoNS.importCustom = function(json) {
    try {
      var arr = JSON.parse(json);
      if (Array.isArray(arr)) { customAnnotations = customAnnotations.concat(arr); saveCustom(); removeAllDots(); renderAllDots(); }
    } catch(e) {}
  };
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
