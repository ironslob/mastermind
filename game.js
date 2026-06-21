export const COLORS = [
  { id: 0, name: 'Red', hex: '#E53935' },
  { id: 1, name: 'Blue', hex: '#1E88E5' },
  { id: 2, name: 'Green', hex: '#43A047' },
  { id: 3, name: 'Yellow', hex: '#FDD835' },
  { id: 4, name: 'Orange', hex: '#FB8C00' },
  { id: 5, name: 'Purple', hex: '#8E24AA' },
  { id: 6, name: 'Pink', hex: '#EC407A' },
  { id: 7, name: 'Teal', hex: '#00ACC1' },
];

export const CONFIG = {
  pegCount: 4,
  allowDuplicates: true,
  maxGuesses: 20,
};

export const LAUNCH_DATE = new Date('2026-06-21T00:00:00');

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

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateSecretCode(dateKey = getDateKey()) {
  const rand = createRng(hashString(`mastermind-v1-${dateKey}`));
  const { pegCount, allowDuplicates } = CONFIG;

  if (allowDuplicates) {
    return Array.from({ length: pegCount }, () => Math.floor(rand() * COLORS.length));
  }

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
    const blacks = '⬛'.repeat(row.feedback.black);
    const whites = '⬜'.repeat(row.feedback.white);
    lines.push(blacks + whites || '·');
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
