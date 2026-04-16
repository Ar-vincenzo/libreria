/**
 * ui.js
 * Interazioni UI: modal, filtri, dropdown, toggle.
 */

import { state, THEMES } from './store.js';
import { saveBooks, generateId, exportBooks, importBooks, saveConnections, lookupPages } from './data.js';
import { render, renderDetailModal, renderAuthorDropdown } from './render.js';

// ─── DETAIL MODAL ─────────────────────────────────────────
export function openDetailModal(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;
  state.currentBookId = id;
  renderDetailModal(book);
  document.getElementById('detailModal').classList.add('open');
}

export function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
  state.currentBookId = null;
  render();
}

// ─── BOOK STATUS ──────────────────────────────────────────
export function setBookStatus(status) {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  book.status = status;

  // Gestione anno di lettura
  const yearSection = document.getElementById('yearReadSection');
  const yearInput   = document.getElementById('modalYearRead');
  if (status === 'read') {
    // Auto-imposta l'anno corrente se non già impostato
    if (!book.dateRead) {
      book.dateRead = new Date().getFullYear();
    }
    yearSection.style.display = '';
    yearInput.value = book.dateRead;
  } else {
    yearSection.style.display = 'none';
  }

  document.getElementById('btnRead').className    = 'status-btn' + (status === 'read'    ? ' active-read'    : '');
  document.getElementById('btnReading').className = 'status-btn' + (status === 'reading' ? ' active-reading' : '');
  document.getElementById('btnUnread').className  = 'status-btn' + (status === 'unread'  ? ' active-unread'  : '');
  saveBooks(state.books);
}

// ─── YEAR READ ────────────────────────────────────────────
export function saveYearRead() {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  const val = parseInt(document.getElementById('modalYearRead').value);
  book.dateRead = !isNaN(val) && val > 1900 ? val : null;
  saveBooks(state.books);
}

// ─── RATING ───────────────────────────────────────────────
export function setRating(r) {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  book.rating = r;
  document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('filled', i < r));
  saveBooks(state.books);
}

// ─── PAGES ────────────────────────────────────────────────
export function savePages() {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  const val = parseInt(document.getElementById('modalPages').value);
  book.pages = !isNaN(val) && val > 0 ? val : null;
  saveBooks(state.books);
  render(); // aggiorna le statistiche
}

// ─── SERIES ───────────────────────────────────────────────
export function saveSeries() {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  const series = document.getElementById('modalSeries').value.trim();
  const vol    = parseInt(document.getElementById('modalSeriesVol').value);
  book.series       = series || null;
  book.seriesVolume = !isNaN(vol) && vol > 0 ? vol : null;

  // Aggiorna display nel header del modal
  const display = document.getElementById('modalSeriesDisplay');
  if (book.series) {
    display.textContent = book.series + (book.seriesVolume ? ` — vol. ${book.seriesVolume}` : '');
    display.style.display = '';
  } else {
    display.style.display = 'none';
  }
  saveBooks(state.books);
}

// ─── NOTES ────────────────────────────────────────────────
export function saveNotes() {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;
  book.notes = document.getElementById('modalNotes').value;
  saveBooks(state.books);
}

// ─── DELETE BOOK ──────────────────────────────────────────
export function deleteBook() {
  if (!confirm('Rimuovere questo libro dalla libreria?')) return;
  const book = state.books.find(b => b.id === state.currentBookId);
  if (book) {
    // Rimuovi anche le connessioni che coinvolgono questo libro
    state.connections = state.connections.filter(
      c => c.from !== book.title && c.to !== book.title
    );
    saveConnections(state.connections);
  }
  state.books = state.books.filter(b => b.id !== state.currentBookId);
  saveBooks(state.books);
  closeDetailModal();
}

// ─── CONNECTIONS ──────────────────────────────────────────
export function addConnectionFromModal() {
  const book = state.books.find(b => b.id === state.currentBookId);
  if (!book) return;

  const target = document.getElementById('connTarget').value;
  const reason = document.getElementById('connReason').value.trim();
  if (!target || !reason) return;

  // Evita duplicati
  const exists = state.connections.some(
    c => (c.from === book.title && c.to === target) ||
         (c.from === target && c.to === book.title)
  );
  if (exists) return;

  state.connections.push({ from: book.title, to: target, reason });
  saveConnections(state.connections);
  renderDetailModal(book); // ri-renderizza la sezione connessioni
}

export function removeConnectionFromModal(from, to) {
  state.connections = state.connections.filter(
    c => !(c.from === from && c.to === to)
  );
  saveConnections(state.connections);
  const book = state.books.find(b => b.id === state.currentBookId);
  if (book) renderDetailModal(book);
}

// ─── ADD MODAL ────────────────────────────────────────────
export function openAddModal() {
  ['addTitle', 'addAuthor', 'addNotes', 'addSeries', 'addSeriesVol', 'addPages'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('addTheme').value  = '';
  document.getElementById('addStatus').value = 'unread';
  document.getElementById('addModal').classList.add('open');
}

export function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

export function confirmAddBook() {
  const title      = document.getElementById('addTitle').value.trim();
  const author     = document.getElementById('addAuthor').value.trim();
  const theme      = document.getElementById('addTheme').value;
  const status     = document.getElementById('addStatus').value;
  const notes      = document.getElementById('addNotes').value.trim();
  const series     = document.getElementById('addSeries').value.trim();
  const seriesVol  = parseInt(document.getElementById('addSeriesVol').value);
  const pages      = parseInt(document.getElementById('addPages').value);

  if (!title || !author || !theme) {
    alert('Titolo, autore e categoria sono obbligatori');
    return;
  }

  state.books.push({
    id:           generateId(),
    title,
    author,
    theme,
    status,
    notes,
    rating:       0,
    series:       series || null,
    seriesVolume: !isNaN(seriesVol) && seriesVol > 0 ? seriesVol : null,
    pages:        !isNaN(pages) && pages > 0 ? pages : null,
    dateAdded:    Date.now(),
    dateRead:     status === 'read' ? new Date().getFullYear() : null,
  });
  saveBooks(state.books);
  closeAddModal();
  render();
}

// ─── BULK PAGE LOOKUP ─────────────────────────────────────
export async function bulkLookupPages() {
  const missing = state.books.filter(b => !b.pages);
  if (!missing.length) {
    alert('Tutti i libri hanno già il numero di pagine.');
    return;
  }

  const bar    = document.getElementById('bulkProgressBar');
  const msg    = document.getElementById('bulkProgressMsg');
  const fill   = document.getElementById('bulkProgressFill');
  const btn    = document.getElementById('btnBulkPages');

  btn.disabled = true;
  bar.style.display = 'block';

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < missing.length; i++) {
    const book = missing[i];
    const pct  = Math.round(((i + 1) / missing.length) * 100);

    msg.textContent  = `⌕ ${i + 1} / ${missing.length} — trovate: ${found} — "${book.title.substring(0, 40)}"`;
    fill.style.width = `${pct}%`;

    try {
      const pages = await lookupPages(book.title, book.author);
      if (pages) {
        book.pages = pages;
        found++;
      } else {
        notFound++;
      }
    } catch {
      notFound++;
    }

    // Salva ogni 15 libri per non perdere dati
    if ((i + 1) % 15 === 0) saveBooks(state.books);

    // Pausa tra richieste (la lookup può fare fino a 6 chiamate API interne)
    await new Promise(r => setTimeout(r, 300));
  }

  saveBooks(state.books);
  render(); // aggiorna le statistiche (pagine totali)

  msg.textContent  = `✓ completato — trovate: ${found} / ${missing.length} (${notFound} non trovati)`;
  fill.style.width = '100%';
  btn.disabled     = false;
  btn.textContent  = '⌕ pagine mancanti';
}

// ─── FILTERS ──────────────────────────────────────────────
export function setStatusFilter(filter) {
  state.statusFilter = filter;
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.statusFilter === filter);
  });
  render();
}

export function applySearchAndSort() {
  state.searchQuery = document.getElementById('searchInput').value;
  state.sortOrder   = document.getElementById('sortSelect').value;
  render();
}

// ─── AUTHOR FILTER ────────────────────────────────────────
export function toggleAuthorDropdown() {
  const dd = document.getElementById('authorDropdown');
  if (!dd.classList.contains('open')) {
    renderAuthorDropdown(state.authorFilter);
  }
  dd.classList.toggle('open');
}

export function setAuthorFilter(author) {
  state.authorFilter = author;
  const btn = document.getElementById('authorFilterBtn');
  if (author) {
    const last = author.split(' ').slice(-1)[0];
    btn.textContent = last + ' ▾';
  } else {
    btn.textContent = 'tutti gli autori ▾';
  }
  document.getElementById('authorDropdown').classList.remove('open');
  render();
}

// ─── VIEW ─────────────────────────────────────────────────
export function setView(view) {
  state.view = view;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  render();
}

// ─── SHELF TOGGLE ─────────────────────────────────────────
export function toggleShelf(key) {
  const shelf  = document.getElementById(`bookshelf-${key}`);
  const toggle = document.getElementById(`toggle-${key}`);
  const conn   = document.getElementById(`conn-${key}`);

  const isHidden = shelf.style.display === 'none';
  shelf.style.display = isHidden ? '' : 'none';
  toggle.classList.toggle('collapsed', !isHidden);
  if (!isHidden && conn) conn.classList.remove('show');
}

// ─── CONNECTIONS TOGGLE ───────────────────────────────────
export function toggleConnections(key, btn) {
  const el   = document.getElementById(`conn-${key}`);
  const open = el.classList.toggle('show');
  const count = el.querySelectorAll('.connection-item').length;
  btn.textContent = open ? 'nascondi connessioni' : `connessioni (${count})`;
  btn.classList.toggle('active', open);
}

// ─── EXPORT / IMPORT ──────────────────────────────────────
export function handleExport() {
  exportBooks(state.books);
}

export async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const books = await importBooks(file);
    state.books = books;
    saveBooks(books);
    render();
  } catch (err) {
    alert(err.message);
  }
  event.target.value = '';
}

// ─── CLOSE ON OVERLAY ─────────────────────────────────────
export function closeDetailOnOverlay(e) {
  if (e.target.id === 'detailModal') closeDetailModal();
}

export function closeAddOnOverlay(e) {
  if (e.target.id === 'addModal') closeAddModal();
}

// ─── CLOSE DROPDOWN ON OUTSIDE CLICK ─────────────────────
export function initOutsideClickHandler() {
  document.addEventListener('click', e => {
    const wrap = document.querySelector('.author-filter-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('authorDropdown').classList.remove('open');
    }
  });
}
