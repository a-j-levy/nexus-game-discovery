/* ══════════════════════════════════════════════════════════════════
   NEXUS — script.js
   Phase 3: API fetch, hero carousel, game card rendering, pagination
   Phase 4: Live search, filters, active pills, mobile sidebar
   Phase 5: Slide-in detail panel, screenshots, full metadata
   Phase 6: My List — localStorage persistence, drawer, sync
   Phase 7: Toast notifications, keyboard polish, edge case fixes
   ══════════════════════════════════════════════════════════════════ */


/* ─────────────────────────────────────────
   CONFIG
   Get a free API key at: https://rawg.io/apidocs
───────────────────────────────────────── */
const API_KEY                 = 'f139246c1a4f4077ad8a7118b2ea89d8';
const BASE_URL                = 'https://api.rawg.io/api';
const PAGE_SIZE               = 20;
const HERO_SLIDE_COUNT        = 5;
const HERO_INTERVAL_MS        = 7000;
const EARLIEST_YEAR           = 1980;
const DEFAULT_ORDERING        = '-metacritic';
const MULTIPLAYER_TAG         = 7;
const DESCRIPTION_CLAMP_LIMIT = 500;
const MAX_SCREENSHOTS         = 8;
const MY_LIST_KEY             = 'nexus_mylist'; // localStorage key
const TOAST_DURATION          = 3000;           // Phase 7: ms before toast auto-dismisses

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('game-card--visible');
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });


/* ─────────────────────────────────────────
   LABEL MAPS
───────────────────────────────────────── */
const GENRE_LABELS = {
  'action': 'Action', 'indie': 'Indie', 'adventure': 'Adventure',
  'role-playing-games-rpg': 'RPG', 'strategy': 'Strategy', 'shooter': 'Shooter',
  'casual': 'Casual', 'simulation': 'Simulation', 'puzzle': 'Puzzle',
  'arcade': 'Arcade', 'platformer': 'Platformer', 'racing': 'Racing',
  'sports': 'Sports', 'massively-multiplayer': 'MMO', 'family': 'Family',
  'fighting': 'Fighting', 'horror': 'Horror',
};
const PLATFORM_LABELS = {
  '4': 'PC', '187': 'PS5', '18': 'PS4', '1': 'Xbox One',
  '186': 'Xbox Series X/S', '7': 'Switch', '3': 'iOS', '21': 'Android',
};
const ORDERING_LABELS = {
  '-metacritic': 'Metacritic ↓', '-rating': 'Rating ↓', '-released': 'Newest',
  'released': 'Oldest', '-added': 'Most Added', 'name': 'A → Z',
};
const PLATFORM_ABBREV = {
  // PC / general
  'PC':                                    'PC',
  'macOS':                                 'MAC',
  'Linux':                                 'LINUX',
  'Web':                                   'WEB',
  // Mobile
  'iOS':                                   'IOS',
  'Android':                               'ANDROID',
  // Xbox
  'Xbox':                                  'XBOX',
  'Xbox 360':                              'X360',
  'Xbox One':                              'XB1',
  'Xbox Series X':                         'XSX',
  'Xbox Series S':                         'XSS',
  'Xbox Series S/X':                       'XSX',   // RAWG combined entry
  // PlayStation
  'PlayStation':                           'PS1',
  'PlayStation 2':                         'PS2',
  'PlayStation 3':                         'PS3',
  'PlayStation 4':                         'PS4',
  'PlayStation 5':                         'PS5',
  'PlayStation Portable':                  'PSP',
  'PlayStation Vita':                      'PSV',
  // Nintendo home
  'Nintendo Switch':                       'NSW',
  'Nintendo Wii U':                        'WIIU',
  'Nintendo Wii':                          'WII',
  'Nintendo GameCube':                     'GC',
  'GameCube':                              'GC',
  'Nintendo 64':                           'N64',
  // Nintendo handheld
  'Nintendo DS':                           'NDS',
  'Nintendo 3DS':                          '3DS',
  'Game Boy':                              'GB',
  'Game Boy Color':                        'GBC',
  'Game Boy Advance':                      'GBA',
  // Nintendo retro
  'Nintendo Entertainment System':         'NES',
  'Super Nintendo Entertainment System':   'SNES',
  // Sega
  'Dreamcast':                             'DC',
  'Sega Genesis':                          'GEN',
  'Sega Mega Drive':                       'GEN',
  'Sega Genesis / Mega Drive':             'GEN',
  'Sega Saturn':                           'SAT',
  'Sega CD':                               'SEGACD',
  // Atari
  'Atari 2600':                            'A2600',
  'Atari 5200':                            'A5200',
  'Atari 7800':                            'A7800',
  'Atari Jaguar':                          'JAG',
  'Atari Lynx':                            'LYNX',
  // Classic home computers
  'Commodore 64':                          'C64',
  'Amiga':                                 'AMIGA',
  // Neo Geo
  'Neo Geo':                               'NEOGEO',
  'Neo Geo Pocket':                        'NGP',
  'Neo Geo Pocket Color':                  'NGPC',
  // Other
  '3DO':                                   '3DO',
};
const RATING_COLORS = {
  great: 'var(--color-rating-great)', good:  'var(--color-rating-good)',
  mixed: 'var(--color-rating-mixed)', poor:  'var(--color-rating-poor)',
  none:  'var(--color-text-muted)',
};

/* Phase 7: SVG icons for each toast type */
const TOAST_ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
  info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`,
};


/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const state = {
  games:        [],
  nextPageUrl:  null,
  totalCount:   0,
  isLoading:    false,
  hero:         { games: [], index: 0, timer: null },
  filters: {
    search: '', genre: '', platform: '', minRating: 0,
    yearFrom: '', yearTo: '', ordering: DEFAULT_ORDERING, multiplayer: false,
  },
};

const detailCache = new Map(); // gameId → { detail, screenshots }

const panelState = {
  gameId:          null,
  screenshotIndex: 0,
  screenshots:     [],
  triggerElement:  null,
  currentGame:     null,
};

// Phase 6: My List
let myList         = [];   // in-memory copy of localStorage array
let drawerTrigger  = null; // element to restore focus to when drawer closes


/* ─────────────────────────────────────────
   DOM REFS
───────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  // Hero
  heroBackdropImg:  $('hero-backdrop-img'),
  heroCoverImg:     $('hero-cover-img'),
  heroEyebrow:      $('hero-eyebrow'),
  heroTitle:        $('hero-title'),
  heroDescription:  $('hero-description'),
  heroDetailBtn:    $('hero-detail-btn'),
  heroRatingScore:  $('hero-rating-score'),
  heroPlatforms:    $('hero-platforms'),
  heroGenre:        $('hero-genre'),
  heroDots:         $('hero-dots'),
  heroPrevBtn:      $('hero-prev-btn'),
  heroNextBtn:      $('hero-next-btn'),
  heroProgressFill: $('hero-progress-fill'),

  // Results
  gameGrid:        $('game-grid'),
  resultsHeading:  $('results-heading'),
  resultsCount:    $('results-count'),
  loadMoreWrap:    $('load-more-wrap'),
  loadMoreBtn:     $('load-more-btn'),

  // UI states
  emptyState:   $('empty-state'),
  errorState:   $('error-state'),
  errorMessage: $('error-message'),
  retryBtn:     $('retry-btn'),
  resetAllBtn:  $('reset-all-btn'),

  // Filters
  searchInput:       $('search-input'),
  searchClearBtn:    $('search-clear-btn'),
  filterGenre:       $('filter-genre'),
  filterPlatform:    $('filter-platform'),
  filterRating:      $('filter-rating'),
  ratingDisplay:     $('rating-range-display'),
  filterYearFrom:    $('filter-year-from'),
  filterYearTo:      $('filter-year-to'),
  filterOrdering:    $('filter-ordering'),
  filterMultiplayer: $('filter-multiplayer'),
  clearFiltersBtn:   $('clear-filters-btn'),
  activeFilters:     $('active-filters'),

  // Layout / overlay
  sidebar:         $('sidebar'),
  overlay:         $('overlay'),
  mobileFilterBtn: $('mobile-filter-btn'),
  menuToggleBtn:   $('menu-toggle-btn'),   // Phase 7: hamburger nav button

  // Detail panel
  detailPanel:           $('detail-panel'),
  panelCloseBtn:         $('panel-close-btn'),
  panelScreenshotsTrack: $('panel-screenshots-track'),
  screenshotPrevBtn:     $('screenshot-prev-btn'),
  screenshotNextBtn:     $('screenshot-next-btn'),
  screenshotDots:        $('screenshot-dots'),
  panelTitle:            $('panel-title'),
  panelSaveBtn:          $('panel-save-btn'),
  panelMetacritic:       $('panel-metacritic'),
  panelMetacriticScore:  $('panel-metacritic-score'),
  panelStars:            $('panel-stars'),
  panelRatingText:       $('panel-rating-text'),
  panelChips:            $('panel-chips'),
  panelDescription:      $('panel-description'),
  panelDescriptionText:  $('panel-description-text'),
  panelReadMoreBtn:      $('panel-read-more-btn'),
  panelPlatformList:     $('panel-platform-list'),
  panelGenreTags:        $('panel-genre-tags'),
  panelDetailsList:      $('panel-details-list'),

  // My List drawer
  mylistDrawer:      $('my-list-drawer'),
  mylistCloseBtn:    $('mylist-close-btn'),
  mylistItems:       $('mylist-items'),
  mylistEmpty:       $('mylist-empty'),
  mylistDrawerCount: $('mylist-drawer-count'),
  mylistBtn:         $('mylist-btn'),
  mylistCount:       $('mylist-count'),
  navMylistLink:     $('nav-mylist-link'),

  // Phase 7: toast container
  toastContainer: $('toast-container'),
};


/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function getRatingClass(score) {
  if (!score) return 'none';
  if (score >= 85) return 'great';
  if (score >= 70) return 'good';
  if (score >= 50) return 'mixed';
  return 'poor';
}

function getTopPlatforms(platforms = [], max = 4) {
  return platforms
    .slice(0, max)
    .map(p => PLATFORM_ABBREV[p.platform?.name] ?? p.platform?.name?.slice(0, 3) ?? '');
}

function getTopGenres(genres = [], max = 2) {
  return genres.slice(0, max).map(g => g.name);
}

function formatYear(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function esc(str) {
  if (str === null || str === undefined) return '';
  const el = document.createElement('div');
  el.textContent = String(str);
  return el.innerHTML;
}

/** Fisher-Yates shuffle — returns a new array, does not mutate the original. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Phase 7: truncate long strings for toast messages */
function truncate(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

/* ─────────────────────────────────────────
   SEARCH RELEVANCE RE-RANKING
───────────────────────────────────────── */

/** Lowercase, collapse punctuation to spaces, trim. */
function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Titles containing these words are penalised as derivative/low-quality.
const DERIVATIVE_KEYWORDS = new Set([
  'pack', 'picture', 'pictures', 'demo', 'wallpaper', 'wallpapers',
  'mod', 'simulator', 'clicker',
]);

function isDerivativeTitle(normalizedTitle) {
  return normalizedTitle.split(' ').some(w => DERIVATIVE_KEYWORDS.has(w));
}

/**
 * Returns a relevance score for a title against the query. Lower = better.
 *
 * Base scores:
 *   0  — exact match
 *   1  — title starts with the full query
 *   2  — title contains the full query as a phrase
 *   3  — title contains every query word (multi-word queries only)
 *   99 — no meaningful match (always filtered)
 *
 * A derivative-keyword penalty of +5 is added to scores 1-3 so that
 * "Fortnite Pack" (score 6) sorts after "Fortnite Creative" (score 1)
 * and can be cut entirely for focused single-word searches.
 */
function scoreTitle(title, rawQuery) {
  const q          = normalizeForSearch(rawQuery);
  const t          = normalizeForSearch(title);
  const derivative = isDerivativeTitle(t) ? 5 : 0;

  if (t === q)          return 0;
  if (t.startsWith(q))  return 1 + derivative;
  if (t.includes(q))    return 2 + derivative;

  const words = q.split(' ').filter(Boolean);
  if (words.length > 1 && words.every(w => t.includes(w))) return 3 + derivative;

  return 99;
}

/**
 * Re-ranks results by title relevance and applies tiered filtering.
 *
 * Filtering thresholds:
 *  - Score 99 is always removed (no meaningful match).
 *  - For single-word specific queries (≥3 chars, no spaces), scores ≥6
 *    are also removed — this cuts derivative titles like "Fortnite Pack"
 *    while keeping clean matches like "Fortnite: Battle Royale".
 *  - For multi-word queries, derivatives are kept but sorted to the bottom.
 *
 * Safety fallback: if filtering empties the page, all non-99 results are kept.
 */
function rerankBySearchRelevance(games, query) {
  if (!query || query.trim().length < 2) return games;

  const q            = normalizeForSearch(query);
  const isSingleWord = !q.includes(' ');
  const isSpecific   = q.length >= 3;

  const scored = games.map(game => ({
    game,
    score: scoreTitle(game.name ?? '', query),
  }));

  const filtered = scored.filter(({ score }) => {
    if (score === 99) return false;
    if (isSpecific && isSingleWord && score >= 6) return false;
    return true;
  });

  // Safety: never return an empty page purely due to client-side filtering
  const pool = filtered.length > 0
    ? filtered
    : scored.filter(({ score }) => score < 99);

  return pool
    .sort((a, b) => a.score - b.score)
    .map(({ game }) => game);
}


/* ─────────────────────────────────────────
   TOAST NOTIFICATIONS  (Phase 7)
───────────────────────────────────────── */

function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${TOAST_ICONS[type] ?? TOAST_ICONS.info}</span>
    <span>${esc(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  const dismiss = () => {
    if (!toast.isConnected) return;
    toast.classList.add('toast--removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);
  // Clicking the toast dismisses it immediately
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); }, { once: true });
}


/* ─────────────────────────────────────────
   API HELPERS
───────────────────────────────────────── */

function buildGamesUrl() {
  const url = new URL(`${BASE_URL}/games`);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('page_size', PAGE_SIZE);

  const f = state.filters;
  if (f.search)        url.searchParams.set('search', f.search);
  if (f.genre)         url.searchParams.set('genres', f.genre);
  if (f.platform)      url.searchParams.set('platforms', f.platform);
  if (f.minRating > 0) url.searchParams.set('metacritic', `${f.minRating},100`);
  if (f.multiplayer)   url.searchParams.set('tags', MULTIPLAYER_TAG);
  if (f.ordering)      url.searchParams.set('ordering', f.ordering);
  if (f.yearFrom || f.yearTo) {
    const from = f.yearFrom ? `${f.yearFrom}-01-01` : `${EARLIEST_YEAR}-01-01`;
    const to   = f.yearTo   ? `${f.yearTo}-12-31`   : `${new Date().getFullYear()}-12-31`;
    url.searchParams.set('dates', `${from},${to}`);
  }
  return url.toString();
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API responded with HTTP ${res.status}`);
  return res.json();
}


/* ─────────────────────────────────────────
   MY LIST — localStorage & in-memory ops
───────────────────────────────────────── */

function loadMyList() {
  try {
    return JSON.parse(localStorage.getItem(MY_LIST_KEY) ?? '[]') ?? [];
  } catch {
    return [];
  }
}

function saveMyList() {
  try {
    localStorage.setItem(MY_LIST_KEY, JSON.stringify(myList));
  } catch {
    // Storage unavailable — list works in-session only
  }
}

function isInMyList(gameId) {
  return myList.some(g => g.id === gameId);
}

/** Strip the game object down to only what the drawer and panel need. */
function pickSaveData(game) {
  return {
    id:               game.id,
    name:             game.name,
    background_image: game.background_image ?? null,
    metacritic:       game.metacritic ?? null,
    released:         game.released ?? null,
    genres:           game.genres   ?? [],
    platforms:        game.platforms ?? [],
    rating:           game.rating   ?? null,
    ratings_count:    game.ratings_count ?? 0,
  };
}

function addToMyList(game) {
  if (isInMyList(game.id)) return;
  myList.unshift(pickSaveData(game)); // newest first
  saveMyList();
  syncMyListUI();
  showToast(`"${truncate(game.name)}" added to My List`, 'success'); // Phase 7
}

function removeFromMyList(gameId) {
  const game = myList.find(g => g.id === gameId); // Phase 7: capture name before removal
  myList = myList.filter(g => g.id !== gameId);
  saveMyList();
  syncMyListUI();
  if (game) showToast(`"${truncate(game.name)}" removed from My List`, 'info'); // Phase 7
}

function toggleMyList(game) {
  isInMyList(game.id) ? removeFromMyList(game.id) : addToMyList(game);
}

/**
 * Central sync: call after every My List mutation.
 * Updates all four surfaces that reflect saved state.
 */
function syncMyListUI() {
  updateNavBadge();
  renderMyListDrawer();
  if (panelState.gameId !== null) updatePanelSaveBtn(panelState.gameId);
  syncCardSavedStates();
}


/* ─────────────────────────────────────────
   MY LIST — navbar badge
───────────────────────────────────────── */

function updateNavBadge() {
  const count = myList.length;
  dom.mylistCount.textContent = count;
  dom.mylistCount.hidden = count === 0;
}


/* ─────────────────────────────────────────
   MY LIST — drawer
───────────────────────────────────────── */

function openMyListDrawer() {
  drawerTrigger = document.activeElement;

  renderMyListDrawer(); // always fresh before showing
  dom.mylistDrawer.classList.add('mylist-drawer--open');
  dom.mylistDrawer.setAttribute('aria-hidden', 'false');
  dom.mylistBtn.setAttribute('aria-expanded', 'true');
  dom.overlay.classList.add('overlay--active');
  dom.mylistCloseBtn.focus();
}

function closeMyListDrawer() {
  dom.mylistDrawer.classList.remove('mylist-drawer--open');
  dom.mylistDrawer.setAttribute('aria-hidden', 'true');
  dom.mylistBtn.setAttribute('aria-expanded', 'false');

  // Only clear the overlay if the detail panel is also closed
  if (!dom.detailPanel.classList.contains('detail-panel--open')) {
    dom.overlay.classList.remove('overlay--active');
  }

  if (drawerTrigger) {
    drawerTrigger.focus();
    drawerTrigger = null;
  }
}

function renderMyListDrawer() {
  const count = myList.length;
  dom.mylistDrawerCount.textContent = count;

  if (count === 0) {
    dom.mylistItems.innerHTML = '';
    dom.mylistEmpty.hidden = false;
    return;
  }

  dom.mylistEmpty.hidden = true;
  const frag = document.createDocumentFragment();
  myList.forEach(game => frag.appendChild(buildMyListItem(game)));

  dom.mylistItems.innerHTML = '';
  dom.mylistItems.appendChild(frag);
}

function buildMyListItem(game) {
  const li = document.createElement('li');
  li.className = 'mylist-item';
  li.dataset.gameId = game.id;

  const score = game.metacritic;
  const year  = formatYear(game.released);
  const ratingCls = getRatingClass(score);

  const thumbHtml = game.background_image
    ? `<img class="mylist-item__thumb" src="${game.background_image}" alt="${esc(game.name)}" loading="lazy">`
    : `<div class="mylist-item__thumb"
            style="display:flex;align-items:center;justify-content:center;
                   font-size:1.4rem;background:var(--color-elevated)">🎮</div>`;

  const metaParts = [];
  if (score) metaParts.push(`<span style="color:${RATING_COLORS[ratingCls]}">${score}</span>`);
  if (year)  metaParts.push(esc(year));

  li.innerHTML = `
    ${thumbHtml}
    <div class="mylist-item__info">
      <div class="mylist-item__title">${esc(game.name)}</div>
      <div class="mylist-item__meta">${metaParts.join('  ·  ')}</div>
    </div>
    <button class="mylist-item__remove-btn" aria-label="Remove ${esc(game.name)} from My List">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6"  y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  // Click row → close drawer, open detail panel for this game
  li.addEventListener('click', e => {
    if (e.target.closest('.mylist-item__remove-btn')) return;
    closeMyListDrawer();
    openDetailPanel(game);
  });

  li.querySelector('.mylist-item__remove-btn').addEventListener('click', e => {
    e.stopPropagation();
    removeFromMyList(game.id);
  });

  return li;
}


/* ─────────────────────────────────────────
   MY LIST — card grid sync
───────────────────────────────────────── */

/** Toggle .game-card--saved on every visible card to match current myList. */
function syncCardSavedStates() {
  dom.gameGrid.querySelectorAll('.game-card').forEach(card => {
    card.classList.toggle('game-card--saved', isInMyList(Number(card.dataset.gameId)));
  });
}


/* ─────────────────────────────────────────
   SKELETON CARDS
───────────────────────────────────────── */

function showSkeletons(count = PAGE_SIZE) {
  dom.gameGrid.setAttribute('aria-busy', 'true');
  dom.gameGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-card__image"></div>
      <div class="skeleton-card__body">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
        <div class="skeleton-line skeleton-line--short"></div>
      </div>
    </div>
  `).join('');
}


/* ─────────────────────────────────────────
   GAME CARDS
───────────────────────────────────────── */

function buildGameCard(game) {
  const score     = game.metacritic;
  const ratingCls = getRatingClass(score);
  const platforms = getTopPlatforms(game.platforms);
  const genres    = getTopGenres(game.genres);
  const year      = formatYear(game.released);
  const img       = game.background_image;
  const title     = esc(game.name);

  const card = document.createElement('div');
  card.className = 'game-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.dataset.gameId = game.id;

  card.innerHTML = `
    <div class="game-card__image-wrap">
      ${img
        ? `<img class="game-card__image" src="${img}" alt="${title}" loading="lazy">`
        : `<div class="game-card__image-placeholder">🎮</div>`}
      <div class="game-card__rating-badge game-card__rating-badge--${ratingCls}"
           aria-label="${score ? `Metacritic score: ${score}` : 'No score available'}">
        ${score ?? 'N/A'}
      </div>
      <div class="game-card__saved-indicator" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    </div>
    <div class="game-card__body">
      <h3 class="game-card__title">${title}</h3>
      <div class="game-card__genres">
        ${genres.map(g => `<span class="game-card__genre-tag">${esc(g)}</span>`).join('')}
      </div>
      <div class="game-card__footer">
        <div class="game-card__platforms">
          ${platforms.map(p => `<span class="game-card__platform-icon">${esc(p)}</span>`).join('')}
        </div>
        ${year ? `<span class="game-card__released">${year}</span>` : ''}
      </div>
    </div>
  `;

  card.addEventListener('click', () => openDetailPanel(game));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailPanel(game); }
  });

  return card;
}

function appendCards(games) {
  const frag = document.createDocumentFragment();
  const cards = games.map(game => buildGameCard(game));
  cards.forEach(card => frag.appendChild(card));
  dom.gameGrid.appendChild(frag);
  dom.gameGrid.setAttribute('aria-busy', 'false');
  syncCardSavedStates();

  if (prefersReducedMotion) {
    cards.forEach(card => card.classList.add('game-card--visible'));
  } else {
    cards.forEach((card, i) => {
      card.style.setProperty('--card-delay', `${Math.min(i * 50, 240)}ms`);
      cardObserver.observe(card);
    });
  }
}


/* ─────────────────────────────────────────
   HERO CAROUSEL
───────────────────────────────────────── */

function paintHeroSlide(game) {
  const score     = game.metacritic;
  const ratingCls = getRatingClass(score);
  const platforms = getTopPlatforms(game.platforms, 5);
  const genres    = getTopGenres(game.genres, 3);
  const img       = game.background_image ?? '';

  dom.heroBackdropImg.style.backgroundImage = img ? `url(${img})` : 'none';
  dom.heroCoverImg.src = img;
  dom.heroCoverImg.alt = game.name ?? '';
  dom.heroEyebrow.textContent     = 'Featured Game';
  dom.heroTitle.textContent       = game.name ?? '';
  dom.heroDescription.textContent = genres.join('  ·  ') || '';
  dom.heroRatingScore.textContent = score ?? '—';
  dom.heroRatingScore.style.color = RATING_COLORS[ratingCls];

  dom.heroPlatforms.innerHTML = platforms
    .map(p => `<span>${esc(p)}</span>`)
    .join('<span style="opacity:.28;padding:0 3px">·</span>');

  dom.heroGenre.innerHTML = genres
    .map(g => `<span class="hero__genre-tag">${esc(g)}</span>`)
    .join('');

  dom.heroDetailBtn.dataset.gameId = game.id;
}

function setActiveDot(index) {
  dom.heroDots.querySelectorAll('.hero__carousel-dot').forEach((dot, i) => {
    const active = i === index;
    dot.classList.toggle('hero__carousel-dot--active', active);
    dot.setAttribute('aria-selected', String(active));
  });
}

function goToSlide(index) {
  stopHeroTimer();
  state.hero.index = index;
  paintHeroSlide(state.hero.games[index]);
  setActiveDot(index);
  startHeroTimer();
}

function startHeroTimer() {
  dom.heroProgressFill.style.transition = 'none';
  dom.heroProgressFill.style.width = '0%';
  void dom.heroProgressFill.offsetWidth;
  dom.heroProgressFill.style.transition = `width ${HERO_INTERVAL_MS}ms linear`;
  dom.heroProgressFill.style.width = '100%';
  state.hero.timer = setTimeout(() => {
    goToSlide((state.hero.index + 1) % state.hero.games.length);
  }, HERO_INTERVAL_MS);
}

function stopHeroTimer() {
  clearTimeout(state.hero.timer);
  dom.heroProgressFill.style.transition = 'none';
  dom.heroProgressFill.style.width = '0%';
}

function initHero(games) {
  state.hero.games = shuffle(games).slice(0, HERO_SLIDE_COUNT);
  state.hero.index = 0;

  dom.heroDots.innerHTML = state.hero.games.map((_, i) => `
    <button class="hero__carousel-dot${i === 0 ? ' hero__carousel-dot--active' : ''}"
      role="tab" aria-label="Featured game ${i + 1}"
      aria-selected="${i === 0}" data-index="${i}"></button>
  `).join('');

  dom.heroDots.querySelectorAll('.hero__carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index)));
  });
  dom.heroPrevBtn.addEventListener('click', () => {
    goToSlide((state.hero.index - 1 + state.hero.games.length) % state.hero.games.length);
  });
  dom.heroNextBtn.addEventListener('click', () => {
    goToSlide((state.hero.index + 1) % state.hero.games.length);
  });

  paintHeroSlide(state.hero.games[0]);
  startHeroTimer();
}


/* ─────────────────────────────────────────
   DETAIL PANEL
───────────────────────────────────────── */

async function openDetailPanel(game) {
  panelState.triggerElement  = document.activeElement;
  panelState.gameId          = game.id;
  panelState.currentGame     = game;
  panelState.screenshotIndex = 0;
  panelState.screenshots     = [];

  dom.detailPanel.classList.add('detail-panel--open');
  dom.detailPanel.setAttribute('aria-hidden', 'false');
  dom.overlay.classList.add('overlay--active');
  dom.detailPanel.querySelector('.detail-panel__inner').scrollTop = 0;
  dom.detailPanel.focus();

  populatePanelBasic(game);
  await loadAndPopulatePanelDetail(game.id);
}

function closeDetailPanel() {
  dom.detailPanel.classList.remove('detail-panel--open');
  dom.detailPanel.setAttribute('aria-hidden', 'true');
  panelState.gameId      = null;
  panelState.currentGame = null;

  const sidebarOpen = dom.sidebar.classList.contains('sidebar--mobile-open');
  const drawerOpen  = dom.mylistDrawer.classList.contains('mylist-drawer--open');
  if (!sidebarOpen && !drawerOpen) dom.overlay.classList.remove('overlay--active');

  if (panelState.triggerElement) {
    panelState.triggerElement.focus();
    panelState.triggerElement = null;
  }
}

function populatePanelBasic(game) {
  dom.panelTitle.textContent = game.name ?? '';
  updateMetacriticBadge(game.metacritic);

  dom.panelStars.innerHTML       = renderStars(game.rating);
  dom.panelRatingText.textContent = game.rating
    ? `${game.rating.toFixed(1)} / 5 (${(game.ratings_count ?? 0).toLocaleString()} ratings)` : '';

  dom.panelChips.innerHTML = game.released
    ? createChipHtml('Released', formatDate(game.released)) : '';

  // Placeholder screenshot
  dom.panelScreenshotsTrack.innerHTML = game.background_image
    ? `<img class="detail-panel__screenshot-img" src="${game.background_image}" alt="${esc(game.name)}">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
                   font-size:3rem;background:var(--color-bg)">🎮</div>`;
  dom.screenshotPrevBtn.hidden = true;
  dom.screenshotNextBtn.hidden = true;
  dom.screenshotDots.innerHTML = '';

  dom.panelDescriptionText.textContent = 'Loading details…';
  dom.panelDescription.classList.remove('detail-panel__description--clamped');
  dom.panelReadMoreBtn.hidden = true;

  const platforms = (game.platforms ?? []).map(p => p.platform?.name).filter(Boolean);
  dom.panelPlatformList.innerHTML = platforms
    .map(name => `<span class="detail-panel__platform-badge">${esc(name)}</span>`)
    .join('');

  const genres = game.genres ?? [];
  dom.panelGenreTags.innerHTML = genres
    .map(g => `<button class="detail-panel__genre-tag" data-slug="${esc(g.slug)}">${esc(g.name)}</button>`)
    .join('');
  dom.panelGenreTags.querySelectorAll('.detail-panel__genre-tag').forEach(btn => {
    btn.addEventListener('click', () => applyGenreFromPanel(btn.dataset.slug));
  });

  dom.panelDetailsList.innerHTML = '';
  updatePanelSaveBtn(game.id);
}

function applyGenreFromPanel(slug) {
  state.filters.genre   = slug;
  dom.filterGenre.value = slug;
  updateActiveFilterPills();
  closeDetailPanel();
  triggerLoad();
}

async function loadAndPopulatePanelDetail(gameId) {
  if (detailCache.has(gameId)) {
    const { detail, screenshots } = detailCache.get(gameId);
    if (panelState.gameId === gameId) populatePanelFull(detail, screenshots);
    return;
  }

  try {
    const [detail, screenshotData] = await Promise.all([
      apiFetch(`${BASE_URL}/games/${gameId}?key=${API_KEY}`),
      apiFetch(`${BASE_URL}/games/${gameId}/screenshots?key=${API_KEY}&page_size=${MAX_SCREENSHOTS}`),
    ]);
    const screenshots = screenshotData.results ?? [];
    detailCache.set(gameId, { detail, screenshots });
    if (panelState.gameId === gameId) populatePanelFull(detail, screenshots);
  } catch (err) {
    console.error('Detail fetch failed:', err);
    if (panelState.gameId === gameId) {
      dom.panelDescriptionText.textContent = 'Could not load full details.';
    }
  }
}

function populatePanelFull(detail, screenshots) {
  renderScreenshots(screenshots);
  initReadMore(detail.description_raw?.trim() || 'No description available.');
  renderChips(detail);
  renderDetailsTable(detail);
}


/* ─────────────────────────────────────────
   SCREENSHOT CAROUSEL
───────────────────────────────────────── */

function renderScreenshots(screenshots) {
  if (!screenshots.length) return;

  panelState.screenshots     = screenshots;
  panelState.screenshotIndex = 0;

  dom.panelScreenshotsTrack.innerHTML = screenshots.map((s, i) =>
    `<img class="detail-panel__screenshot-img"
          src="${s.image}" alt="Screenshot ${i + 1}"
          loading="${i === 0 ? 'eager' : 'lazy'}">`
  ).join('');
  dom.panelScreenshotsTrack.style.transform = 'translateX(0)';

  const hasMany = screenshots.length > 1;
  dom.screenshotPrevBtn.hidden = !hasMany;
  dom.screenshotNextBtn.hidden = !hasMany;

  if (hasMany) {
    dom.screenshotDots.innerHTML = screenshots.map((_, i) =>
      `<button
        class="detail-panel__screenshot-dot${i === 0 ? ' detail-panel__screenshot-dot--active' : ''}"
        role="tab" aria-label="Screenshot ${i + 1}"
        aria-selected="${i === 0}" data-index="${i}"></button>`
    ).join('');
    dom.screenshotDots.querySelectorAll('.detail-panel__screenshot-dot').forEach(dot => {
      dot.addEventListener('click', () => goToScreenshot(Number(dot.dataset.index)));
    });
  } else {
    dom.screenshotDots.innerHTML = '';
  }
}

function goToScreenshot(index) {
  const count = panelState.screenshots.length;
  if (!count) return;
  panelState.screenshotIndex = ((index % count) + count) % count;
  dom.panelScreenshotsTrack.style.transform =
    `translateX(-${panelState.screenshotIndex * 100}%)`;
  dom.screenshotDots.querySelectorAll('.detail-panel__screenshot-dot').forEach((dot, i) => {
    const active = i === panelState.screenshotIndex;
    dot.classList.toggle('detail-panel__screenshot-dot--active', active);
    dot.setAttribute('aria-selected', String(active));
  });
}


/* ─────────────────────────────────────────
   PANEL CONTENT HELPERS
───────────────────────────────────────── */

function renderStars(rating) {
  if (!rating) return '';
  const filled = Math.round(rating);
  // Phase 7 fix: was var(--color-rating-gold) which is not defined in CSS;
  // using var(--color-rating-good) (yellow) which is the correct token.
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < filled ? 'var(--color-rating-good)' : 'var(--color-text-muted)'}">★</span>`
  ).join('');
}

function updateMetacriticBadge(score) {
  const cls = getRatingClass(score);
  dom.panelMetacritic.className = `detail-panel__metacritic detail-panel__metacritic--${cls}`;
  dom.panelMetacriticScore.textContent = score ?? '—';
}

function createChipHtml(label, value) {
  return `<div class="detail-panel__chip">
    <span class="detail-panel__chip-label">${esc(label)}</span>
    <span>${esc(value)}</span>
  </div>`;
}

function renderChips(detail) {
  const chips = [];
  if (detail.released)    chips.push(['Released',     formatDate(detail.released)]);
  if (detail.esrb_rating) chips.push(['ESRB',         detail.esrb_rating.name]);
  if (detail.playtime)    chips.push(['Avg. Playtime', `${detail.playtime}h`]);
  dom.panelChips.innerHTML = chips.map(([l, v]) => createChipHtml(l, v)).join('');
}

function renderDetailsTable(detail) {
  const rows = [];
  const devs = (detail.developers ?? []).map(d => d.name).filter(Boolean).join(', ');
  const pubs = (detail.publishers ?? []).map(p => p.name).filter(Boolean).join(', ');
  if (devs) rows.push(['Developer',   devs]);
  if (pubs) rows.push(['Publisher',   pubs]);
  if (detail.released)    rows.push(['Release Date', formatDate(detail.released)]);
  if (detail.esrb_rating) rows.push(['ESRB Rating',  detail.esrb_rating.name]);
  if (detail.website && /^https?:\/\//i.test(detail.website)) {
    const display = detail.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    rows.push(['Website',
      `<a href="${detail.website}" target="_blank" rel="noopener noreferrer"
          class="footer__link" style="word-break:break-all">${esc(display)}</a>`
    ]);
  }
  dom.panelDetailsList.innerHTML = rows.map(([dt, dd]) => `<dt>${esc(dt)}</dt><dd>${dd}</dd>`).join('');
}

function initReadMore(description) {
  dom.panelDescriptionText.textContent = description;
  if (description.length > DESCRIPTION_CLAMP_LIMIT) {
    dom.panelDescription.classList.add('detail-panel__description--clamped');
    dom.panelReadMoreBtn.hidden      = false;
    dom.panelReadMoreBtn.textContent = 'Read more';
    dom.panelReadMoreBtn.onclick = () => {
      const clamped = dom.panelDescription.classList.toggle('detail-panel__description--clamped');
      dom.panelReadMoreBtn.textContent = clamped ? 'Read more' : 'Read less';
    };
  } else {
    dom.panelDescription.classList.remove('detail-panel__description--clamped');
    dom.panelReadMoreBtn.hidden  = true;
    dom.panelReadMoreBtn.onclick = null;
  }
}

/** Sync the panel save button to the current saved state from myList. */
function updatePanelSaveBtn(gameId) {
  if (!gameId) return;
  const saved = isInMyList(gameId);
  const label = dom.panelSaveBtn.querySelector('.detail-panel__save-label');
  dom.panelSaveBtn.classList.toggle('detail-panel__save-btn--saved', saved);
  dom.panelSaveBtn.setAttribute('aria-pressed', String(saved));
  if (label) label.textContent = saved ? 'Saved' : 'Add to My List';
}


/* ─────────────────────────────────────────
   FILTER STATE SYNC
───────────────────────────────────────── */

function syncFiltersFromDOM() {
  state.filters.genre       = dom.filterGenre.value;
  state.filters.platform    = dom.filterPlatform.value;
  state.filters.minRating   = parseInt(dom.filterRating.value, 10) || 0;
  state.filters.yearFrom    = dom.filterYearFrom.value;
  state.filters.yearTo      = dom.filterYearTo.value;
  state.filters.ordering    = dom.filterOrdering.value;
  state.filters.multiplayer = dom.filterMultiplayer.checked;
}

function syncFiltersToDom() {
  dom.searchInput.value         = state.filters.search;
  dom.filterGenre.value         = state.filters.genre;
  dom.filterPlatform.value      = state.filters.platform;
  dom.filterRating.value        = String(state.filters.minRating);
  dom.ratingDisplay.textContent = state.filters.minRating > 0 ? `${state.filters.minRating}+` : 'Any';
  dom.filterYearFrom.value      = state.filters.yearFrom;
  dom.filterYearTo.value        = state.filters.yearTo;
  dom.filterOrdering.value      = state.filters.ordering;
  dom.filterMultiplayer.checked = state.filters.multiplayer;
  dom.filterMultiplayer.setAttribute('aria-checked', String(state.filters.multiplayer));
  dom.searchClearBtn.hidden     = !state.filters.search;
}


/* ─────────────────────────────────────────
   YEAR DROPDOWNS
───────────────────────────────────────── */

function populateYearDropdowns() {
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= EARLIEST_YEAR; year--) {
    dom.filterYearFrom.append(new Option(year, year));
    dom.filterYearTo.append(new Option(year, year));
  }
}


/* ─────────────────────────────────────────
   ACTIVE FILTER PILLS
───────────────────────────────────────── */

function hasActiveFilters() {
  const f = state.filters;
  return !!(f.search || f.genre || f.platform || f.minRating > 0 ||
            f.yearFrom || f.yearTo || f.multiplayer || f.ordering !== DEFAULT_ORDERING);
}

function getActivePillDefs() {
  const f = state.filters;
  const pills = [];
  if (f.search)        pills.push({ key: 'search',      label: `"${f.search}"` });
  if (f.genre)         pills.push({ key: 'genre',       label: GENRE_LABELS[f.genre]       || f.genre });
  if (f.platform)      pills.push({ key: 'platform',    label: PLATFORM_LABELS[f.platform] || f.platform });
  if (f.minRating > 0) pills.push({ key: 'minRating',   label: `Score ≥ ${f.minRating}` });
  if (f.yearFrom)      pills.push({ key: 'yearFrom',    label: `From ${f.yearFrom}` });
  if (f.yearTo)        pills.push({ key: 'yearTo',      label: `To ${f.yearTo}` });
  if (f.multiplayer)   pills.push({ key: 'multiplayer', label: 'Multiplayer' });
  if (f.ordering !== DEFAULT_ORDERING)
                       pills.push({ key: 'ordering',    label: ORDERING_LABELS[f.ordering] || f.ordering });
  return pills;
}

function updateActiveFilterPills() {
  dom.activeFilters.innerHTML = '';
  getActivePillDefs().forEach(({ key, label }) => {
    const pill = document.createElement('div');
    pill.className = 'active-filter-pill';
    pill.innerHTML = `
      <span>${esc(label)}</span>
      <button class="active-filter-pill__remove" aria-label="Remove ${esc(label)} filter" data-key="${key}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="3" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    pill.querySelector('.active-filter-pill__remove').addEventListener('click', e => {
      e.stopPropagation();
      removeSingleFilter(key);
    });
    dom.activeFilters.appendChild(pill);
  });
  dom.clearFiltersBtn.hidden = !hasActiveFilters();
}

const FILTER_DEFAULTS = {
  search: '', genre: '', platform: '', minRating: 0,
  yearFrom: '', yearTo: '', ordering: DEFAULT_ORDERING, multiplayer: false,
};

function removeSingleFilter(key) {
  state.filters[key] = FILTER_DEFAULTS[key];
  syncFiltersToDom();
  updateActiveFilterPills();
  triggerLoad();
}

function clearAllFilters() {
  Object.assign(state.filters, { ...FILTER_DEFAULTS });
  syncFiltersToDom();
  updateActiveFilterPills();
  triggerLoad();
}


/* ─────────────────────────────────────────
   RESULTS HEADING & COUNT
───────────────────────────────────────── */

function updateResultsHeading() {
  const f = state.filters;
  if (f.search)                dom.resultsHeading.textContent = `Results for "${f.search}"`;
  else if (hasActiveFilters()) dom.resultsHeading.textContent = 'Filtered Games';
  else                         dom.resultsHeading.textContent = 'Discover Games';
}

function updateResultsCount() {
  dom.resultsCount.textContent = state.totalCount > 0
    ? `${state.totalCount.toLocaleString()} games` : '';
}


/* ─────────────────────────────────────────
   UI STATE HELPERS
───────────────────────────────────────── */

function showEmptyState() {
  dom.emptyState.style.display   = 'flex';
  dom.errorState.style.display   = 'none';
  dom.loadMoreWrap.style.display = 'none';
  dom.gameGrid.innerHTML  = '';
  dom.gameGrid.setAttribute('aria-busy', 'false');
}

function showErrorState(msg) {
  dom.errorState.style.display   = 'flex';
  dom.emptyState.style.display   = 'none';
  dom.loadMoreWrap.style.display = 'none';
  dom.gameGrid.innerHTML  = '';
  dom.gameGrid.setAttribute('aria-busy', 'false');
  if (msg) dom.errorMessage.textContent = msg;
}

function hideStates() {
  dom.emptyState.style.display = 'none';
  dom.errorState.style.display = 'none';
}

function setLoadMoreBusy(busy) {
  const textEl    = dom.loadMoreBtn.querySelector('.load-more-btn__text');
  const spinnerEl = dom.loadMoreBtn.querySelector('.load-more-btn__spinner');
  dom.loadMoreBtn.classList.toggle('load-more-btn--loading', busy);
  dom.loadMoreBtn.setAttribute('aria-busy', String(busy));
  if (textEl)    textEl.textContent = busy ? 'Loading…' : 'Load More';
  if (spinnerEl) spinnerEl.hidden   = !busy;
}


/* ─────────────────────────────────────────
   DATA LOADING
───────────────────────────────────────── */

async function loadGames() {
  if (state.isLoading) return;
  state.isLoading = true;

  hideStates();
  showSkeletons();
  updateResultsHeading();

  try {
    const data  = await apiFetch(buildGamesUrl());
    const raw   = data.results ?? [];
    state.games       = state.filters.search ? rerankBySearchRelevance(raw, state.filters.search) : raw;
    state.nextPageUrl = data.next  ?? null;
    state.totalCount  = data.count ?? 0;

    dom.gameGrid.innerHTML = '';
    if (!state.games.length) { showEmptyState(); return; }

    if (!hasActiveFilters()) initHero(state.games);

    appendCards(state.games);
    updateResultsCount();
    dom.loadMoreWrap.style.display = state.nextPageUrl ? 'flex' : 'none';

  } catch (err) {
    console.error('loadGames failed:', err);
    showErrorState('Could not load games. Check your API key and internet connection, then try again.');
  } finally {
    state.isLoading = false;
  }
}

async function loadMore() {
  if (state.isLoading || !state.nextPageUrl) return;
  state.isLoading = true;
  setLoadMoreBusy(true);
  try {
    const data     = await apiFetch(state.nextPageUrl);
    const raw      = data.results ?? [];
    const newGames = state.filters.search ? rerankBySearchRelevance(raw, state.filters.search) : raw;
    state.games.push(...newGames);
    state.nextPageUrl = data.next ?? null;
    appendCards(newGames);
    dom.loadMoreWrap.style.display = state.nextPageUrl ? 'flex' : 'none';
  } catch (err) {
    console.error('loadMore failed:', err);
    showToast('Failed to load more games. Please try again.', 'error'); // Phase 7
  } finally {
    state.isLoading = false;
    setLoadMoreBusy(false);
  }
}

function triggerLoad() {
  stopHeroTimer();
  loadGames();
}


/* ─────────────────────────────────────────
   FILTER INITIALISATION
───────────────────────────────────────── */

const debouncedSearch = debounce(() => {
  state.filters.search = dom.searchInput.value.trim();
  updateActiveFilterPills();
  triggerLoad();
}, 450);

const debouncedSlider = debounce(() => {
  state.filters.minRating = parseInt(dom.filterRating.value, 10) || 0;
  updateActiveFilterPills();
  triggerLoad();
}, 350);

function initFilters() {
  populateYearDropdowns();

  dom.searchInput.addEventListener('input', () => {
    dom.searchClearBtn.hidden = !dom.searchInput.value;
    debouncedSearch();
  });

  dom.searchClearBtn.addEventListener('click', () => {
    dom.searchInput.value = '';
    dom.searchClearBtn.hidden = true;
    state.filters.search = '';
    updateActiveFilterPills();
    triggerLoad();
  });

  [dom.filterGenre, dom.filterPlatform, dom.filterYearFrom,
   dom.filterYearTo, dom.filterOrdering].forEach(el => {
    el.addEventListener('change', () => {
      syncFiltersFromDOM();
      updateActiveFilterPills();
      triggerLoad();
    });
  });

  dom.filterRating.addEventListener('input', () => {
    const val = parseInt(dom.filterRating.value, 10);
    dom.ratingDisplay.textContent = val > 0 ? `${val}+` : 'Any';
    dom.filterRating.setAttribute('aria-valuenow', val);
    debouncedSlider();
  });

  dom.filterMultiplayer.addEventListener('change', () => {
    state.filters.multiplayer = dom.filterMultiplayer.checked;
    dom.filterMultiplayer.setAttribute('aria-checked', String(state.filters.multiplayer));
    updateActiveFilterPills();
    triggerLoad();
  });

  dom.clearFiltersBtn.addEventListener('click', clearAllFilters);
}


/* ─────────────────────────────────────────
   MOBILE SIDEBAR & OVERLAY
───────────────────────────────────────── */

function openMobileSidebar() {
  dom.sidebar.classList.add('sidebar--mobile-open');
  dom.overlay.classList.add('overlay--active');
  dom.mobileFilterBtn.setAttribute('aria-expanded', 'true');
  if (dom.menuToggleBtn) dom.menuToggleBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileSidebar() {
  dom.sidebar.classList.remove('sidebar--mobile-open');
  dom.mobileFilterBtn.setAttribute('aria-expanded', 'false');
  if (dom.menuToggleBtn) dom.menuToggleBtn.setAttribute('aria-expanded', 'false');
  const panelOpen  = dom.detailPanel.classList.contains('detail-panel--open');
  const drawerOpen = dom.mylistDrawer.classList.contains('mylist-drawer--open');
  if (!panelOpen && !drawerOpen) dom.overlay.classList.remove('overlay--active');
}

function closeActiveOverlay() {
  if (dom.sidebar.classList.contains('sidebar--mobile-open'))     closeMobileSidebar();
  if (dom.detailPanel.classList.contains('detail-panel--open'))   closeDetailPanel();
  if (dom.mylistDrawer.classList.contains('mylist-drawer--open')) closeMyListDrawer();
  dom.overlay.classList.remove('overlay--active');
}


/* ─────────────────────────────────────────
   MY LIST — init
───────────────────────────────────────── */

function initMyList() {
  myList = loadMyList();
  updateNavBadge();
  // Drawer renders on open, not here
}


/* ─────────────────────────────────────────
   EVENTS
───────────────────────────────────────── */

function initEvents() {
  // Grid
  dom.loadMoreBtn.addEventListener('click', loadMore);
  dom.retryBtn.addEventListener('click', loadGames);
  dom.resetAllBtn.addEventListener('click', clearAllFilters);

  // Hero "View Details"
  dom.heroDetailBtn.addEventListener('click', () => {
    const id = Number(dom.heroDetailBtn.dataset.gameId);
    // Phase 7 fix: fall back to hero.games in case filters changed state.games
    const game = state.games.find(g => g.id === id)
              || state.hero.games.find(g => g.id === id);
    if (game) openDetailPanel(game);
  });

  // Detail panel
  dom.panelCloseBtn.addEventListener('click', closeDetailPanel);

  dom.screenshotPrevBtn.addEventListener('click', () =>
    goToScreenshot(panelState.screenshotIndex - 1)
  );
  dom.screenshotNextBtn.addEventListener('click', () =>
    goToScreenshot(panelState.screenshotIndex + 1)
  );

  // Save / remove from My List
  dom.panelSaveBtn.addEventListener('click', () => {
    if (!panelState.currentGame) return;
    const wasInList = isInMyList(panelState.currentGame.id);
    toggleMyList(panelState.currentGame);
    // Pulse animation on add only
    if (!wasInList) {
      dom.panelSaveBtn.classList.add('detail-panel__save-btn--pulse');
      setTimeout(() => dom.panelSaveBtn.classList.remove('detail-panel__save-btn--pulse'), 320);
    }
  });

  // My List drawer
  dom.mylistBtn.addEventListener('click', openMyListDrawer);
  dom.mylistCloseBtn.addEventListener('click', closeMyListDrawer);

  // "My List" nav link (intercept — open drawer instead of scrolling)
  if (dom.navMylistLink) {
    dom.navMylistLink.addEventListener('click', e => {
      e.preventDefault();
      openMyListDrawer();
    });
  }

  // Mobile sidebar — game section "Filters" button
  dom.mobileFilterBtn.addEventListener('click', () => {
    dom.sidebar.classList.contains('sidebar--mobile-open')
      ? closeMobileSidebar()
      : openMobileSidebar();
  });

  // Phase 7: wire up the navbar hamburger button (was present in HTML but had no handler)
  if (dom.menuToggleBtn) {
    dom.menuToggleBtn.addEventListener('click', () => {
      dom.sidebar.classList.contains('sidebar--mobile-open')
        ? closeMobileSidebar()
        : openMobileSidebar();
    });
  }

  // Overlay tap — closes whichever layer is using it
  dom.overlay.addEventListener('click', closeActiveOverlay);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeActiveOverlay();
      return;
    }
    // Phase 7 fix: only navigate screenshots when multiple exist
    const panelOpen = dom.detailPanel.classList.contains('detail-panel--open');
    if (panelOpen && panelState.screenshots.length > 1) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goToScreenshot(panelState.screenshotIndex + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goToScreenshot(panelState.screenshotIndex - 1); }
    }
  });
}


/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initMyList();  // load persisted list before anything renders
  initFilters();
  initEvents();
  loadGames();
});
