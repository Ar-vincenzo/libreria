/**
 * data.js
 * Gestione dati: caricamento JSON, localStorage, export/import
 */

const STORAGE_KEY = 'vincenzo_library_v4';

/**
 * Carica i libri: prima dal localStorage, poi dal JSON se non c'è nulla salvato.
 * @returns {Promise<Array>}
 */
export async function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  // Prima visita: carica dal JSON e salva
  const res = await fetch('./data/books.json');
  const books = await res.json();
  saveBooks(books);
  return books;
}

/**
 * Salva i libri nel localStorage.
 * @param {Array} books
 */
export function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

/**
 * Esporta i libri come file JSON scaricabile.
 * @param {Array} books
 */
export function exportBooks(books) {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'libreria_vincenzo.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importa libri da file JSON.
 * @param {File} file
 * @returns {Promise<Array>}
 */
export function importBooks(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const books = JSON.parse(e.target.result);
        resolve(books);
      } catch {
        reject(new Error('File JSON non valido'));
      }
    };
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsText(file);
  });
}

/**
 * Genera un ID univoco.
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
