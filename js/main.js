/**
 * main.js
 * Entry point — inizializzazione e binding eventi globali.
 */

import { state } from './store.js';
import { loadBooks, saveBooks } from './data.js';
import { render } from './render.js';
import {
  openDetailModal,
  closeDetailModal,
  closeDetailOnOverlay,
  openAddModal,
  closeAddModal,
  closeAddOnOverlay,
  confirmAddBook,
  setBookStatus,
  setRating,
  saveNotes,
  deleteBook,
  setStatusFilter,
  applySearchAndSort,
  toggleAuthorDropdown,
  setAuthorFilter,
  setView,
  toggleShelf,
  toggleConnections,
  handleExport,
  handleImport,
  initOutsideClickHandler,
} from './ui.js';

// ─── INIT ─────────────────────────────────────────────────
async function init() {
  // Carica dati
  state.books = await loadBooks();

  // Rendering iniziale
  render();

  // Espone funzioni globali usate nell'HTML inline (onclick nei template)
  window.__openBook        = openDetailModal;
  window.__setAuthor       = setAuthorFilter;
  window.toggleShelf       = toggleShelf;
  window.toggleConnections = toggleConnections;

  // Binding bottoni header
  document.getElementById('btnExport')
    .addEventListener('click', handleExport);

  document.getElementById('importFile')
    .addEventListener('change', handleImport);

  document.getElementById('btnImport')
    .addEventListener('click', () => document.getElementById('importFile').click());

  document.getElementById('btnAdd')
    .addEventListener('click', openAddModal);

  // Binding filtri stato
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => setStatusFilter(btn.dataset.statusFilter));
  });

  // Binding sort e search
  document.getElementById('searchInput')
    .addEventListener('input', applySearchAndSort);
  document.getElementById('sortSelect')
    .addEventListener('change', applySearchAndSort);

  // Binding view toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // Binding author dropdown
  document.getElementById('authorFilterBtn')
    .addEventListener('click', toggleAuthorDropdown);

  // Binding detail modal
  document.getElementById('detailModal')
    .addEventListener('click', closeDetailOnOverlay);
  document.getElementById('btnCloseDetail')
    .addEventListener('click', closeDetailModal);
  document.getElementById('btnRead')
    .addEventListener('click', () => setBookStatus('read'));
  document.getElementById('btnUnread')
    .addEventListener('click', () => setBookStatus('unread'));
  document.getElementById('modalNotes')
    .addEventListener('input', saveNotes);
  document.getElementById('btnDeleteBook')
    .addEventListener('click', deleteBook);

  // Binding rating stars
  document.querySelectorAll('.star').forEach((star, i) => {
    star.addEventListener('click', () => setRating(i + 1));
  });

  // Binding add modal
  document.getElementById('addModal')
    .addEventListener('click', closeAddOnOverlay);
  document.getElementById('btnCloseAdd')
    .addEventListener('click', closeAddModal);
  document.getElementById('btnCancelAdd')
    .addEventListener('click', closeAddModal);
  document.getElementById('btnConfirmAdd')
    .addEventListener('click', confirmAddBook);

  // Chiudi dropdown autore su click esterno
  initOutsideClickHandler();
}

// ─── START ────────────────────────────────────────────────
init().catch(err => {
  console.error('Errore inizializzazione libreria:', err);
  document.getElementById('mainContent').innerHTML =
    '<div class="empty-shelf">Errore nel caricamento dei dati. Assicurati di aprire il sito tramite un server HTTP.</div>';
});
