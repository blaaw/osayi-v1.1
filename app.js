const STORAGE_KEY = 'osayi-local-workspace-v1';
const $ = (selector) => document.querySelector(selector);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();

let state = loadState();
let activeDbId = state.databases[0]?.id || null;
let activeEntryId = null;
let currentView = 'all';

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.version === 1 && Array.isArray(data.databases)) return data;
  } catch (_) { /* start clean */ }
  return { version: 1, exportedAt: null, databases: [] };
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); $('#storageNote').textContent = `saved locally · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; }
function activeDb() { return state.databases.find((db) => db.id === activeDbId); }
function esc(value = '') { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
function fmtDate(date) { return date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''; }

function render() {
  const db = activeDb();
  $('#databaseCount').textContent = state.databases.length;
  $('#databaseList').innerHTML = state.databases.map((item) => `<div class="database-row"><span class="db-dot"></span><button data-db="${item.id}" class="${item.id === activeDbId ? 'active' : ''}" title="${esc(item.name)}">${esc(item.name)}</button></div>`).join('');
  $('#databaseTitle').textContent = db?.name || 'Welcome to Osayi';
  $('#databaseMeta').textContent = db ? `${db.entries.length} ENTRIES · LOCAL DATABASE` : 'LOCAL-FIRST WORKSPACE';
  $('#renameDbBtn').disabled = $('#deleteDbBtn').disabled = !db;
  if (!db) { $('#dashboard').innerHTML = ''; $('#entryList').innerHTML = ''; $('#resultCount').textContent = '0 items'; $('#newItemBtn').disabled = true; showEmpty(); return; }
  $('#newItemBtn').disabled = false;
  renderDashboard(db); renderTags(db); renderEntries(db);
}
function renderDashboard(db) {
  const tasks = db.entries.filter((e) => e.type === 'task'); const complete = tasks.filter((e) => e.done).length;
  const due = tasks.filter((e) => e.due && !e.done && e.due <= new Date().toISOString().slice(0, 10)).length;
  $('#dashboard').innerHTML = [[db.entries.length, 'total entries'], [db.entries.filter((e) => e.type === 'note').length, 'notes'], [`${complete}/${tasks.length}`, 'tasks complete'], [due, 'due now']].map(([n, l]) => `<div class="metric"><b>${n}</b><span>${l}</span></div>`).join('');
}
function renderTags(db) {
  const selected = $('#tagFilter').value; const tags = [...new Set(db.entries.flatMap((e) => e.tags || []))].sort();
  $('#tagFilter').innerHTML = '<option value="">all tags</option>' + tags.map((tag) => `<option value="${esc(tag)}">#${esc(tag)}</option>`).join('');
  $('#tagFilter').value = tags.includes(selected) ? selected : '';
}
function filteredEntries(db) {
  const term = $('#searchInput').value.trim().toLowerCase(), tag = $('#tagFilter').value, sort = $('#sortSelect').value;
  const items = db.entries.filter((e) => (currentView === 'all' || currentView === 'notes' && e.type === 'note' || currentView === 'tasks' && e.type === 'task' || currentView === 'open' && e.type === 'task' && !e.done || currentView === 'done' && e.type === 'task' && e.done) && (!term || `${e.title} ${e.content} ${(e.tags || []).join(' ')}`.toLowerCase().includes(term)) && (!tag || (e.tags || []).includes(tag)));
  return items.sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : sort === 'due' ? (a.due || '9999').localeCompare(b.due || '9999') : b.updatedAt.localeCompare(a.updatedAt));
}
function renderEntries(db) {
  const entries = filteredEntries(db); $('#resultCount').textContent = `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`;
  if (activeEntryId && !db.entries.some((e) => e.id === activeEntryId)) activeEntryId = null;
  $('#entryList').innerHTML = entries.length ? entries.map((e) => `<button class="entry-card ${e.id === activeEntryId ? 'active' : ''} ${e.done ? 'done' : ''}" data-entry="${e.id}"><div class="entry-card-top">${e.type === 'task' ? `<input class="task-check" data-toggle="${e.id}" type="checkbox" ${e.done ? 'checked' : ''} aria-label="Mark task complete" />` : '<span class="type">note</span>'}<span class="entry-title">${esc(e.title || 'Untitled')}</span></div><div class="entry-meta">${e.due ? `<span>due ${fmtDate(e.due)}</span>` : ''}${(e.tags || []).slice(0,3).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}</div></button>`).join('') : '<p class="storage-note">No entries match this query.</p>';
  if (activeEntryId) renderEditor(db.entries.find((e) => e.id === activeEntryId)); else showEmpty('Select an entry or create one.');
}
function showEmpty(message) { $('#editorPanel').innerHTML = `<div class="empty-state"><span class="empty-icon">⌘</span><h2>${activeDb() ? 'Nothing selected' : 'Your local workspace'}</h2><p>${message || 'Create a database, then write notes and manage tasks in plain Markdown.'}</p>${activeDb() ? '<button class="button button-primary" id="emptyNewEntry">+ new entry</button>' : '<button class="button button-primary" id="emptyCreateBtn">create first database</button>'}</div>`; }
function renderEditor(entry) {
  if (!entry) return showEmpty();
  $('#editorPanel').innerHTML = `<form class="editor" id="editorForm"><input class="editor-title" name="title" value="${esc(entry.title)}" maxlength="120" placeholder="Untitled" /><div class="editor-options"><select name="type"><option value="note" ${entry.type === 'note' ? 'selected' : ''}>note</option><option value="task" ${entry.type === 'task' ? 'selected' : ''}>task</option></select><input name="tags" value="${esc((entry.tags || []).join(', '))}" placeholder="tags, comma separated" /><input name="due" type="date" value="${entry.due || ''}" title="Due date" /></div><textarea name="content" placeholder="Write in Markdown…\n\n# A heading\n- a thought\n- [ ] a task">${esc(entry.content)}</textarea><div class="editor-footer"><span class="editor-status">Markdown supported · updated ${new Date(entry.updatedAt).toLocaleString()}</span><div class="editor-actions"><button type="button" class="button button-danger" id="deleteEntryBtn">delete</button><button class="button button-primary">save changes</button></div></div></form>`;
  $('#editorForm').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); Object.assign(entry, { title: form.get('title').trim() || 'Untitled', type: form.get('type'), tags: form.get('tags').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean), due: form.get('due'), content: form.get('content'), updatedAt: now() }); save(); render(); });
  $('#deleteEntryBtn').onclick = () => { if (confirm(`Delete “${entry.title}”?`)) { activeDb().entries = activeDb().entries.filter((e) => e.id !== entry.id); activeEntryId = null; save(); render(); } };
}
function openDatabaseDialog(rename = false) { const db = activeDb(); $('#databaseDialogTitle').textContent = rename ? 'Rename database' : 'New database'; $('#databaseNameInput').value = rename ? db.name : ''; $('#databaseSubmit').textContent = rename ? 'save name' : 'create database'; $('#databaseDialog').dataset.rename = rename; $('#databaseDialog').showModal(); $('#databaseNameInput').focus(); }
function createEntry() { const db = activeDb(); if (!db) return; const entry = { id: uid(), type: 'note', title: 'Untitled', content: '', tags: [], due: '', done: false, createdAt: now(), updatedAt: now() }; db.entries.unshift(entry); activeEntryId = entry.id; save(); render(); document.querySelector('.editor-title')?.focus(); }

$('#newDatabaseBtn').onclick = () => openDatabaseDialog(); $('#emptyCreateBtn').onclick = () => openDatabaseDialog(); $('#renameDbBtn').onclick = () => openDatabaseDialog(true);
$('#databaseForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const name = $('#databaseNameInput').value.trim(); if (!name) return; if ($('#databaseDialog').dataset.rename === 'true') activeDb().name = name; else { const db = { id: uid(), name, entries: [], createdAt: now() }; state.databases.push(db); activeDbId = db.id; activeEntryId = null; } save(); $('#databaseDialog').close(); render(); });
$('#deleteDbBtn').onclick = () => { const db = activeDb(); if (db && confirm(`Delete database “${db.name}” and its entries?`)) { state.databases = state.databases.filter((d) => d.id !== db.id); activeDbId = state.databases[0]?.id || null; activeEntryId = null; save(); render(); } };
$('#databaseList').onclick = (event) => { const id = event.target.dataset.db; if (id) { activeDbId = id; activeEntryId = null; render(); } };
$('#newItemBtn').onclick = createEntry; $('#editorPanel').onclick = (event) => { if (event.target.id === 'emptyNewEntry') createEntry(); if (event.target.id === 'emptyCreateBtn') openDatabaseDialog(); };
$('#entryList').onclick = (event) => { const toggle = event.target.dataset.toggle; if (toggle) { const entry = activeDb().entries.find((e) => e.id === toggle); entry.done = event.target.checked; entry.updatedAt = now(); save(); render(); return; } const card = event.target.closest('[data-entry]'); if (card) { activeEntryId = card.dataset.entry; renderEntries(activeDb()); } };
document.querySelector('.quick-views').onclick = (event) => { const view = event.target.dataset.view; if (!view) return; currentView = view; document.querySelectorAll('.chip').forEach((b) => b.classList.toggle('active', b.dataset.view === view)); renderEntries(activeDb()); };
['searchInput','tagFilter','sortSelect'].forEach((id) => $("#" + id).addEventListener(id === 'searchInput' ? 'input' : 'change', () => activeDb() && renderEntries(activeDb())));
$('#exportBtn').onclick = () => { const exportData = { ...state, exportedAt: now() }; const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `osayi-backup-${new Date().toISOString().slice(0,10)}.json` }); link.click(); URL.revokeObjectURL(link.href); };
$('#importInput').onchange = async (event) => { const file = event.target.files[0]; if (!file) return; try { const imported = JSON.parse(await file.text()); if (imported?.version !== 1 || !Array.isArray(imported.databases) || !imported.databases.every((db) => typeof db.id === 'string' && Array.isArray(db.entries))) throw new Error('Invalid Osayi backup'); if (!confirm('Replace this browser’s current workspace with the imported backup?')) return; state = imported; activeDbId = state.databases[0]?.id || null; activeEntryId = null; save(); render(); } catch (error) { alert(`Import failed: ${error.message}`); } finally { event.target.value = ''; } };
render();
