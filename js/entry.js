(() => {
  const { $, now, esc, loadWorkspace, saveWorkspace, findEntry } = window.Osayi;
  const params = new URLSearchParams(location.search);
  const workspace = loadWorkspace();
  const match = findEntry(workspace, params.get('entry'), params.get('db'));
  const returnLink = $('#returnToIndex');

  if (!match) {
    $('#entryEditorPanel').innerHTML = '<div class="empty-state"><h2>Entry not found</h2><p>It may have been deleted or this link is incomplete.</p></div>';
    return;
  }

  const { database, entry } = match;
  returnLink.href = `index.html?db=${encodeURIComponent(database.id)}`;
  $('#entryDatabaseName').textContent = `${database.name} · LOCAL DATABASE`;

  function render() {
    document.title = `${entry.title || 'Untitled'} — Osayi`;
    $('#entryEditorPanel').innerHTML = `<form class="editor" id="entryEditorForm"><input class="editor-title" name="title" value="${esc(entry.title)}" maxlength="120" placeholder="Untitled" autofocus /><div class="editor-options"><select name="type"><option value="note" ${entry.type === 'note' ? 'selected' : ''}>note</option><option value="task" ${entry.type === 'task' ? 'selected' : ''}>task</option></select><input name="tags" value="${esc((entry.tags || []).join(', '))}" placeholder="tags, comma separated" /><input name="due" type="date" value="${entry.due || ''}" title="Due date" /></div><textarea name="content" placeholder="Write in Markdown…\n\n# A heading\n- a thought\n- [ ] a task">${esc(entry.content)}</textarea><div class="editor-footer"><span class="editor-status">Markdown supported · updated ${new Date(entry.updatedAt).toLocaleString()}</span><div class="editor-actions"><button type="button" class="button button-danger" id="deleteEntryBtn">delete</button><button class="button button-primary">save changes</button></div></div></form>`;
    $('#entryEditorForm').addEventListener('submit', saveEntry);
    $('#deleteEntryBtn').onclick = deleteEntry;
  }

  function saveEntry(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    Object.assign(entry, { title: form.get('title').trim() || 'Untitled', type: form.get('type'), tags: form.get('tags').split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean), due: form.get('due'), content: form.get('content'), updatedAt: now() });
    saveWorkspace(workspace);
    render();
  }

  function deleteEntry() {
    if (!confirm(`Delete “${entry.title}”?`)) return;
    database.entries = database.entries.filter((item) => item.id !== entry.id);
    saveWorkspace(workspace);
    location.href = returnLink.href;
  }

  render();
})();
