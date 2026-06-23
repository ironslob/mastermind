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
} from './game.js?v=dec2194';

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
  introModal: document.getElementById('intro-modal'),
  introTitle: document.getElementById('intro-title'),
  introPages: document.getElementById('intro-pages'),
  introBack: document.getElementById('intro-back'),
  introPlay: document.getElementById('intro-play'),
  introNext: document.getElementById('intro-next'),
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
  buildIntroPages();
  showIntroPage(0);
  els.introModal.showModal();
}

const INTRO_TITLES = ['How to play'];

const INTRO_EXAMPLES = [
  {
    title: 'Exact and partial pegs',
    secret: [0, 1, 2, 3],
    guess: [0, 2, 1, 3],
    lead:
      'Each guess narrows the possibilities. The feedback tells you what to keep, move, or discard.',
    tip:
      'Two exact pegs (●) lock those colours into the right slots. Two partial pegs (○) mean Green and Rose are in the code but in the wrong positions — swap them on your next guess.',
  },
  {
    title: 'Ruling colours out',
    secret: [0, 1, 2, 3],
    guess: [4, 5, 6, 7],
    tip:
      'No feedback at all means none of these four colours are in the secret. Cross them off mentally and try only the colours you have not used yet.',
  },
  {
    title: 'Duplicates in the code',
    secret: [0, 0, 1, 2],
    guess: [0, 0, 0, 0],
    tip:
      'Two exact pegs here means two positions are correct, but with duplicates allowed you still need to work out which Blues belong where. Follow-up guesses that change one slot at a time narrow it down.',
  },
];

const INTRO_DEDUCTION = {
  title: 'Combining clues',
  secret: [0, 1, 2, 3],
  guesses: [
    {
      guess: [4, 5, 6, 7],
      hint: 'No feedback — Cyan, Purple, Orange, and Grey are not in the secret.',
    },
    {
      guess: [0, 4, 5, 6],
      hint: 'Blue is exact in slot 1. The other three slots still need work.',
    },
    {
      guess: [0, 1, 2, 6],
      hint: 'Slots 1–3 are Blue, Rose, and Green. Only Gold fits the last slot.',
    },
  ],
  summary:
    'Each guess adds constraints. Stack the clues and only one code satisfies them all.',
};

let introPage = 0;
let introPageCount = 0;
let introPagesBuilt = false;

function renderIntroExamplePegs(colorIds) {
  const row = document.createElement('div');
  row.className = 'intro-example-pegs';
  colorIds.forEach((colorId) => {
    const peg = document.createElement('div');
    peg.className = 'intro-example-peg';
    peg.style.background = colorHex(colorId);
    peg.setAttribute('aria-label', colorName(colorId));
    row.appendChild(peg);
  });
  return row;
}

function renderIntroExampleFeedback(feedback) {
  const box = document.createElement('div');
  box.className = 'intro-example-feedback';
  box.setAttribute(
    'aria-label',
    `${feedback.black} exact, ${feedback.white} partial`,
  );

  const types = orderedFeedbackPegTypes(feedback);
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'intro-example-feedback-slot';
    const type = types[i];
    if (type) {
      const peg = document.createElement('div');
      peg.className = `intro-example-feedback-peg ${type}`;
      slot.appendChild(peg);
    }
    box.appendChild(slot);
  }

  return box;
}

function buildIntroExamplePage(example, index) {
  const feedback = scoreGuess(example.secret, example.guess);
  const page = document.createElement('section');
  page.className = 'intro-page hidden';
  page.dataset.introPage = String(index + 1);

  const body = document.createElement('div');
  body.className = 'intro-example-page';

  if (example.lead) {
    const lead = document.createElement('p');
    lead.className = 'intro-examples-lead';
    lead.textContent = example.lead;
    body.appendChild(lead);
  }

  const secretLine = document.createElement('div');
  secretLine.className = 'intro-example-line';
  const secretLabel = document.createElement('span');
  secretLabel.className = 'intro-example-label';
  secretLabel.textContent = 'Secret';
  secretLine.appendChild(secretLabel);
  secretLine.appendChild(renderIntroExamplePegs(example.secret));
  body.appendChild(secretLine);

  const guessLine = document.createElement('div');
  guessLine.className = 'intro-example-line';
  const guessLabel = document.createElement('span');
  guessLabel.className = 'intro-example-label';
  guessLabel.textContent = 'Guess';
  guessLine.appendChild(guessLabel);
  guessLine.appendChild(renderIntroExamplePegs(example.guess));
  guessLine.appendChild(renderIntroExampleFeedback(feedback));
  body.appendChild(guessLine);

  const scoreText = document.createElement('p');
  scoreText.className = 'intro-example-score';
  scoreText.textContent = `${feedback.black} exact · ${feedback.white} partial`;
  body.appendChild(scoreText);

  const tip = document.createElement('p');
  tip.className = 'intro-example-tip';
  tip.innerHTML = `<strong>Why it helps:</strong> ${example.tip}`;
  body.appendChild(tip);

  page.appendChild(body);
  INTRO_TITLES.push(`Example ${index + 1}: ${example.title}`);
  return page;
}

function buildIntroDeductionPage(pageIndex) {
  const page = document.createElement('section');
  page.className = 'intro-page hidden';
  page.dataset.introPage = String(pageIndex);

  const body = document.createElement('div');
  body.className = 'intro-deduction-page';

  const lead = document.createElement('p');
  lead.className = 'intro-examples-lead';
  lead.textContent =
    'No single guess reveals the code. Each row adds a clue — together they narrow it to one answer.';
  body.appendChild(lead);

  const rows = document.createElement('div');
  rows.className = 'intro-deduction-rows';

  INTRO_DEDUCTION.guesses.forEach((entry, index) => {
    const feedback = scoreGuess(INTRO_DEDUCTION.secret, entry.guess);
    const entryEl = document.createElement('div');
    entryEl.className = 'intro-deduction-entry';

    const line = document.createElement('div');
    line.className = 'intro-deduction-line';

    const num = document.createElement('span');
    num.className = 'intro-deduction-num';
    num.textContent = index + 1;
    line.appendChild(num);
    line.appendChild(renderIntroExamplePegs(entry.guess));
    line.appendChild(renderIntroExampleFeedback(feedback));
    entryEl.appendChild(line);

    const hint = document.createElement('p');
    hint.className = 'intro-deduction-hint';
    hint.textContent = entry.hint;
    entryEl.appendChild(hint);

    rows.appendChild(entryEl);
  });
  body.appendChild(rows);

  const secretLine = document.createElement('div');
  secretLine.className = 'intro-deduction-secret';
  const secretLabel = document.createElement('span');
  secretLabel.className = 'intro-example-label';
  secretLabel.textContent = 'Secret';
  secretLine.appendChild(secretLabel);
  secretLine.appendChild(renderIntroExamplePegs(INTRO_DEDUCTION.secret));
  body.appendChild(secretLine);

  const summary = document.createElement('p');
  summary.className = 'intro-example-tip';
  summary.innerHTML = `<strong>Why it helps:</strong> ${INTRO_DEDUCTION.summary}`;
  body.appendChild(summary);

  page.appendChild(body);
  INTRO_TITLES.push(INTRO_DEDUCTION.title);
  return page;
}

function buildIntroPages() {
  if (introPagesBuilt) return;

  INTRO_EXAMPLES.forEach((example, index) => {
    els.introPages.appendChild(buildIntroExamplePage(example, index));
  });

  const deductionPageIndex = 1 + INTRO_EXAMPLES.length;
  els.introPages.appendChild(buildIntroDeductionPage(deductionPageIndex));

  introPageCount = deductionPageIndex + 1;
  introPagesBuilt = true;
}

function showIntroPage(pageIndex) {
  introPage = pageIndex;

  els.introPages.querySelectorAll('.intro-page').forEach((page) => {
    const active = Number(page.dataset.introPage) === pageIndex;
    page.classList.toggle('hidden', !active);
  });

  els.introTitle.textContent = INTRO_TITLES[pageIndex];
  els.introBack.disabled = pageIndex === 0;
  els.introNext.disabled = pageIndex >= introPageCount - 1;
}

function introStartPlay() {
  markIntroSeen();
  els.introModal.close();
}

function introGoNext() {
  if (introPage < introPageCount - 1) showIntroPage(introPage + 1);
}

function introGoBack() {
  if (introPage > 0) showIntroPage(introPage - 1);
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

  showCompletedView(getTodayGame(state.stats, state.dateKey));
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

  els.statsModal.addEventListener('click', (e) => {
    if (e.target === els.statsModal) els.statsModal.close();
  });

  els.introBack.addEventListener('click', introGoBack);
  els.introPlay.addEventListener('click', introStartPlay);
  els.introNext.addEventListener('click', introGoNext);

  els.helpBtn.addEventListener('click', showIntro);

  els.themeBtn.addEventListener('click', () => {
    toggleTheme();
    syncThemeToggle();
  });
}

init();
