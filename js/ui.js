/**
 * ui.js
 * Interazioni UI: modal, filtri, dropdown, toggle.
 */

import { state, THEMES } from './store.js';
import { saveBooks, generateId, exportBooks, importBooks } from './data.js';
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
  document.getElementById('btnRead').className   = 'status-btn' + (status === 'read'   ? ' active-read'   : '');
  document.getElementById('btnUnread').className = 'status-btn' + (status === 'unread' ? ' active-unread' : '');
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
  state.books = state.books.filter(b => b.id !== state.currentBookId);
  saveBooks(state.books);
  closeDetailModal();
}

// ─── ADD MODAL ────────────────────────────────────────────
export function openAddModal() {
  ['addTitle', 'addAuthor', 'addNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('addTheme').value  = '';
  document.getElementById('addStatus').value = 'unread';
  document.getElementById('addModal').classList.add('open');
}

export function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

export function confirmAddBook() {
  const title  = document.getElementById('addTitle').value.trim();
  const author = document.getElementById('addAuthor').value.trim();
  const theme  = document.getElementById('addTheme').value;
  const status = document.getElementById('addStatus').value;
  const notes  = document.getElementById('addNotes').value.trim();

  if (!title || !author || !theme) {
    alert('Titolo, autore e categoria sono obbligatori');
    return;
  }

  state.books.push({
    id: generateId(),
    title, author, theme, status, notes,
    rating: 0,
  });
  saveBooks(state.books);
  closeAddModal();
  render();
}

// ─── FILTERS ──────────────────────────────────────────────
export function setStatusFilter(filter) {
  state.statusFilter = filter;
  // Aggiorna bottoni attivi
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
