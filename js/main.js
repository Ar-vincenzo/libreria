/**
 * main.js
 * Entry point — inizializzazione e binding eventi globali.
 */

import { state, CONNECTIONS } from './store.js';
import { loadBooks, loadConnections, lookupPages } from './data.js';
import { render, escapeHTML } from './render.js';
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
  savePages,
  saveSeries,
  saveYearRead,
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
  addConnectionFromModal,
  removeConnectionFromModal,
  bulkLookupPages,
} from './ui.js';

// ─── INIT ─────────────────────────────────────────────────
async function init() {
  state.books       = await loadBooks();
  state.connections = loadConnections(CONNECTIONS);

  render();

  // Globali usati negli onclick inline dei template
  window.__openBook        = openDetailModal;
  window.__setAuthor       = setAuthorFilter;
  window.toggleShelf       = toggleShelf;
  window.toggleConnections = toggleConnections;

  // ── Header ─────────────────────────────────────────────
  document.getElementById('btnBulkPages')
    .addEventListener('click', bulkLookupPages);

  document.getElementById('btnBulkClose')
    .addEventListener('click', () => {
      document.getElementById('bulkProgressBar').style.display = 'none';
    });

  document.getElementById('btnExport')
    .addEventListener('click', handleExport);
  document.getElementById('importFile')
    .addEventListener('change', handleImport);
  document.getElementById('btnImport')
    .addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('btnAdd')
    .addEventListener('click', openAddModal);

  // ── Filtri stato ───────────────────────────────────────
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => setStatusFilter(btn.dataset.statusFilter));
  });

  // ── Sort e search ──────────────────────────────────────
  document.getElementById('searchInput')
    .addEventListener('input', applySearchAndSort);
  document.getElementById('sortSelect')
    .addEventListener('change', applySearchAndSort);

  // ── View toggle ────────────────────────────────────────
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // ── Author dropdown ────────────────────────────────────
  document.getElementById('authorFilterBtn')
    .addEventListener('click', toggleAuthorDropdown);

  // ── Detail modal ───────────────────────────────────────
  document.getElementById('detailModal')
    .addEventListener('click', closeDetailOnOverlay);
  document.getElementById('btnCloseDetail')
    .addEventListener('click', closeDetailModal);
  document.getElementById('btnCloseDetail2')
    .addEventListener('click', closeDetailModal);

  document.getElementById('btnRead')
    .addEventListener('click', () => setBookStatus('read'));
  document.getElementById('btnReading')
    .addEventListener('click', () => setBookStatus('reading'));
  document.getElementById('btnUnread')
    .addEventListener('click', () => setBookStatus('unread'));

  document.getElementById('modalYearRead')
    .addEventListener('change', saveYearRead);

  document.querySelectorAll('.star').forEach((star, i) => {
    star.addEventListener('click', () => setRating(i + 1));
  });

  document.getElementById('modalSeries')
    .addEventListener('change', saveSeries);
  document.getElementById('modalSeriesVol')
    .addEventListener('change', saveSeries);

  document.getElementById('modalPages')
    .addEventListener('change', savePages);

  document.getElementById('modalNotes')
    .addEventListener('input', saveNotes);

  document.getElementById('btnDeleteBook')
    .addEventListener('click', deleteBook);

  // ── Lookup pagine ──────────────────────────────────────
  document.getElementById('btnLookupPages')
    .addEventListener('click', async () => {
      const book = state.books.find(b => b.id === state.currentBookId);
      if (!book) return;
      const btn = document.getElementById('btnLookupPages');
      btn.textContent = '...';
      btn.disabled    = true;
      const pages = await lookupPages(book.title, book.author);
      if (pages) {
        document.getElementById('modalPages').value = pages;
        savePages();
        btn.textContent = '⌕ cerca';
      } else {
        btn.textContent = 'non trovato';
        setTimeout(() => { btn.textContent = '⌕ cerca'; btn.disabled = false; }, 2000);
        return;
      }
      btn.disabled = false;
    });

  // ── Connessioni nel modal (event delegation) ───────────
  document.getElementById('detailModal').addEventListener('click', e => {
    const removeBtn = e.target.closest('.conn-remove-btn');
    if (removeBtn) {
      removeConnectionFromModal(removeBtn.dataset.from, removeBtn.dataset.to);
      return;
    }
    if (e.target.id === 'btnAddConn') {
      addConnectionFromModal();
    }
  });

  // ── Add modal ──────────────────────────────────────────
  document.getElementById('addModal')
    .addEventListener('click', closeAddOnOverlay);
  document.getElementById('btnCloseAdd')
    .addEventListener('click', closeAddModal);
  document.getElementById('btnCancelAdd')
    .addEventListener('click', closeAddModal);
  document.getElementById('btnConfirmAdd')
    .addEventListener('click', confirmAddBook);

  // ── Keyboard shortcuts ─────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('detailModal').classList.contains('open')) closeDetailModal();
      if (document.getElementById('addModal').classList.contains('open'))    closeAddModal();
      return;
    }
    if (e.key === 'Enter' && document.getElementById('addModal').classList.contains('open')) {
      if (document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        confirmAddBook();
      }
    }
  });

  // ── Chiudi dropdown autore su click esterno ─────────────
  initOutsideClickHandler();

  // ── Tooltip dorso ──────────────────────────────────────
  initSpineTooltip();
}

// ─── SPINE TOOLTIP ────────────────────────────────────────
function initSpineTooltip() {
  const tooltip = document.getElementById('spineTooltip');
  let hideTimer;

  document.getElementById('mainContent').addEventListener('mouseover', e => {
    const spine = e.target.closest('.book-spine[data-id]');
    if (!spine) return;
    clearTimeout(hideTimer);

    const book = state.books.find(b => b.id === spine.dataset.id);
    if (!book) return;

    const starsStr   = book.rating > 0 ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : '';
    const statusStr  = book.status === 'read' ? '✓ letto' : book.status === 'reading' ? '◎ in lettura' : '○ da leggere';
    const seriesStr  = book.series
      ? `<div class="tt-series">${escapeHTML(book.series)}${book.seriesVolume ? ' #' + book.seriesVolume : ''}</div>`
      : '';
    const pagesStr   = book.pages ? `<span class="tt-pages">${book.pages.toLocaleString('it-IT')} pag.</span>` : '';
    const yearStr    = book.dateRead ? `<span class="tt-year">${book.dateRead}</span>` : '';
    const ratingStr  = starsStr
      ? `<span class="tt-stars">${starsStr}</span>`
      : '';

    tooltip.innerHTML = `
      <div class="tt-title">${escapeHTML(book.title)}</div>
      <div class="tt-author">${escapeHTML(book.author)}</div>
      ${seriesStr}
      <div class="tt-meta">
        <span class="tt-status">${statusStr}</span>
        ${yearStr}
        ${pagesStr}
      </div>
      ${ratingStr ? `<div class="tt-rating">${ratingStr}</div>` : ''}
    `;

    const rect = spine.getBoundingClientRect();
    tooltip.style.display = 'block';
    // Posiziona sopra il dorso
    const ttW = tooltip.offsetWidth;
    let left  = rect.left + rect.width / 2 - ttW / 2;
    // Evita overflow a destra/sinistra
    left = Math.max(8, Math.min(left, window.innerWidth - ttW - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${rect.top + window.scrollY - tooltip.offsetHeight - 10}px`;
  });

  document.getElementById('mainContent').addEventListener('mouseout', e => {
    if (!e.relatedTarget?.closest?.('.book-spine[data-id]')) {
      hideTimer = setTimeout(() => { tooltip.style.display = 'none'; }, 80);
    }
  });
}

// ─── START ────────────────────────────────────────────────
init().catch(err => {
  console.error('Errore inizializzazione libreria:', err);
  document.getElementById('mainContent').innerHTML =
    '<div class="empty-shelf">Errore nel caricamento dei dati. Assicurati di aprire il sito tramite un server HTTP.</div>';
});
