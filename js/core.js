window.Osayi = (() => {
  const STORAGE_KEY = 'osayi-local-workspace-v1';
  const $ = (selector) => document.querySelector(selector);
  const now = () => new Date().toISOString();
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const esc = (value = '') => { const element = document.createElement('span'); element.textContent = value; return element.innerHTML; };
  const fmtDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  function loadWorkspace() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data?.version === 1 && Array.isArray(data.databases)) return data;
    } catch (_) { /* Start with a clean workspace. */ }
    return { version: 1, exportedAt: null, databases: [] };
  }

  function saveWorkspace(workspace) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    const storageNote = $('#storageNote');
    if (storageNote) storageNote.textContent = `saved locally · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function createDatabase(name) {
    return { id: uid(), name, entries: [], createdAt: now() };
  }

  function createEntry() {
    return { id: uid(), type: 'note', title: 'Untitled', content: '', tags: [], due: '', done: false, createdAt: now(), updatedAt: now() };
  }

  function findEntry(workspace, entryId, databaseId) {
    const preferredDatabase = workspace.databases.find((database) => database.id === databaseId);
    const database = preferredDatabase?.entries.some((entry) => entry.id === entryId)
      ? preferredDatabase
      : workspace.databases.find((item) => item.entries.some((entry) => entry.id === entryId));
    return database ? { database, entry: database.entries.find((entry) => entry.id === entryId) } : null;
  }

  return { $, now, uid, esc, fmtDate, loadWorkspace, saveWorkspace, createDatabase, createEntry, findEntry };
})();
