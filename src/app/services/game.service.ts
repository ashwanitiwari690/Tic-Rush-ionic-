import { Injectable } from '@angular/core';

export type Mode = 'computer' | 'team' | 'survival' | 'daily';
export type Mark = 'X' | 'O' | '';
export type Difficulty = 'easy' | 'smart' | 'master';
export type MarkThemeId = 'classic' | 'bolt' | 'gem' | 'flame' | 'royal';

export interface Stats {
  wins: number; losses: number; draws: number; games: number; bestLevel: number; coins: number; survivalBest: number;
  /** Consecutive days the daily challenge has been won; resets once a day is missed. */
  dailyStreak: number;
  /** Local date (YYYY-MM-DD) of the last daily-challenge win, or '' if never won. */
  dailyLastCompleted: string;
}

export interface MarkTheme {
  id: MarkThemeId;
  name: string;
  price: number;
  x: string;
  o: string;
  className: string;
}

/** Coin-to-cash conversion used for wallet withdrawals: 100 coins = ₹1. */
export const COINS_PER_RUPEE = 100;

const KEY = 'tic-rush-state-v3';
const DEFAULT: Stats = { wins: 0, losses: 0, draws: 0, games: 0, bestLevel: 1, coins: 0, survivalBest: 0, dailyStreak: 0, dailyLastCompleted: '' };
export const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MARK_THEMES: readonly MarkTheme[] = [
  { id: 'classic', name: 'Classic', price: 0, x: 'X', o: 'O', className: 'theme-classic' },
  { id: 'bolt', name: 'Neon Bolt', price: 100, x: '⚡', o: '◉', className: 'theme-bolt' },
  { id: 'gem', name: 'Cyber Gem', price: 200, x: '✦', o: '◆', className: 'theme-gem' },
  { id: 'flame', name: 'Flame Rush', price: 300, x: '✕', o: '●', className: 'theme-flame' },
  { id: 'royal', name: 'Royal Nova', price: 500, x: '✧', o: '◎', className: 'theme-royal' }
];

@Injectable({ providedIn: 'root' })
export class GameService {
  private state: Stats = this.load();
  private ownedThemes: MarkThemeId[] = this.loadOwnedThemes();

  level = this.state.bestLevel;
  mode: Mode = 'computer';
  difficulty: Difficulty = 'smart';
  board: Mark[] = Array(9).fill('');
  current: 'X' | 'O' = 'X';
  busy = false;
  winner: Mark | 'draw' = '';
  /** Indices of the three cells that completed the winning line. */
  winningLine: number[] = [];
  winningLineType = '';
  lastMove = -1;
  selectedThemeId: MarkThemeId = this.loadSelectedTheme();
  /** Wins in a row on the current survival run; resets to 0 on loss or when leaving survival mode. */
  survivalStreak = 0;

  get stats(): Stats { return { ...this.state }; }
  get coins(): number { return this.state.coins; }
  /** Current wallet balance converted to rupees at the fixed COINS_PER_RUPEE rate. */
  get walletRupees(): number { return Math.floor(this.state.coins / COINS_PER_RUPEE * 100) / 100; }
  get dailyStreak(): number { return this.state.dailyStreak; }
  get dailyCompletedToday(): boolean { return this.state.dailyLastCompleted === todayStr(); }
  get themes(): readonly MarkTheme[] { return MARK_THEMES; }
  get ownedMarkThemes(): readonly MarkThemeId[] { return this.ownedThemes; }
  get selectedTheme(): MarkTheme { return this.getTheme(this.selectedThemeId); }

  getTheme(id: MarkThemeId): MarkTheme {
    return MARK_THEMES.find(theme => theme.id === id) ?? MARK_THEMES[0];
  }

  isThemeOwned(id: MarkThemeId): boolean { return this.ownedThemes.includes(id); }

  buyOrSelectTheme(id: MarkThemeId): boolean {
    const theme = this.getTheme(id);
    if (this.isThemeOwned(id)) {
      this.selectedThemeId = id;
      this.savePreferences();
      return true;
    }
    if (this.state.coins < theme.price) return false;
    this.state.coins -= theme.price;
    this.ownedThemes = [...this.ownedThemes, id];
    this.selectedThemeId = id;
    this.save();
    this.savePreferences();
    return true;
  }

  /** Unlocks a theme for free after the player has watched a rewarded video, instead of spending coins. */
  unlockThemeByAd(id: MarkThemeId): void {
    if (this.isThemeOwned(id)) {
      this.selectedThemeId = id;
      this.savePreferences();
      return;
    }
    this.ownedThemes = [...this.ownedThemes, id];
    this.selectedThemeId = id;
    this.savePreferences();
  }

  addCoins(amount: number): void {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (!value) return;
    this.state.coins += value;
    this.save();
  }

  setMode(mode: Mode) {
    this.mode = mode;
    if (mode === 'survival') {
      this.survivalStreak = 0;
      this.difficulty = 'easy';
    } else if (mode === 'daily') {
      this.difficulty = 'smart';
    }
    this.resetBoard();
  }
  setDifficulty(difficulty: Difficulty) { this.difficulty = difficulty; }

  resetBoard() {
    this.board = Array(9).fill('');
    this.current = 'X';
    this.busy = false;
    this.winner = '';
    this.winningLine = [];
    this.winningLineType = '';
    this.lastMove = -1;
  }

  play(index: number): { valid: boolean; finished: boolean } {
    if (index < 0 || index > 8 || this.busy || this.winner || this.board[index]) return { valid:false, finished:false };

    this.place(index, this.current);
    if (this.finishIfNeeded()) return { valid:true, finished:true };

    if (this.mode === 'team') {
      this.current = this.current === 'X' ? 'O' : 'X';
      return { valid:true, finished:false };
    }

    this.current = 'O';
    this.busy = true;
    window.setTimeout(() => {
      this.computerMove();
      this.busy = false;
    }, this.difficulty === 'master' ? 180 : 120);

    return { valid:true, finished:false };
  }

  private place(index: number, mark: 'X'|'O') {
    this.board = this.board.map((cell, i) => i === index ? mark : cell);
    this.lastMove = index;
  }

  private computerMove() {
    if (this.winner) return;
    const move = this.pickComputerMove();
    if (move >= 0) this.place(move, 'O');
    if (!this.finishIfNeeded()) this.current = 'X';
  }

  private pickComputerMove(): number {
    const empty = this.emptyCells();
    if (!empty.length) return -1;

    if (this.difficulty === 'easy') {
      const tactical = Math.random() < .45 ? this.findTactical('O') : -1;
      if (tactical >= 0) return tactical;
      return empty[Math.floor(Math.random() * empty.length)];
    }

    const win = this.findTactical('O');
    if (win >= 0) return win;
    const block = this.findTactical('X');
    if (block >= 0) return block;

    if (this.difficulty === 'master') return this.bestMinimaxMove();
    if (!this.board[4]) return 4;

    const corners = [0,2,6,8].filter(i => !this.board[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return empty[Math.floor(Math.random() * empty.length)];
  }

  private bestMinimaxMove(): number {
    let bestScore = -Infinity, best = -1;
    for (const i of this.emptyCells()) {
      this.board[i] = 'O';
      const score = this.minimax(false, 0);
      this.board[i] = '';
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  private minimax(maximizing: boolean, depth: number): number {
    const result = getWinner(this.board);
    if (result === 'O') return 10 - depth;
    if (result === 'X') return depth - 10;
    if (this.board.every(Boolean)) return 0;

    let best = maximizing ? -Infinity : Infinity;
    for (const i of this.emptyCells()) {
      this.board[i] = maximizing ? 'O' : 'X';
      const score = this.minimax(!maximizing, depth + 1);
      this.board[i] = '';
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  private findTactical(mark: 'X'|'O'): number {
    for (const line of WIN_LINES) {
      const vals = line.map(i => this.board[i]);
      if (vals.filter(v => v === mark).length === 2 && vals.includes('')) return line[vals.indexOf('')];
    }
    return -1;
  }

  private emptyCells(): number[] {
    const cells:number[] = [];
    for (let i=0;i<9;i++) if (!this.board[i]) cells.push(i);
    return cells;
  }

  private finishIfNeeded(): boolean {
    const winningLine = findWinningLine(this.board);
    if (winningLine) {
      this.winningLine = winningLine;
      this.winningLineType = getWinningLineType(winningLine);
      this.winner = this.board[winningLine[0]] as 'X' | 'O';
      this.record(this.winner);
      return true;
    }
    if (this.board.every(Boolean)) {
      this.winningLine = [];
      this.winningLineType = '';
      this.winner = 'draw';
      this.record('draw');
      return true;
    }
    return false;
  }

  private record(result: Mark|'draw') {
    this.state.games++;
    if (this.mode === 'survival') {
      this.recordSurvival(result);
      this.save();
      return;
    }
    if (this.mode === 'daily') {
      this.recordDaily(result);
      this.save();
      return;
    }
    if (result === 'X') {
      this.state.wins++;
      if (this.mode === 'computer') {
        this.state.coins += 10;
        this.level++;
        this.state.bestLevel = Math.max(this.state.bestLevel, this.level);
      }
    } else if (result === 'O') {
      this.state.losses++;
    } else {
      this.state.draws++;
    }
    this.save();
  }

  private recordSurvival(result: Mark|'draw') {
    if (result === 'X') {
      this.state.wins++;
      this.state.coins += 10;
      this.survivalStreak++;
      this.state.survivalBest = Math.max(this.state.survivalBest, this.survivalStreak);
      this.difficulty = this.survivalStreak >= 5 ? 'master' : this.survivalStreak >= 2 ? 'smart' : 'easy';
    } else if (result === 'O') {
      this.state.losses++;
      this.survivalStreak = 0;
      this.difficulty = 'easy';
    } else {
      this.state.draws++;
    }
  }

  private recordDaily(result: Mark|'draw') {
    if (result === 'X') {
      this.state.wins++;
      if (!this.dailyCompletedToday) {
        const today = todayStr();
        this.state.dailyStreak = this.state.dailyLastCompleted === yesterdayStr() ? this.state.dailyStreak + 1 : 1;
        this.state.dailyLastCompleted = today;
        this.state.coins += 25;
      }
    } else if (result === 'O') {
      this.state.losses++;
    } else {
      this.state.draws++;
    }
  }

  private load(): Stats {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const stats: Stats = { ...DEFAULT, ...raw };
      if (stats.dailyLastCompleted && stats.dailyLastCompleted !== todayStr() && stats.dailyLastCompleted !== yesterdayStr()) {
        stats.dailyStreak = 0;
      }
      return stats;
    } catch { return { ...DEFAULT }; }
  }

  private loadOwnedThemes(): MarkThemeId[] {
    try {
      const raw = JSON.parse(localStorage.getItem('tic-rush-owned-themes-v1') || '["classic"]');
      return Array.isArray(raw) && raw.includes('classic') ? raw : ['classic'];
    } catch { return ['classic']; }
  }

  private loadSelectedTheme(): MarkThemeId {
    const value = localStorage.getItem('tic-rush-selected-theme-v1') as MarkThemeId | null;
    return value && this.isThemeOwned(value) ? value : 'classic';
  }

  private savePreferences() {
    localStorage.setItem('tic-rush-owned-themes-v1', JSON.stringify(this.ownedThemes));
    localStorage.setItem('tic-rush-selected-theme-v1', this.selectedThemeId);
  }

  private save() {
    localStorage.setItem(KEY, JSON.stringify(this.state));
    this.savePreferences();
  }
}

export function getWinningLineType(line: number[]): string {
  const key = line.join(',');
  const types: Record<string, string> = {
    '0,1,2': 'row-1',
    '3,4,5': 'row-2',
    '6,7,8': 'row-3',
    '0,3,6': 'col-1',
    '1,4,7': 'col-2',
    '2,5,8': 'col-3',
    '0,4,8': 'diag-main',
    '2,4,6': 'diag-cross'
  };
  return types[key] ?? '';
}

export function findWinningLine(board: Mark[]): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

export function getWinner(board: Mark[]): Mark {
  for (const [a,b,c] of WIN_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return '';
}
