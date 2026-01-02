import { Injectable, signal, inject, effect } from '@angular/core';
import { FirebaseService } from './firebase.service';

export interface Cell {
  x: number;
  y: number;
  char: string; // The letter
  confirmed: boolean; // True if part of a submitted word
}

@Injectable({
  providedIn: 'root'
})
export class GridStoreService {
  // Key: "x,y"
  private cellsMap = new Map<string, Cell>();
  private firebase = inject(FirebaseService);
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;
  private skipNextSync = false; // Prevent saving when receiving remote changes

  // Signals
  readonly cells = signal<Map<string, Cell>>(new Map());
  readonly viewportOffset = signal({ x: 0, y: 0 });
  readonly selectedCell = signal<{ x: number, y: number } | null>(null);
  readonly inputDirection = signal<'across' | 'down'>('across');
  readonly isLoading = signal(true);
  readonly lastPlacedTime = signal<number>(0);
  readonly wordsPlacedCount = signal<number>(0);

  constructor() {
    // Initialize lastPlacedTime from cookie
    const savedTime = this.getCookie('cross_plane_last_placed');
    if (savedTime) {
      this.lastPlacedTime.set(parseInt(savedTime, 10));
    }

    // Initialize wordsPlacedCount from cookie
    const savedCount = this.getCookie('cross_plane_words_placed');
    if (savedCount) {
      this.wordsPlacedCount.set(parseInt(savedCount, 10));
    }

    // Load saved data from Firebase on startup
    this.loadFromFirebase();

    // Subscribe to real-time updates
    this.firebase.subscribeToChanges((cells) => {
      this.handleRemoteUpdate(cells);
    });

    // Auto-save when cells change (debounced)
    effect(() => {
      const cells = this.cells();
      // Skip if not initialized yet (avoid saving on load)
      if (!this.isInitialized) return;
      // Skip if this update came from remote sync
      if (this.skipNextSync) {
        this.skipNextSync = false;
        return;
      }

      // Clear previous timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      // Save after 1 second of no changes
      this.saveTimeout = setTimeout(() => {
        this.saveToFirebase();
      }, 1000);
    });

    // Persist lastPlacedTime to cookie
    effect(() => {
      const time = this.lastPlacedTime();
      if (time > 0) {
        this.setCookie('cross_plane_last_placed', time.toString(), 365);
      }
    });

    // Persist wordsPlacedCount to cookie
    effect(() => {
      const count = this.wordsPlacedCount();
      this.setCookie('cross_plane_words_placed', count.toString(), 365);
    });
  }

  public setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  public getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private handleRemoteUpdate(cells: Cell[]): void {
    // Only update if there are actual changes
    const newMap = new Map<string, Cell>();
    cells.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      newMap.set(key, cell);
    });

    // Check if there are real differences
    if (this.cellsMap.size !== newMap.size || !this.mapsEqual(this.cellsMap, newMap)) {
      this.skipNextSync = true;
      this.cellsMap = newMap;
      this.cells.set(new Map(this.cellsMap));
      console.log('Grid updated from Firebase (real-time sync)');
    }
  }

  private mapsEqual(a: Map<string, Cell>, b: Map<string, Cell>): boolean {
    if (a.size !== b.size) return false;
    for (const [key, cellA] of a) {
      const cellB = b.get(key);
      if (!cellB || cellA.char !== cellB.char || cellA.confirmed !== cellB.confirmed) {
        return false;
      }
    }
    return true;
  }

  private async loadFromFirebase(): Promise<void> {
    try {
      const savedCells = await this.firebase.loadCells();

      if (savedCells.length > 0) {
        savedCells.forEach(cell => {
          const key = `${cell.x},${cell.y}`;
          this.cellsMap.set(key, cell);
        });
        this.cells.set(new Map(this.cellsMap));
      } else {
        // Initialize with default "START" word
        this.initializeDefault();
      }
    } catch (error) {
      console.error('Failed to load from Firebase:', error);
      // Fall back to default
      this.initializeDefault();
    } finally {
      this.isLoading.set(false);
      this.isInitialized = true;
    }
  }

  private initializeDefault(): void {
    this.setCell(-5, 0, 'C', true);
    this.setCell(-4, 0, 'R', true);
    this.setCell(-3, 0, 'O', true);
    this.setCell(-2, 0, 'S', true);
    this.setCell(-1, 0, 'S', true);
    this.setCell(0, 0, '.', true);
    this.setCell(1, 0, 'P', true);
    this.setCell(2, 0, 'L', true);
    this.setCell(3, 0, 'A', true);
    this.setCell(4, 0, 'N', true);
    this.setCell(5, 0, 'E', true);
  }

  private async saveToFirebase(): Promise<void> {
    try {
      await this.firebase.saveCells(this.cellsMap);
      console.log('Grid saved to Firebase');
    } catch (error) {
      console.error('Failed to save to Firebase:', error);
    }
  }

  getCell(x: number, y: number): Cell | undefined {
    return this.cellsMap.get(`${x},${y}`);
  }

  setCell(x: number, y: number, char: string, confirmed: boolean) {
    const key = `${x},${y}`;
    this.cellsMap.set(key, { x, y, char: char.toUpperCase(), confirmed });
    // Trigger signal update by creating a new map reference
    this.cells.set(new Map(this.cellsMap));
  }

  removeCell(x: number, y: number) {
    const key = `${x},${y}`;
    if (this.cellsMap.has(key)) {
      this.cellsMap.delete(key);
      this.cells.set(new Map(this.cellsMap));
    }
  }

  // Deterministic procedural generation for black squares
  isBlackSquare(x: number, y: number): boolean {
    // 1. Safe Zone: Keep the center start area clear (Radius 6)
    if (Math.abs(x) < 6 && Math.abs(y) < 6) return false;

    // 2. Procedural "Crossword" Generation
    const h = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1;
    const hashVal = Math.abs(h);

    return hashVal > 0.88;
  }

  isValidSlot(x: number, y: number): boolean {
    return !this.isBlackSquare(x, y);
  }

  incrementWordsPlaced() {
    this.wordsPlacedCount.update(c => c + 1);
  }
}