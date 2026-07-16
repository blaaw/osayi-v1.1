(() => {
  const { $, now, esc, fmtDate, loadWorkspace, saveWorkspace, createDatabase, createEntry } = window.Osayi;
  let workspace = loadWorkspace();
  let activeDatabaseId = workspace.databases[0]?.id || null;
  let activeEntryId = null;
  let currentView = 'all';
  let listVisible = true;

  const activeDatabase = () => workspace.databases.find((database) => database.id === activeDatabaseId);
  const activeEntry = () => activeDatabase()?.entries.find((entry) => entry.id === activeEntryId);

  function render() {
    const database = activeDatabase();
    if (!database) activeEntryId = null;
    else if (!activeEntry()) activeEntryId = database.entries[0]?.id || null;

    $('#databaseCount').textContent = workspace.databases.length;
    $('#databaseList').innerHTML = workspace.databases.map((item) => `<div class="database-row"><span class="db-dot"></span><button data-db="${item.id}" class="${item.id === activeDatabaseId ? 'active' : ''}" title="${esc(item.name)}">${esc(item.name)}</button></div>`).join('');
    $('#databaseTitle').textContent = database?.name || 'Welcome to Osayi';
    $('#databaseMeta').textContent = database ? `${database.entries.length} ENTRIES · LOCAL DATABASE` : 'LOCAL-FIRST WORKSPACE';
    $('#renameDbBtn').disabled = $('#deleteDbBtn').disabled = $('#newItemBtn').disabled = !database;
    $('#toggleListBtn').disabled = !database;
    renderDashboard(database);
    renderTags(database);
    renderEntries(database);
    renderEditor();
  }

  function renderDashboard(database) {
    if (!database) { $('#dashboard').innerHTML = ''; return; }
    const tasks = database.entries.filter((entry) => entry.type === 'task');
    const complete = tasks.filter((entry) => entry.done).length;
    const due = tasks.filter((entry) => entry.due && !entry.done && entry.due <= new Date().toISOString().slice(0, 10)).length;
    $('#dashboard').innerHTML = [[database.entries.length, 'total entries'], [database.entries.filter((entry) => entry.type === 'note').length, 'notes'], [`${complete}/${tasks.length}`, 'tasks complete'], [due, 'due now']].map(([number, label]) => `<div class="metric"><b>${number}</b><span>${label}</span></div>`).join('');
  }

  function renderTags(database) {
    const selected = $('#tagFilter').value;
    const tags = database ? [...new Set(database.entries.flatMap((entry) => entry.tags || []))].sort() : [];
    $('#tagFilter').innerHTML = '<option value="">all tags</option>' + tags.map((tag) => `<option value="${esc(tag)}">#${esc(tag)}</option>`).join('');
    $('#tagFilter').value = tags.includes(selected) ? selected : '';
  }

  function filteredEntries(database) {
    const term = $('#searchInput').value.trim().toLowerCase();
    const tag = $('#tagFilter').value;
    const sort = $('#sortSelect').value;
    return database.entries.filter((entry) => (currentView === 'all' || currentView === 'notes' && entry.type === 'note' || currentView === 'tasks' && entry.type === 'task' || currentView === 'open' && entry.type === 'task' && !entry.done || currentView === 'done' && entry.type === 'task' && entry.done) && (!term || `${entry.title} ${entry.content} ${(entry.tags || []).join(' ')}`.toLowerCase().includes(term)) && (!tag || (entry.tags || []).includes(tag))).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : sort === 'due' ? (a.due || '9999').localeCompare(b.due || '9999') : b.updatedAt.localeCompare(a.updatedAt));
  }

  function renderEntries(database) {
    if (!database) {
      $('#resultCount').textContent = '0 items';
      $('#entryList').innerHTML = '<div class="empty-state"><span class="empty-icon">⌘</span><h2>Your local workspace</h2><p>Create a database, then write notes and manage tasks in plain Markdown.</p><button class="button button-primary" id="emptyCreateBtn">create first database</button></div>';
      return;
    }
    const entries = filteredEntries(database);
    $('#resultCount').textContent = `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`;
    $('#entryList').innerHTML = entries.length ? entries.map((entry) => `<button class="entry-card ${entry.done ? 'done' : ''} ${entry.id === activeEntryId ? 'active' : ''}" data-entry="${entry.id}"><div class="entry-card-top">${entry.type === 'task' ? `<input class="task-check" data-toggle="${entry.id}" type="checkbox" ${entry.done ? 'checked' : ''} aria-label="Mark task complete" />` : '<span class="type">note</span>'}<span class="entry-title">${esc(entry.title || 'Untitled')}</span></div><div class="entry-meta">${entry.due ? `<span>due ${fmtDate(entry.due)}</span>` : ''}${(entry.tags || []).slice(0, 3).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}</div></button>`).join('') : '<p class="storage-note">No entries match this query.</p>';
  }

  function renderEditor() {
    const entry = activeEntry();
    if (!entry) {
      $('#entryEditorPanel').innerHTML = '<div class="empty-state"><h2>Select an entry</h2><p>Your note editor stays here while you browse the database.</p></div>';
      return;
    }
    $('#entryEditorPanel').innerHTML = `<form class="editor" id="entryEditorForm"><input class="editor-title" name="title" value="${esc(entry.title)}" maxlength="120" placeholder="Untitled" autofocus /><div class="editor-options"><select name="type"><option value="note" ${entry.type === 'note' ? 'selected' : ''}>note</option><option value="task" ${entry.type === 'task' ? 'selected' : ''}>task</option></select><input name="tags" value="${esc((entry.tags || []).join(', '))}" placeholder="tags, comma separated" /><input name="due" type="date" value="${entry.due || ''}" title="Due date" /></div><textarea name="content" placeholder="Write in Markdown…\n\n# A heading\n- a thought\n- [ ] a task">${esc(entry.content)}</textarea><div class="editor-footer"><span class="editor-status">Markdown supported · updated ${new Date(entry.updatedAt).toLocaleString()}</span><div class="editor-actions"><button type="button" class="button button-danger" id="deleteEntryBtn">delete</button><button class="button button-primary">save changes</button></div></div></form>`;
    $('#entryEditorForm').addEventListener('submit', saveEntry);
    $('#deleteEntryBtn').onclick = deleteEntry;
  }

  function openDatabaseDialog(rename = false) {
    $('#databaseDialogTitle').textContent = rename ? 'Rename database' : 'New database';
    $('#databaseNameInput').value = rename ? activeDatabase().name : '';
    $('#databaseSubmit').textContent = rename ? 'save name' : 'create database';
    $('#databaseDialog').dataset.rename = rename;
    $('#databaseDialog').showModal();
    $('#databaseNameInput').focus();
  }

  function saveDatabase(event) {
    event.preventDefault();
    const name = $('#databaseNameInput').value.trim();
    if (!name) return;
    if ($('#databaseDialog').dataset.rename === 'true') activeDatabase().name = name;
    else { const database = createDatabase(name); workspace.databases.push(database); activeDatabaseId = database.id; activeEntryId = null; }
    saveWorkspace(workspace); $('#databaseDialog').close(); render();
  }

  function addEntry() {
    const database = activeDatabase();
    if (!database) return;
    const entry = createEntry();
    database.entries.unshift(entry); activeEntryId = entry.id;
    saveWorkspace(workspace); render();
    $('#entryEditorForm [name="title"]').focus();
  }

  function saveEntry(event) {
    event.preventDefault();
    const entry = activeEntry();
    if (!entry) return;
    const form = new FormData(event.currentTarget);
    Object.assign(entry, { title: form.get('title').trim() || 'Untitled', type: form.get('type'), tags: form.get('tags').split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean), due: form.get('due'), content: form.get('content'), updatedAt: now() });
    saveWorkspace(workspace); render();
  }

  function deleteEntry() {
    const database = activeDatabase(); const entry = activeEntry();
    if (!database || !entry || !confirm(`Delete “${entry.title}”?`)) return;
    database.entries = database.entries.filter((item) => item.id !== entry.id); activeEntryId = database.entries[0]?.id || null;
    saveWorkspace(workspace); render();
  }

  $('#newDatabaseBtn').onclick = () => openDatabaseDialog();
  $('#renameDbBtn').onclick = () => openDatabaseDialog(true);
  $('#databaseCancel').onclick = () => $('#databaseDialog').close();
  $('#databaseForm').addEventListener('submit', saveDatabase);
  $('#deleteDbBtn').onclick = () => { const database = activeDatabase(); if (database && confirm(`Delete database “${database.name}” and its entries?`)) { workspace.databases = workspace.databases.filter((item) => item.id !== database.id); activeDatabaseId = workspace.databases[0]?.id || null; activeEntryId = null; saveWorkspace(workspace); render(); } };
  $('#databaseList').onclick = (event) => { const id = event.target.dataset.db; if (id) { activeDatabaseId = id; activeEntryId = null; render(); } };
  $('#newItemBtn').onclick = addEntry;
  $('#toggleListBtn').onclick = () => { listVisible = !listVisible; $('#workspaceContent').classList.toggle('list-collapsed', !listVisible); $('#toggleListBtn').textContent = listVisible ? 'hide entries' : 'show entries'; $('#toggleListBtn').setAttribute('aria-expanded', String(listVisible)); };
  $('#entryList').onclick = (event) => { if (event.target.id === 'emptyCreateBtn') { openDatabaseDialog(); return; } const entryId = event.target.dataset.toggle; if (entryId) { const entry = activeDatabase().entries.find((item) => item.id === entryId); entry.done = event.target.checked; entry.updatedAt = now(); saveWorkspace(workspace); render(); return; } const card = event.target.closest('[data-entry]'); if (card) { activeEntryId = card.dataset.entry; renderEntries(activeDatabase()); renderEditor(); } };
  document.querySelector('.quick-views').onclick = (event) => { const view = event.target.dataset.view; if (!view) return; currentView = view; document.querySelectorAll('.chip').forEach((button) => button.classList.toggle('active', button.dataset.view === view)); renderEntries(activeDatabase()); };
  ['searchInput', 'tagFilter', 'sortSelect'].forEach((id) => $(`#${id}`).addEventListener(id === 'searchInput' ? 'input' : 'change', () => activeDatabase() && renderEntries(activeDatabase())));
  $('#exportBtn').onclick = () => { const backup = { ...workspace, exportedAt: now() }; const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `osayi-backup-${new Date().toISOString().slice(0, 10)}.json` }); link.click(); URL.revokeObjectURL(link.href); };
  $('#importInput').onchange = async (event) => { const file = event.target.files[0]; if (!file) return; try { const imported = JSON.parse(await file.text()); if (imported?.version !== 1 || !Array.isArray(imported.databases) || !imported.databases.every((database) => typeof database.id === 'string' && Array.isArray(database.entries))) throw new Error('Invalid Osayi backup'); if (!confirm('Replace this browser’s current workspace with the imported backup?')) return; workspace = imported; activeDatabaseId = workspace.databases[0]?.id || null; activeEntryId = null; saveWorkspace(workspace); render(); } catch (error) { alert(`Import failed: ${error.message}`); } finally { event.target.value = ''; } };

  render();
})();
