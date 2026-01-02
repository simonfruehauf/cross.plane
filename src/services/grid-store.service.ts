import { Injectable, signal, computed } from '@angular/core';

export interface Cell {
  x: number;
  y: number;
  char: string; // The letter
  confirmed: boolean; // True if part of a submitted word
  definition?: string; // Optional tooltip info
}

@Injectable({
  providedIn: 'root'
})
export class GridStoreService {
  // Key: "x,y"
  private cellsMap = new Map<string, Cell>();

  // Signals
  readonly cells = signal<Map<string, Cell>>(new Map());
  readonly viewportOffset = signal({ x: 0, y: 0 });
  readonly selectedCell = signal<{ x: number, y: number } | null>(null);
  readonly inputDirection = signal<'across' | 'down'>('across');

  constructor() {
    // Seed the center
    this.setCell(-2, 0, 'S', true, 'Start here');
    this.setCell(-1, 0, 'T', true, 'Start here');
    this.setCell(0, 0, 'A', true, 'Start here');
    this.setCell(1, 0, 'R', true, 'Start here');
    this.setCell(2, 0, 'T', true, 'Start here');
  }

  getCell(x: number, y: number): Cell | undefined {
    return this.cellsMap.get(`${x},${y}`);
  }

  setCell(x: number, y: number, char: string, confirmed: boolean, definition?: string) {
    const key = `${x},${y}`;
    this.cellsMap.set(key, { x, y, char: char.toUpperCase(), confirmed, definition });
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
    // We want a structure that implies "rooms" or "blocks" of words, connected by open paths.
    // Pure random noise creates "blobs". We want "bars" and "structure".

    // Hash function for pseudo-randomness
    const h = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1;
    const hashVal = Math.abs(h);

    // Grid Structure:
    // Create a "skeleton" grid every N cells to form rooms.
    // We use 9 as a stride to give space for words (approx 7-8 letters max before a wall usually).
    const stride = 9;

    // Check if we are on a grid line
    const onVerticalGrid = x % stride === 0;
    const onHorizontalGrid = y % stride === 0;

    // We want the grid to be "broken" so words can pass through.
    // If on a grid line, be a wall 70% of the time. (30% gaps)
    if (onVerticalGrid || onHorizontalGrid) {
      // Use a different hash seed for grid lines to ensure variety
      const gridHash = Math.abs((Math.sin(x * 93.989 + y * 67.233) * 54758.5453) % 1);
      return gridHash > 0.35;
    }

    // Inner Room Noise:
    // Inside the rooms, we want some random walls to prevent massive open rectangles.
    // Standard crosswords have ~15-20% black squares.
    // We already have grid lines. Let's add sparse scatter inside.
    return hashVal > 0.88;
  }

  isValidSlot(x: number, y: number): boolean {
    return !this.isBlackSquare(x, y);
  }
}