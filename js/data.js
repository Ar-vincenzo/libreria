/**
 * data.js
 * Gestione dati: caricamento JSON, localStorage, export/import, lookup pagine.
 */

const STORAGE_KEY       = 'vincenzo_library_v4';
const CONNECTIONS_KEY   = 'vincenzo_library_connections_v1';

// ─── BOOKS ────────────────────────────────────────────────

export async function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  const res   = await fetch('./data/books.json');
  const books = await res.json();
  saveBooks(books);
  return books;
}

export function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

export function exportBooks(books) {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'libreria_vincenzo.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importBooks(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = e => {
      try   { resolve(JSON.parse(e.target.result)); }
      catch { reject(new Error('File JSON non valido')); }
    };
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsText(file);
  });
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ─── CONNECTIONS ──────────────────────────────────────────

/**
 * Carica le connessioni da localStorage.
 * Se non ci sono, salva e restituisce i default forniti.
 * @param {Array} defaults
 * @returns {Array}
 */
export function loadConnections(defaults) {
  const saved = localStorage.getItem(CONNECTIONS_KEY);
  if (saved) return JSON.parse(saved);
  saveConnections(defaults);
  return defaults;
}

export function saveConnections(connections) {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
}

// ─── PAGE LOOKUP ──────────────────────────────────────────

/**
 * Cerca il numero di pagine con una catena di 6 strategie in ordine di precisione:
 *  1. Google Books: titolo esatto + cognome autore
 *  2. Google Books: titolo + autore completo come testo libero
 *  3. Google Books: solo titolo (senza vincolo autore)
 *  4. Google Books: parole chiave titolo + cognome, senza operatori
 *  5. Wikidata SPARQL: cerca per label italiana/inglese (ottimo per classici)
 *  6. Open Library: fallback finale
 *
 * Per Google Books prende il valore mediano tra i risultati validi,
 * così filtra automaticamente edizioni preview/campione con poche pagine.
 *
 * @param {string} title
 * @param {string} author
 * @returns {Promise<number|null>}
 */
export async function lookupPages(title, author) {
  const surname    = author.trim().split(/\s+/).pop();
  // Parole chiave: rimuove articoli e preposizioni brevi per query più robuste
  const titleWords = title.replace(/^(il|lo|la|i|gli|le|l'|un|una|the|a|an)\s+/i, '').trim();

  const strategies = [
    // 1. Google Books — titolo esatto + cognome
    () => _googleBooks(`intitle:"${title}" inauthor:"${surname}"`),
    // 2. Google Books — titolo + autore completo, testo libero
    () => _googleBooks(`"${title}" "${author}"`),
    // 3. Google Books — solo titolo esatto
    () => _googleBooks(`intitle:"${title}"`),
    // 4. Google Books — parole chiave del titolo senza operatori (cattura varianti)
    () => _googleBooks(`${titleWords} ${surname}`),
    // 5. Wikidata — ottimo per classici e letteratura nota (cerca in italiano e inglese)
    () => _wikidata(title, author),
    // 6. Open Library — fallback finale
    () => _openLibrary(title, author),
  ];

  for (const strategy of strategies) {
    try {
      const pages = await strategy();
      if (pages) return pages;
    } catch { /* prova la prossima */ }
  }

  return null;
}

async function _googleBooks(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&fields=items/volumeInfo/pageCount`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  const counts = (data.items || [])
    .map(item => item.volumeInfo?.pageCount)
    .filter(p => p >= 50);

  if (!counts.length) return null;

  // Mediana: filtra edizioni preview con poche pagine
  counts.sort((a, b) => a - b);
  return counts[Math.floor(counts.length / 2)];
}

async function _wikidata(title, author) {
  const surname = author.trim().split(/\s+/).pop();

  // Cerca su Wikidata per label italiana o inglese, filtrando per istanze di libro
  // e richiedendo il campo P1104 (numero di pagine)
  const sparql = `
    SELECT ?pages WHERE {
      {
        ?book rdfs:label "${title.replace(/"/g, '\\"')}"@it ;
              wdt:P31/wdt:P279* wd:Q571 ;
              wdt:P1104 ?pages .
      } UNION {
        ?book rdfs:label "${title.replace(/"/g, '\\"')}"@en ;
              wdt:P31/wdt:P279* wd:Q571 ;
              wdt:P1104 ?pages .
      } UNION {
        ?book rdfs:label "${title.replace(/"/g, '\\"')}"@it ;
              wdt:P1104 ?pages .
      }
    }
    ORDER BY DESC(?pages)
    LIMIT 3
  `.trim();

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json' }
  });
  if (!res.ok) return null;

  const data    = await res.json();
  const results = data.results?.bindings ?? [];
  const counts  = results
    .map(r => parseInt(r.pages?.value))
    .filter(p => p >= 50);

  if (!counts.length) return null;
  counts.sort((a, b) => a - b);
  return counts[Math.floor(counts.length / 2)];
}

async function _openLibrary(title, author) {
  const q   = encodeURIComponent(`${title} ${author}`);
  const url = `https://openlibrary.org/search.json?q=${q}&fields=number_of_pages_median&limit=3`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data  = await res.json();
  const found = data.docs?.find(d => (d.number_of_pages_median ?? 0) >= 50);
  return found?.number_of_pages_median ?? null;
}
