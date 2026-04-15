/**
 * render.js
 * Funzioni di rendering: shelf, grid, modal, stats.
 */

import { state, THEMES, CONNECTIONS, getFilteredBooks, getSortedBooks, groupByTheme } from './store.js';
import { openDetailModal } from './ui.js';

// ─── STATS ────────────────────────────────────────────────
export function renderStats() {
  const filtered = getFilteredBooks();
  document.getElementById('statTotal').textContent   = filtered.length;
  document.getElementById('statRead').textContent    = filtered.filter(b => b.status === 'read').length;
  document.getElementById('statUnread').textContent  = filtered.filter(b => b.status === 'unread').length;
  document.getElementById('statThemes').textContent  = new Set(filtered.map(b => b.theme)).size;
  document.getElementById('statAuthors').textContent = new Set(filtered.map(b => b.author)).size;
}

// ─── MAIN RENDER ──────────────────────────────────────────
export function render() {
  renderStats();
  const filtered = getSortedBooks(getFilteredBooks());
  const main = document.getElementById('mainContent');
  if (state.view === 'shelf') renderShelf(filtered, main);
  else renderGrid(filtered, main);
}

// ─── SHELF VIEW ───────────────────────────────────────────
function renderShelf(filtered, container) {
  // Se non si ordina per tema, mostra tutti in una riga continua
  if (state.sortOrder !== 'theme') {
    container.innerHTML = `
      <div class="shelf-section">
        <div class="bookshelf">
          <div class="books-row">
            ${filtered.map(b => spineHTML(b)).join('')}
          </div>
        </div>
      </div>`;
    return;
  }

  const groups = groupByTheme(filtered);
  let html = '';

  Object.entries(THEMES).forEach(([key, theme]) => {
    const books = groups[key];
    if (!books || !books.length) return;

    html += `
      <div class="shelf-section" id="shelf-${key}">
        <div class="shelf-header" onclick="toggleShelf('${key}')">
          <div class="shelf-color-bar" style="background:${theme.color}"></div>
          <span class="shelf-title">${theme.label}</span>
          <span class="shelf-count">${books.length}</span>
          <span class="shelf-toggle" id="toggle-${key}">▾</span>
        </div>
        <div class="bookshelf" id="bookshelf-${key}">
          <div class="books-row">
            ${books.map(b => spineHTML(b)).join('')}
          </div>
        </div>
        ${connectionsBlockHTML(key, books)}
      </div>`;
  });

  container.innerHTML = html || '<div class="empty-shelf">nessun libro trovato</div>';
}

function spineHTML(book) {
  const theme = THEMES[book.theme] || { color: '#888' };
  const short = book.title.length > 16 ? book.title.substring(0, 14) + '…' : book.title;
  const opacity = book.status === 'read' ? '1' : '0.55';
  const bgOpacity = book.status === 'read' ? 'dd' : '55';
  return `
    <div class="book-spine ${book.status}"
         style="background:linear-gradient(135deg,${theme.color}${bgOpacity},${theme.color}44);opacity:${opacity}"
         onclick="window.__openBook('${book.id}')"
         title="${escapeAttr(book.title)} — ${escapeAttr(book.author)}">
      <span class="book-spine-title">${escapeHTML(short)}</span>
    </div>`;
}

function connectionsBlockHTML(themeKey, themeBooks) {
  const titles = new Set(themeBooks.map(b => b.title));
  const rel = CONNECTIONS.filter(c => titles.has(c.from) || titles.has(c.to));
  if (!rel.length) return '';

  const items = rel.map(c => `
    <div class="connection-item">
      <span class="connection-from">${escapeHTML(c.from)}</span>
      <span class="connection-arrow">→</span>
      <span class="connection-to">${escapeHTML(c.to)}</span>
      <span class="connection-reason">${escapeHTML(c.reason)}</span>
    </div>`).join('');

  return `
    <div class="connections-view" id="conn-${themeKey}">
      <div class="connections-title">Connessioni tematiche</div>
      ${items}
    </div>
    <div class="connections-footer">
      <button class="filter-btn" onclick="toggleConnections('${themeKey}', this)">
        connessioni (${rel.length})
      </button>
    </div>`;
}

// ─── GRID VIEW ────────────────────────────────────────────
function renderGrid(filtered, container) {
  if (state.sortOrder !== 'theme') {
    container.innerHTML = `
      <div class="grid-view">
        ${filtered.map(b => gridCardHTML(b)).join('')}
      </div>`;
    return;
  }

  const groups = groupByTheme(filtered);
  let html = '';

  Object.entries(THEMES).forEach(([key, theme]) => {
    const books = groups[key];
    if (!books || !books.length) return;
    html += `
      <div class="shelf-section">
        <div class="shelf-header">
          <div class="shelf-color-bar" style="background:${theme.color}"></div>
          <span class="shelf-title">${theme.label}</span>
          <span class="shelf-count">${books.length}</span>
        </div>
        <div class="grid-view">
          ${books.map(b => gridCardHTML(b)).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html || '<div class="empty-shelf">nessun libro trovato</div>';
}

function gridCardHTML(book) {
  const theme = THEMES[book.theme] || { color: '#888' };
  const stars = book.rating > 0
    ? `<span style="color:var(--gold);font-size:0.65rem">${'★'.repeat(book.rating)}</span>`
    : '';
  return `
    <div class="grid-card" onclick="window.__openBook('${book.id}')">
      <div class="grid-card-theme" style="background:${theme.color}"></div>
      <div class="grid-card-title">${escapeHTML(book.title)}</div>
      <div class="grid-card-author">${escapeHTML(book.author)}</div>
      <div class="grid-card-meta">
        <span class="read-badge ${book.status === 'read' ? 'done' : ''}">
          ${book.status === 'read' ? '✓ letto' : '○ da leggere'}
        </span>
        ${stars}
      </div>
    </div>`;
}

// ─── AUTHOR DROPDOWN ──────────────────────────────────────
export function renderAuthorDropdown(currentAuthor) {
  const authors = [...new Set(state.books.map(b => b.author))]
    .sort((a, b) => a.localeCompare(b, 'it'));

  const dd = document.getElementById('authorDropdown');
  dd.innerHTML =
    `<div class="author-item ${!currentAuthor ? 'active' : ''}"
          onclick="window.__setAuthor(null)">tutti gli autori</div>` +
    authors.map(a =>
      `<div class="author-item ${currentAuthor === a ? 'active' : ''}"
            onclick="window.__setAuthor(${JSON.stringify(a)})">${escapeHTML(a)}</div>`
    ).join('');
}

// ─── DETAIL MODAL ─────────────────────────────────────────
export function renderDetailModal(book) {
  const theme = THEMES[book.theme] || { color: '#888' };

  document.getElementById('modalColorBar').style.background = theme.color;
  document.getElementById('modalTitle').textContent  = book.title;
  document.getElementById('modalAuthor').textContent = book.author;
  document.getElementById('modalNotes').value        = book.notes || '';

  // Status buttons
  document.getElementById('btnRead').className   = 'status-btn' + (book.status === 'read'   ? ' active-read'   : '');
  document.getElementById('btnUnread').className = 'status-btn' + (book.status === 'unread' ? ' active-unread' : '');

  // Stars
  const stars = document.querySelectorAll('.star');
  stars.forEach((s, i) => s.classList.toggle('filled', i < (book.rating || 0)));

  // Connections
  const conns = CONNECTIONS.filter(c => c.from === book.title || c.to === book.title);
  const ce = document.getElementById('modalConnections');
  const cs = document.getElementById('connectionsSection');
  if (conns.length) {
    ce.innerHTML = conns.map(c => {
      const other = c.from === book.title ? c.to : c.from;
      return `<span class="connection-tag" title="${escapeAttr(c.reason)}">${escapeHTML(other)}</span>`;
    }).join('');
    cs.style.display = '';
  } else {
    cs.style.display = 'none';
  }
}

// ─── UTILS ────────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
