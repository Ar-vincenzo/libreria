/**
 * render.js
 * Funzioni di rendering: shelf, grid, modal, stats.
 */

import { state, THEMES, getFilteredBooks, getSortedBooks, groupByTheme } from './store.js';

// ─── STATS ────────────────────────────────────────────────
export function renderStats() {
  const filtered = getFilteredBooks();
  const read     = filtered.filter(b => b.status === 'read');
  const reading  = filtered.filter(b => b.status === 'reading');
  const unread   = filtered.filter(b => b.status === 'unread');

  const rated      = read.filter(b => b.rating > 0);
  const avgRating  = rated.length
    ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
    : '—';

  const totalPages = read.reduce((s, b) => s + (b.pages || 0), 0);

  document.getElementById('statTotal').textContent   = filtered.length;
  document.getElementById('statRead').textContent    = read.length;
  document.getElementById('statReading').textContent = reading.length;
  document.getElementById('statUnread').textContent  = unread.length;
  document.getElementById('statPages').textContent   = totalPages > 0
    ? totalPages.toLocaleString('it-IT')
    : '—';
  document.getElementById('statAvgRating').textContent = avgRating;
  document.getElementById('statThemes').textContent  = new Set(filtered.map(b => b.theme)).size;
  document.getElementById('statAuthors').textContent = new Set(filtered.map(b => b.author)).size;
}

// ─── MAIN RENDER ──────────────────────────────────────────
export function render() {
  renderStats();
  const filtered = getSortedBooks(getFilteredBooks());
  const main     = document.getElementById('mainContent');
  if (state.view === 'shelf') renderShelf(filtered, main);
  else renderGrid(filtered, main);
}

// ─── SHELF VIEW ───────────────────────────────────────────
function renderShelf(filtered, container) {
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

function authorHeight(author) {
  let h = 0;
  for (const c of author) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  const sizes = [126, 134, 142, 150, 158, 166];
  return sizes[h % sizes.length];
}

function spineHTML(book) {
  const theme    = THEMES[book.theme] || { color: '#888' };
  const height   = authorHeight(book.author);
  const short    = book.title.length > 16 ? book.title.substring(0, 14) + '…' : book.title;
  const surname  = book.author.split(' ').pop();
  const bgOpacity = book.status === 'read' ? 'cc' : book.status === 'reading' ? 'aa' : '55';
  return `
    <div class="book-spine ${book.status}"
         data-id="${book.id}"
         style="background:linear-gradient(160deg,${theme.color}${bgOpacity},${theme.color}33);height:${height}px"
         onclick="window.__openBook('${book.id}')"
         title="">
      <div class="book-spine-cap"></div>
      <span class="book-spine-title">${escapeHTML(short)}</span>
      <span class="book-spine-surname">${escapeHTML(surname)}</span>
    </div>`;
}

function connectionsBlockHTML(themeKey, themeBooks) {
  const titles = new Set(themeBooks.map(b => b.title));
  const rel    = state.connections.filter(c => titles.has(c.from) || titles.has(c.to));
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
  const seriesLabel = book.series
    ? `<span class="grid-series-tag">${escapeHTML(book.series)}${book.seriesVolume ? ' #' + book.seriesVolume : ''}</span>`
    : '';
  return `
    <div class="grid-card" onclick="window.__openBook('${book.id}')">
      <div class="grid-card-theme" style="background:${theme.color}"></div>
      <div class="grid-card-title">${escapeHTML(book.title)}</div>
      <div class="grid-card-author">${escapeHTML(book.author)}</div>
      ${seriesLabel}
      <div class="grid-card-meta">
        <span class="read-badge ${book.status === 'read' ? 'done' : book.status === 'reading' ? 'reading' : ''}">
          ${book.status === 'read' ? '✓ letto' : book.status === 'reading' ? '◎ in lettura' : '○ da leggere'}
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
  document.getElementById('modalPages').value        = book.pages || '';
  document.getElementById('modalSeries').value       = book.series || '';
  document.getElementById('modalSeriesVol').value    = book.seriesVolume || '';

  // Serie nel header
  const seriesDisplay = document.getElementById('modalSeriesDisplay');
  if (book.series) {
    seriesDisplay.textContent = book.series + (book.seriesVolume ? ` — vol. ${book.seriesVolume}` : '');
    seriesDisplay.style.display = '';
  } else {
    seriesDisplay.style.display = 'none';
  }

  // Status buttons
  const s = book.status || 'unread';
  document.getElementById('btnRead').className    = 'status-btn' + (s === 'read'    ? ' active-read'    : '');
  document.getElementById('btnReading').className = 'status-btn' + (s === 'reading' ? ' active-reading' : '');
  document.getElementById('btnUnread').className  = 'status-btn' + (s === 'unread'  ? ' active-unread'  : '');

  // Anno di lettura
  const yearSection = document.getElementById('yearReadSection');
  const yearInput   = document.getElementById('modalYearRead');
  if (s === 'read') {
    yearSection.style.display = '';
    yearInput.value = book.dateRead || '';
  } else {
    yearSection.style.display = 'none';
  }

  // Stars
  const stars = document.querySelectorAll('.star');
  stars.forEach((st, i) => st.classList.toggle('filled', i < (book.rating || 0)));

  // Connessioni (editabili)
  document.getElementById('connModalContainer').innerHTML = connectionsModalHTML(book);
}

function connectionsModalHTML(book) {
  const conns = state.connections.filter(c => c.from === book.title || c.to === book.title);

  const items = conns.map(c => {
    const other = c.from === book.title ? c.to : c.from;
    return `
      <div class="conn-modal-item">
        <span class="conn-other-title">${escapeHTML(other)}</span>
        <span class="conn-reason-text">${escapeHTML(c.reason)}</span>
        <button class="conn-remove-btn"
                data-from="${escapeAttr(c.from)}"
                data-to="${escapeAttr(c.to)}">✕</button>
      </div>`;
  }).join('');

  const otherBooks = state.books
    .filter(b => b.title !== book.title)
    .sort((a, b) => a.title.localeCompare(b.title, 'it'));

  const options = otherBooks.map(b =>
    `<option value="${escapeAttr(b.title)}">${escapeHTML(b.title)}</option>`
  ).join('');

  return `
    <div class="conn-modal-list">
      ${items || '<span class="conn-empty">nessuna connessione</span>'}
    </div>
    <div class="add-conn-form">
      <select id="connTarget" class="conn-select">
        <option value="">collega a...</option>
        ${options}
      </select>
      <input id="connReason" class="conn-reason-input" placeholder="motivo..." maxlength="100">
      <button id="btnAddConn" class="btn conn-add-btn">+</button>
    </div>`;
}

// ─── UTILS ────────────────────────────────────────────────
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
