/**
 * store.js
 * Stato dell'applicazione e configurazione temi/connessioni.
 */

// ─── STATO ────────────────────────────────────────────────
export const state = {
  books:        [],
  statusFilter: 'all',    // 'all' | 'read' | 'unread'
  authorFilter: null,     // null | string
  sortOrder:    'theme',  // 'theme' | 'title' | 'title_desc' | 'author'
  view:         'shelf',  // 'shelf' | 'grid'
  searchQuery:  '',
  currentBookId: null,
};

// ─── TEMI ─────────────────────────────────────────────────
export const THEMES = {
  geopolitica:        { label: 'Geopolitica',          color: '#C4A55A' },
  economia:           { label: 'Economia',             color: '#5AB88A' },
  filosofia:          { label: 'Filosofia',            color: '#9B7EC8' },
  psicologia:         { label: 'Psicologia',           color: '#E07A5A' },
  neuroscienze:       { label: 'Neuroscienze',         color: '#5A9EC4' },
  narrativa_classica: { label: 'Narrativa Classica',   color: '#E0B85A' },
  narrativa_fantasy:  { label: 'Narrativa Fantasy/SF', color: '#7EC89B' },
  narrativa_popolare: { label: 'Narrativa Popolare',   color: '#C4845A' },
  orientale:          { label: 'Scrittori Orientali',  color: '#C45A8A' },
  design:             { label: 'Design & Visual',      color: '#5AC4C0' },
  informatica:        { label: 'Informatica & Tech',   color: '#7A9EC4' },
  scienze:            { label: 'Scienze',              color: '#A4C45A' },
  studio:             { label: 'Studio Universitario', color: '#8A8A8A' },
  storia:             { label: 'Storia',               color: '#C47A5A' },
};

// ─── CONNESSIONI ──────────────────────────────────────────
export const CONNECTIONS = [
  { from: 'Orientalismo', to: 'Cultura e imperialismo', reason: 'stesso autore, stesso framework' },
  { from: 'Orientalismo', to: 'Sorvegliare e punire', reason: 'Said influenzato da Foucault' },
  { from: 'Sorvegliare e punire', to: 'Dialettica dell\'illuminismo', reason: 'critica della modernità' },
  { from: 'Etica protestante e spirito del capitalismo', to: 'Dialettica dell\'illuminismo', reason: 'Weber e scuola di Francoforte' },
  { from: 'Il Principe', to: 'Ordine mondiale', reason: 'realismo politico' },
  { from: 'Ordine mondiale', to: 'La grande scacchiera', reason: 'geopolitica delle grandi potenze' },
  { from: 'The Revenge of Geography', to: 'Prisoners of Geography', reason: 'geopolitica e determinismo geografico' },
  { from: 'Why Nations Fail', to: 'The Narrow Corridor', reason: 'stesso autore, framework istituzionale' },
  { from: 'Pensieri lenti e veloci', to: 'Euforia irrazionale', reason: 'behavioral economics' },
  { from: 'Pensieri lenti e veloci', to: 'Misbehaving', reason: 'behavioral economics' },
  { from: 'L\'errore di Cartesio', to: 'Il sé viene alla mente', reason: 'stesso autore, continuazione' },
  { from: 'Così parlò Zarathustra', to: 'Il mondo come volontà e rappresentazione', reason: 'Nietzsche da Schopenhauer' },
  { from: 'Il mondo come volontà e rappresentazione', to: 'Essere e tempo', reason: 'filosofia continentale europea' },
  { from: 'Fenomenologia dello spirito', to: 'Il Manifesto del Partito Comunista', reason: 'Marx da Hegel' },
  { from: 'The Great Transformation', to: 'Why Nations Fail', reason: 'istituzioni e mercati' },
  { from: 'Debt: The First 5,000 Years', to: 'The Great Transformation', reason: 'critica del capitalismo' },
  { from: 'La struttura delle rivoluzioni scientifiche', to: 'Economics Rules', reason: 'limiti dei paradigmi scientifici' },
  { from: 'Kokoro', to: 'Delitto e castigo', reason: 'profondità psicologica, colpa e redenzione' },
  { from: 'Cuore di tenebra', to: 'Orientalismo', reason: 'imperialismo e sguardo occidentale' },
  { from: 'L\'uomo e i suoi simboli', to: 'Maps of Meaning', reason: 'Jung e psicologia archetipica' },
  { from: 'Il cigno nero', to: 'Pensieri lenti e veloci', reason: 'psicologia delle decisioni e rischio' },
  { from: 'Infocrazia', to: 'Sorvegliare e punire', reason: 'Byung-Chul Han da Foucault' },
  { from: 'Come il cervello crea la nostra coscienza', to: 'L\'errore di Cartesio', reason: 'neuroscienze della coscienza' },
  { from: 'Istituzioni e mercati finanziari', to: 'Economia dei mercati finanziari', reason: 'stesso autore, stesso tema' },
  { from: 'La caffettiera del masochista', to: 'Emotional Design', reason: 'stesso autore, design cognitivo' },
  { from: 'Il mondo di ieri', to: 'Le origini del totalitarismo', reason: 'Novecento europeo — testimonianza e analisi' },
  { from: 'Le origini del totalitarismo', to: 'Il secolo breve', reason: 'storia politica del Novecento' },
  { from: 'A Rulebook for Arguments', to: 'Being Logical: A Guide to Good Thinking', reason: 'logica applicata — pratica e teoria' },
  { from: 'The Craft of Research', to: 'Come si fa una tesi di laurea', reason: 'metodologia della ricerca' },
  { from: 'How to Read a Book', to: 'The Craft of Research', reason: 'lettura analitica e ricerca critica' },
];

// ─── HELPERS ──────────────────────────────────────────────

/**
 * Restituisce i libri filtrati in base allo stato corrente.
 * @returns {Array}
 */
export function getFilteredBooks() {
  return state.books.filter(b => {
    const matchStatus = state.statusFilter === 'all' || b.status === state.statusFilter;
    const q = state.searchQuery.toLowerCase();
    const matchSearch = !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q);
    const matchAuthor = !state.authorFilter || b.author === state.authorFilter;
    return matchStatus && matchSearch && matchAuthor;
  });
}

/**
 * Ordina un array di libri in base al sortOrder corrente.
 * @param {Array} arr
 * @returns {Array}
 */
export function getSortedBooks(arr) {
  const s = state.sortOrder;
  return [...arr].sort((a, b) => {
    if (s === 'title')      return a.title.localeCompare(b.title, 'it');
    if (s === 'title_desc') return b.title.localeCompare(a.title, 'it');
    if (s === 'author')     return a.author.localeCompare(b.author, 'it');
    return 0; // 'theme' — ordine naturale per categoria
  });
}

/**
 * Raggruppa un array di libri per tema.
 * @param {Array} arr
 * @returns {Object}
 */
export function groupByTheme(arr) {
  const groups = {};
  arr.forEach(b => {
    if (!groups[b.theme]) groups[b.theme] = [];
    groups[b.theme].push(b);
  });
  return groups;
}
