// Paul Tol bright-inspired palette: distinguishable for common colour-vision deficiencies.
export const COLORS = [
  { id: 0, name: 'Blue', hex: '#4477AA' },
  { id: 1, name: 'Rose', hex: '#EE6677' },
  { id: 2, name: 'Green', hex: '#228833' },
  { id: 3, name: 'Gold', hex: '#CCBB44' },
  { id: 4, name: 'Cyan', hex: '#66CCEE' },
  { id: 5, name: 'Purple', hex: '#AA3377' },
  { id: 6, name: 'Orange', hex: '#EE7733' },
  { id: 7, name: 'Grey', hex: '#999999' },
];

export const CONFIG = {
  pegCount: 4,
  allowDuplicates: true,
  maxGuesses: 20,
};

export const LAUNCH_DATE = new Date('2026-06-21T00:00:00');

/** Bump when the daily code algorithm changes (invalidates prior puzzles). */
const CODE_SEED_VERSION = 'mastermind-v2';

const INTRO_SEEN_KEY = 'mastermind-intro-seen';
const THEME_KEY = 'mastermind-theme';
const STORAGE_KEY = 'mastermind-stats';

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#121213' : '#fafafa';
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function hasSeenIntro() {
  return localStorage.getItem(INTRO_SEEN_KEY) === 'true';
}

export function markIntroSeen() {
  localStorage.setItem(INTRO_SEEN_KEY, 'true');
}

export function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPuzzleNumber(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const launch = new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  const diff = Math.floor((today - launch) / 86400000);
  return diff + 1;
}

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** SplitMix32 — good 32-bit mixing for small seeds (e.g. date strings). */
function splitmix32(state) {
  state = (state + 0x9e3779b9) >>> 0;
  let z = state;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

function seededColor(dateKey, pegIndex) {
  const seed = fnv1a(`${CODE_SEED_VERSION}-${dateKey}`);
  const pegSalt = fnv1a(`peg-${pegIndex}`);
  return splitmix32(seed ^ pegSalt) % COLORS.length;
}

function createStreamRng(dateKey) {
  let state = fnv1a(`${CODE_SEED_VERSION}-${dateKey}`);
  return () => splitmix32(state = splitmix32(state)) / 4294967296;
}

export function generateSecretCode(dateKey = getDateKey()) {
  const { pegCount, allowDuplicates } = CONFIG;

  if (allowDuplicates) {
    return Array.from({ length: pegCount }, (_, pegIndex) => seededColor(dateKey, pegIndex));
  }

  const rand = createStreamRng(dateKey);
  const pool = COLORS.map((c) => c.id);
  const code = [];
  for (let i = 0; i < pegCount; i++) {
    const idx = Math.floor(rand() * pool.length);
    code.push(pool.splice(idx, 1)[0]);
  }
  return code;
}

export function scoreGuess(secret, guess) {
  let black = 0;
  let white = 0;
  const secretRemaining = [...secret];
  const guessRemaining = [...guess];

  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      black++;
      secretRemaining[i] = null;
      guessRemaining[i] = null;
    }
  }

  for (let i = 0; i < guessRemaining.length; i++) {
    const color = guessRemaining[i];
    if (color === null) continue;
    const matchIdx = secretRemaining.indexOf(color);
    if (matchIdx !== -1) {
      white++;
      secretRemaining[matchIdx] = null;
    }
  }

  return { black, white };
}

/** Exact (black) pegs always precede partial (white) pegs in display order. */
export function orderedFeedbackPegTypes({ black, white }) {
  return [
    ...Array(black).fill('black'),
    ...Array(white).fill('white'),
  ];
}

export function isWinningGuess(secret, guess) {
  return guess.every((color, i) => color === secret[i]);
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats(),
      ...parsed,
      guessDistribution: parsed.guessDistribution ?? defaultStats().guessDistribution,
      games: parsed.games ?? {},
    };
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: Array(CONFIG.maxGuesses).fill(0),
    games: {},
  };
}

export function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function clearStats() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultStats();
}

export function getTodayGame(stats, dateKey = getDateKey()) {
  return stats.games[dateKey] ?? null;
}

export function recordGameResult(stats, dateKey, { won, guessCount, history, revealedCode }) {
  if (stats.games[dateKey]?.completed) return stats;

  stats.games[dateKey] = {
    completed: true,
    won,
    guessCount,
    history,
    ...(revealedCode && { revealedCode }),
  };

  stats.gamesPlayed += 1;

  if (won) {
    stats.gamesWon += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    if (guessCount >= 1 && guessCount <= CONFIG.maxGuesses) {
      stats.guessDistribution[guessCount - 1] += 1;
    }
  } else {
    stats.currentStreak = 0;
  }

  saveStats(stats);
  return stats;
}

export function saveInProgress(stats, dateKey, { history, currentGuess }) {
  stats.games[dateKey] = {
    completed: false,
    history,
    currentGuess,
  };
  saveStats(stats);
}

export function clearInProgress(stats, dateKey) {
  const game = stats.games[dateKey];
  if (game && !game.completed) {
    delete stats.games[dateKey];
    saveStats(stats);
  }
}

export function buildShareText({ puzzleNumber, won, guessCount, history }) {
  const lines = [`Daily Mastermind #${puzzleNumber} ${won ? guessCount : 'X'}/${CONFIG.maxGuesses}`];

  for (const row of history) {
    const pegs = orderedFeedbackPegTypes(row.feedback)
      .map((type) => (type === 'black' ? '⬛' : '⬜'))
      .join('');
    lines.push(pegs || '·');
  }

  return lines.join('\n');
}

export function buildShareTextWithUrl(options, url) {
  const text = buildShareText(options);
  return url ? `${text}\n\n${url}` : text;
}

export function winPercentage(stats) {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
