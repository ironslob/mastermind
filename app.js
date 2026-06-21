import {
  COLORS,
  CONFIG,
  getDateKey,
  getPuzzleNumber,
  generateSecretCode,
  scoreGuess,
  isWinningGuess,
  loadStats,
  getTodayGame,
  recordGameResult,
  saveInProgress,
  buildShareTextWithUrl,
  winPercentage,
  clearStats,
  hasSeenIntro,
  markIntroSeen,
  getTheme,
  setTheme,
  toggleTheme,
  orderedFeedbackPegTypes,
} from './game.js';

const state = {
  dateKey: getDateKey(),
  puzzleNumber: getPuzzleNumber(),
  secret: generateSecretCode(getDateKey()),
  stats: loadStats(),
  history: [],
  currentGuess: Array(CONFIG.pegCount).fill(null),
  gameOver: false,
};

const els = {
  puzzleInfo: document.getElementById('puzzle-info'),
  gameArea: document.getElementById('game-area'),
  board: document.getElementById('board'),
  playDock: document.getElementById('play-dock'),
  completedDock: document.getElementById('completed-dock'),
  guessSlots: document.getElementById('guess-slots'),
  submitBtn: document.getElementById('submit-btn'),
  palette: document.getElementById('palette'),
  completedMessage: document.getElementById('completed-message'),
  completedSecret: document.getElementById('completed-secret'),
  shareBtn: document.getElementById('share-btn'),
  statsBtn: document.getElementById('stats-btn'),
  toast: document.getElementById('toast'),
  statsModal: document.getElementById('stats-modal'),
  statsClose: document.getElementById('stats-close'),
  clearStatsBtn: document.getElementById('clear-stats-btn'),
  clearStatsModal: document.getElementById('clear-stats-modal'),
  clearStatsCancel: document.getElementById('clear-stats-cancel'),
  clearStatsConfirm: document.getElementById('clear-stats-confirm'),
  resultModal: document.getElementById('result-modal'),
  resultTitle: document.getElementById('result-title'),
  resultSubtitle: document.getElementById('result-subtitle'),
  resultSecret: document.getElementById('result-secret'),
  resultShareBtn: document.getElementById('result-share-btn'),
  resultStatsBtn: document.getElementById('result-stats-btn'),
  resultCloseBtn: document.getElementById('result-close-btn'),
  introModal: document.getElementById('intro-modal'),
  introPlayBtn: document.getElementById('intro-play-btn'),
  helpBtn: document.getElementById('help-btn'),
  themeBtn: document.getElementById('theme-btn'),
};

function init() {
  els.puzzleInfo.textContent = `#${state.puzzleNumber} · ${formatDisplayDate(state.dateKey)}`;

  syncThemeToggle();
  renderPalette();
  restoreOrStart();
  bindEvents();

  if (!hasSeenIntro()) {
    showIntro();
  }
}

function showIntro() {
  els.introModal.showModal();
}

function syncThemeToggle() {
  const theme = getTheme();
  setTheme(theme);
  els.themeBtn.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function restoreOrStart() {
  const todayGame = getTodayGame(state.stats, state.dateKey);

  if (todayGame?.completed) {
    showCompletedView(todayGame);
    return;
  }

  if (todayGame && !todayGame.completed) {
    state.history = todayGame.history ?? [];
    state.currentGuess = todayGame.currentGuess ?? Array(CONFIG.pegCount).fill(null);
  }

  showPlayView();
  renderBoard();
  renderCurrentGuess();
  updateSubmitButton();
}

function showCompletedView(game) {
  state.history = game.history ?? [];
  state.gameOver = true;

  els.playDock.classList.add('hidden');
  els.completedDock.classList.remove('hidden');

  if (game.won) {
    els.completedMessage.textContent = `You solved it in ${game.guessCount} ${game.guessCount === 1 ? 'guess' : 'guesses'}!`;
    els.completedSecret.classList.add('hidden');
    els.completedSecret.innerHTML = '';
  } else {
    els.completedMessage.textContent = 'Better luck next time!';
    renderSecretCode(els.completedSecret, normalizeSecretCode(game.revealedCode));
    els.completedSecret.classList.remove('hidden');
  }

  renderBoard(true);
}

function showPlayView() {
  els.completedDock.classList.add('hidden');
  els.playDock.classList.remove('hidden');
}

const LEGACY_COLOR_NAMES = {
  Red: 0,
  Blue: 1,
  Green: 2,
  Yellow: 3,
  Orange: 4,
  Purple: 5,
  Pink: 6,
  Teal: 7,
};

function normalizeSecretCode(revealedCode) {
  if (!revealedCode?.length) return null;
  if (typeof revealedCode[0] === 'number') return revealedCode;
  return revealedCode.map(
    (name) => LEGACY_COLOR_NAMES[name] ?? COLORS.find((c) => c.name === name)?.id ?? 0,
  );
}

function renderSecretCode(container, secret) {
  container.innerHTML = '';
  if (!secret) return;

  secret.forEach((colorId) => {
    const peg = document.createElement('div');
    peg.className = 'secret-peg';
    peg.style.background = colorHex(colorId);
    peg.setAttribute('aria-label', colorName(colorId));
    container.appendChild(peg);
  });
}

function colorName(colorId) {
  return COLORS[colorId]?.name ?? '?';
}

function colorHex(colorId) {
  return COLORS[colorId]?.hex ?? '#ccc';
}

function renderPalette() {
  els.palette.innerHTML = '';
  COLORS.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-btn';
    btn.style.background = color.hex;
    btn.setAttribute('aria-label', color.name);
    btn.dataset.colorId = color.id;
    btn.addEventListener('click', () => addColorToGuess(color.id));
    els.palette.appendChild(btn);
  });
}

function firstEmptySlot() {
  return state.currentGuess.findIndex((c) => c === null);
}

function addColorToGuess(colorId) {
  if (state.gameOver) return;

  const slot = firstEmptySlot();
  if (slot === -1) return;

  state.currentGuess[slot] = colorId;
  renderCurrentGuess();
  updateSubmitButton();
  persistProgress();
}

function tapPeg(index) {
  if (state.gameOver) return;

  if (state.currentGuess[index] === null) return;

  state.currentGuess[index] = null;
  renderCurrentGuess();
  updateSubmitButton();
  persistProgress();
}

function renderCurrentGuess() {
  els.guessSlots.innerHTML = '';
  state.currentGuess.forEach((colorId, index) => {
    const peg = document.createElement('button');
    peg.type = 'button';
    peg.className = 'peg' + (colorId === null ? ' empty' : '');
    peg.setAttribute(
      'aria-label',
      colorId === null
        ? `Slot ${index + 1}, empty`
        : `Slot ${index + 1}, ${colorName(colorId)}, tap to remove`,
    );
    if (colorId !== null) peg.style.background = colorHex(colorId);
    peg.addEventListener('click', () => tapPeg(index));
    els.guessSlots.appendChild(peg);
  });
}

function renderBoard(staticBoard = false) {
  els.board.className = 'board';
  renderBoardColumns(els.board, state.history, staticBoard || state.gameOver);
}

function renderBoardColumns(container, history, staticBoard = false) {
  container.innerHTML = '';

  const leftCol = document.createElement('div');
  leftCol.className = 'board-column';
  leftCol.setAttribute('aria-label', 'Guesses 1 to 10');

  const rightCol = document.createElement('div');
  rightCol.className = 'board-column';
  rightCol.setAttribute('aria-label', 'Guesses 11 to 20');

  const half = CONFIG.maxGuesses / 2;
  for (let i = 0; i < CONFIG.maxGuesses; i++) {
    const row = createBoardRow(i + 1, history[i] ?? null, staticBoard);
    (i < half ? leftCol : rightCol).appendChild(row);
  }

  container.appendChild(leftCol);
  container.appendChild(rightCol);
}

function createBoardRow(guessNumber, entry, staticBoard = false) {
  const row = document.createElement('div');
  row.className = 'guess-row guess-row-compact';
  if (entry) row.classList.add('completed');
  else if (!staticBoard && guessNumber === state.history.length + 1 && !state.gameOver) {
    row.classList.add('active');
  }

  const num = document.createElement('span');
  num.className = 'guess-number';
  num.textContent = guessNumber;
  row.appendChild(num);

  const pegs = document.createElement('div');
  pegs.className = 'guess-pegs';
  const colors = entry?.guess ?? Array(CONFIG.pegCount).fill(null);
  colors.forEach((colorId) => {
    const peg = document.createElement('div');
    peg.className = 'peg peg-compact' + (colorId === null ? ' empty' : '');
    if (colorId !== null) peg.style.background = colorHex(colorId);
    peg.setAttribute('aria-hidden', 'true');
    pegs.appendChild(peg);
  });
  row.appendChild(pegs);

  const fb = document.createElement('div');
  fb.className = 'feedback feedback-compact';
  if (entry) {
    fb.setAttribute('aria-label', `${entry.feedback.black} exact, ${entry.feedback.white} partial`);
    appendFeedbackPegs(fb, entry.feedback);
  }
  row.appendChild(fb);

  return row;
}

function appendFeedbackPegs(container, feedback) {
  const types = orderedFeedbackPegTypes(feedback);

  const slots = Array.from({ length: 4 }, (_, index) => {
    const slot = document.createElement('div');
    slot.className = 'feedback-slot';
    const type = types[index];
    if (type) {
      const peg = document.createElement('div');
      peg.className = `feedback-peg ${type}`;
      slot.appendChild(peg);
    }
    return slot;
  });

  slots.forEach((slot) => container.appendChild(slot));
}

function updateSubmitButton() {
  const complete = state.currentGuess.every((c) => c !== null);
  els.submitBtn.disabled = !complete || state.gameOver;
}

function submitGuess() {
  if (state.gameOver) return;
  if (!state.currentGuess.every((c) => c !== null)) return;

  const feedback = scoreGuess(state.secret, state.currentGuess);
  state.history.push({
    guess: [...state.currentGuess],
    feedback,
  });

  const won = isWinningGuess(state.secret, state.currentGuess);
  const outOfGuesses = state.history.length >= CONFIG.maxGuesses;

  if (won || outOfGuesses) {
    endGame(won);
    return;
  }

  state.currentGuess = Array(CONFIG.pegCount).fill(null);
  renderBoard();
  renderCurrentGuess();
  updateSubmitButton();
  persistProgress();
}

function endGame(won) {
  state.gameOver = true;

  state.stats = recordGameResult(state.stats, state.dateKey, {
    won,
    guessCount: state.history.length,
    history: state.history,
    ...(!won && { revealedCode: [...state.secret] }),
  });

  renderBoard();
  els.submitBtn.disabled = true;

  showResultModal(won);
}

function showResultModal(won) {
  els.resultTitle.textContent = won ? 'You got it!' : 'Game over';
  els.resultSubtitle.textContent = won
    ? `Solved in ${state.history.length} ${state.history.length === 1 ? 'guess' : 'guesses'}`
    : 'Better luck next time!';

  if (won) {
    els.resultSecret.classList.add('hidden');
    els.resultSecret.innerHTML = '';
  } else {
    renderSecretCode(els.resultSecret, state.secret);
    els.resultSecret.classList.remove('hidden');
  }

  els.resultModal.showModal();
}

function showStatsModal() {
  const s = state.stats;
  document.getElementById('stat-played').textContent = s.gamesPlayed;
  document.getElementById('stat-win-pct').textContent = winPercentage(s);
  document.getElementById('stat-streak').textContent = s.currentStreak;
  document.getElementById('stat-max-streak').textContent = s.maxStreak;

  const dist = document.getElementById('distribution');
  dist.innerHTML = '';
  const maxCount = Math.max(1, ...s.guessDistribution);

  const chart = document.createElement('div');
  chart.className = 'dist-chart';

  s.guessDistribution.forEach((count, i) => {
    const col = document.createElement('div');
    col.className = 'dist-bar-col';

    const countEl = document.createElement('span');
    countEl.className = 'dist-count';
    countEl.textContent = count > 0 ? count : '';

    const barWrap = document.createElement('div');
    barWrap.className = 'dist-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'dist-bar';
    if (count > 0 && count === maxCount) bar.classList.add('highlight');
    bar.style.height = count > 0 ? `${(count / maxCount) * 100}%` : '0';
    barWrap.appendChild(bar);

    const label = document.createElement('span');
    label.className = 'dist-label';
    label.textContent = i + 1;

    col.appendChild(countEl);
    col.appendChild(barWrap);
    col.appendChild(label);
    chart.appendChild(col);
  });

  dist.appendChild(chart);

  document.getElementById('next-puzzle').textContent = 'Come back tomorrow for a new puzzle!';
  els.statsModal.showModal();
}

function resetToFreshGame() {
  showPlayView();
  state.history = [];
  state.currentGuess = Array(CONFIG.pegCount).fill(null);
  state.gameOver = false;
  renderBoard();
  renderCurrentGuess();
  updateSubmitButton();
}

function confirmClearStats() {
  els.clearStatsModal.showModal();
}

function handleClearStats() {
  state.stats = clearStats();
  resetToFreshGame();
  els.clearStatsModal.close();
  els.statsModal.close();
  showToast('Stats cleared');
}

function getShareContent() {
  const todayGame = getTodayGame(state.stats, state.dateKey);
  return buildShareTextWithUrl(
    {
      puzzleNumber: state.puzzleNumber,
      won: todayGame?.won ?? false,
      guessCount: todayGame?.guessCount ?? state.history.length,
      history: todayGame?.history ?? state.history,
    },
    window.location.href.split('?')[0],
  );
}

async function shareScore(event) {
  const btn = event?.currentTarget;
  const text = getShareContent();

  try {
    await navigator.clipboard.writeText(text);
    flashShareButton(btn);
    showToast('Copied to clipboard!');
  } catch {
    showToast('Unable to copy');
  }
}

function flashShareButton(btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 2000);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  setTimeout(() => els.toast.classList.add('hidden'), 2000);
}

function persistProgress() {
  saveInProgress(state.stats, state.dateKey, {
    history: state.history,
    currentGuess: state.currentGuess,
  });
}

function bindEvents() {
  els.submitBtn.addEventListener('click', submitGuess);

  els.shareBtn.addEventListener('click', shareScore);
  els.statsBtn.addEventListener('click', showStatsModal);
  els.statsClose.addEventListener('click', () => els.statsModal.close());
  els.clearStatsBtn.addEventListener('click', confirmClearStats);
  els.clearStatsCancel.addEventListener('click', () => els.clearStatsModal.close());
  els.clearStatsConfirm.addEventListener('click', handleClearStats);

  els.resultShareBtn.addEventListener('click', shareScore);
  els.resultStatsBtn.addEventListener('click', () => {
    els.resultModal.close();
    showStatsModal();
  });
  els.resultCloseBtn.addEventListener('click', () => {
    els.resultModal.close();
    showCompletedView(getTodayGame(state.stats, state.dateKey));
  });

  els.statsModal.addEventListener('click', (e) => {
    if (e.target === els.statsModal) els.statsModal.close();
  });

  els.introPlayBtn.addEventListener('click', () => {
    markIntroSeen();
    els.introModal.close();
  });

  els.helpBtn.addEventListener('click', showIntro);

  els.themeBtn.addEventListener('click', () => {
    toggleTheme();
    syncThemeToggle();
  });
}

init();
