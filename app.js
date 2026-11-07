let CFG;
let editingId = null;

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const submitBtn = document.getElementById('task-submit');
const list = document.getElementById('task-list');
const statusEl = document.getElementById('status-message');

function showMessage(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? 'error' : 'ok';
}

async function api(query = '', options = {}) {
  const url = `${CFG.supabaseUrl}/rest/v1/${CFG.tableName}${query}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: CFG.supabasePublishableKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    const tasks = await api('?select=*&order=id.asc');
    renderTasks(tasks);
    showMessage('');
  } catch (e) {
    showMessage('Failed to load tasks: ' + e.message, true);
  }
}

function renderTasks(tasks) {
  list.innerHTML = '';
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.completed ? ' done' : '');
    item.dataset.id = t.id;

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = t.title;

    const desc = document.createElement('div');
    desc.className = 'task-description';
    desc.textContent = t.description || '';

    const status = document.createElement('div');
    status.className = 'task-status';
    status.textContent = t.completed ? 'Completed' : 'Not completed';

    const toggle = document.createElement('button');
    toggle.className = 'toggle-task';
    toggle.textContent = t.completed ? 'Mark incomplete' : 'Mark complete';
    toggle.addEventListener('click', () => toggleTask(t));

    const edit = document.createElement('button');
    edit.className = 'edit-task';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => startEdit(t));

    const del = document.createElement('button');
    del.className = 'delete-task';
    del.textContent = 'Delete';
    del.addEventListener('click', () => deleteTask(t.id));

    item.append(title, desc, status, toggle, edit, del);
    list.appendChild(item);
  });
}

function startEdit(t) {
  editingId = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || '';
  submitBtn.textContent = 'Save changes';
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = 'Add task';
}

async function toggleTask(t) {
  try {
    await api(`?id=eq.${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !t.completed })
    });
    showMessage('Status updated');
    loadTasks();
  } catch (e) {
    showMessage('Failed to update status: ' + e.message, true);
  }
}

async function deleteTask(id) {
  try {
    await api(`?id=eq.${id}`, { method: 'DELETE' });
    showMessage('Task deleted');
    loadTasks();
  } catch (e) {
    showMessage('Failed to delete task: ' + e.message, true);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;

  try {
    if (editingId === null) {
      await api('', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ title, description, completed: false })
      });
      showMessage('Task added');
    } else {
      await api(`?id=eq.${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description })
      });
      showMessage('Task updated');
    }
    resetForm();
    loadTasks();
  } catch (e) {
    showMessage('Operation failed: ' + e.message, true);
  }
});

(async function init() {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    CFG = await res.json();
    loadTasks();
  } catch (e) {
    showMessage('Failed to load config.json: ' + e.message, true);
  }
})();