import { Component, ElementRef, ViewChild, computed, signal, effect, AfterViewInit, NgZone, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridStoreService, Cell } from './services/grid-store.service';
import { DictionaryService } from './services/dict.service';
import { TopBarComponent } from './app/components/top-bar/top-bar.component';

export interface Theme {
    id: string;
    name: string;
    unlockCount: number; // Words needed to unlock
    buttonColor: string; // Color used for the UI button
    colors: {
        bg: string;
        gridLines: string;
        blackSquare: string;
        text: string;
        confirmedBg: string; // cell background
        confirmedText: string;
        confirmedBorder: string;
        startWordBg: string;
        startWordBorder: string;
        pendingBg: string;
        pendingText: string;
        pendingBorder: string;
        selectionBg: string;
        selectionBorder: string;
        selectionShadow: string;
    };
}

export const THEMES: Theme[] = [
    {
        id: 'default',
        name: 'Classic',
        unlockCount: 0,
        buttonColor: '#ffffff',
        colors: {
            bg: '#ffffff',
            gridLines: 'rgba(0,0,0,0.05)',
            blackSquare: '#000000',
            text: '#000000',
            confirmedBg: '#ffffff',
            confirmedText: '#000000',
            confirmedBorder: '#d1d5db',
            startWordBg: '#fef9c3', // Yellow-100
            startWordBorder: '#fde047', // Yellow-300
            pendingBg: '#93c5fd', // Blue-300
            pendingText: '#2563eb', // Blue-600
            pendingBorder: '#d1d5db',
            selectionBg: '#dbeafe', // Blue-100
            selectionBorder: '#3b82f6', // Blue-500
            selectionShadow: 'rgba(59, 130, 246, 0.5)'
        }
    },
    {
        id: 'dark',
        name: 'Midnight',
        unlockCount: 10,
        buttonColor: '#1f2937',
        colors: {
            bg: '#1f2937',
            gridLines: 'rgba(255,255,255,0.1)',
            blackSquare: '#111827',
            text: '#f3f4f6',
            confirmedBg: '#1f2937',
            confirmedText: '#f3f4f6',
            confirmedBorder: '#374151',
            startWordBg: '#3f2c06',
            startWordBorder: '#ca8a04',
            pendingBg: '#1e3a8a',
            pendingText: '#60a5fa',
            pendingBorder: '#374151',
            selectionBg: '#1e40af',
            selectionBorder: '#3b82f6',
            selectionShadow: 'rgba(59, 130, 246, 0.5)'
        }
    },
    {
        id: 'blueprint',
        name: 'Blueprint',
        unlockCount: 20,
        buttonColor: '#3555a1',
        colors: {
            bg: '#3555a1',
            gridLines: 'rgba(255,255,255,0.2)',
            blackSquare: '#25397bff',
            text: '#ffffff',
            confirmedBg: '#3555a1',
            confirmedText: '#ffffff',
            confirmedBorder: '#93c5fd',
            startWordBg: 'rgba(147, 197, 253,0.2)',
            startWordBorder: 'rgba(147, 197, 253,0.2)',
            pendingBg: '#2563eb',
            pendingText: '#ffffff',
            pendingBorder: '#ffffff',
            selectionBg: 'rgba(255,255,255,0.1)',
            selectionBorder: '#ffffff',
            selectionShadow: 'rgba(255, 255, 255, 0.5)'
        }
    },
    {
        id: 'retro',
        name: 'Terminal',
        unlockCount: 60,
        buttonColor: '#00ff41',
        colors: {
            bg: '#0c0c0c',
            gridLines: 'rgba(0, 255, 65, 0.1)',
            blackSquare: '#00ff41',
            text: '#00ff41',
            confirmedBg: '#0c0c0c',
            confirmedText: '#00ff41',
            confirmedBorder: '#003b00',
            startWordBg: '#001a00',
            startWordBorder: '#008f11',
            pendingBg: '#002200',
            pendingText: '#ccffcc',
            pendingBorder: '#00ff41',
            selectionBg: 'rgba(0, 255, 65, 0.1)',
            selectionBorder: '#00ff41',
            selectionShadow: 'rgba(0, 255, 65, 0.5)'
        }
    },
    {
        id: 'coffee',
        name: 'Latte',
        unlockCount: 100,
        buttonColor: '#f5ebe0',
        colors: {
            bg: '#f5ebe0',
            gridLines: 'rgba(214, 204, 194, 0.5)',
            blackSquare: '#4a3b32',
            text: '#3e2723',
            confirmedBg: '#f5ebe0',
            confirmedText: '#3e2723',
            confirmedBorder: '#d6ccc2',
            startWordBg: '#e6ccb2',
            startWordBorder: '#d5bdaf',
            pendingBg: '#e3d5ca',
            pendingText: '#3e2723',
            pendingBorder: '#b08968',
            selectionBg: 'rgba(213, 189, 175, 0.4)',
            selectionBorder: '#7f5539',
            selectionShadow: 'rgba(127, 85, 57, 0.3)'
        }
    }
];

export interface Font {
    id: string;
    name: string;
    fontFamily: string;
    unlockCount: number;
}

export const FONTS: Font[] = [
    {
        id: 'classic',
        name: 'Classic',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        unlockCount: 0
    },
    {
        id: 'hand',
        name: 'Hand',
        fontFamily: '"Patrick Hand", cursive',
        unlockCount: 20
    },
    {
        id: 'robot',
        name: 'Roboto',
        fontFamily: '"Roboto Mono", monospace',
        unlockCount: 25
    },
    {
        id: 'pixel',
        name: 'Pixel',
        fontFamily: '"Pixelify Sans", monospace',
        unlockCount: 40
    },
    {
        id: 'gothic',
        name: 'Gothic',
        fontFamily: '"UnifrakturMaguntia", cursive',
        unlockCount: 100
    }
];

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, TopBarComponent],
    templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnInit {
    @ViewChild('hiddenInput') hiddenInput!: ElementRef<HTMLInputElement>;
    @ViewChild('gridCanvas') gridCanvas!: ElementRef<HTMLCanvasElement>;

    private ctx!: CanvasRenderingContext2D;
    private ngZone = inject(NgZone);
    private animationFrameId: number | null = null;
    private needsRender = true;

    // Panning State
    isPanning = false;
    startX = 0;
    startY = 0;
    startOffsetX = 0;
    startOffsetY = 0;

    // Zoom State
    zoomLevel = signal(1.0);
    readonly MIN_ZOOM = 0.03;
    readonly MAX_ZOOM = 2.0;

    // Pinch Zoom State
    isPinching = false;
    initialPinchDist = 0;
    startZoom = 1;

    // Grid constants
    readonly CELL_SIZE = 40;
    readonly COOLDOWN_MS = 5000;

    // Logic State
    pendingWordCoords = signal<{ x: number, y: number, char: string }[]>([]);
    isValidating = signal(false);
    validationMessage = signal('');
    isError = signal(false);

    // Theme & Font State
    activeTheme = signal<Theme>(THEMES[0]);
    themes = THEMES;

    activeFont = signal<Font>(FONTS[0]);
    fonts = FONTS;


    // Track where the current input session started
    entryStart = signal<{ x: number, y: number } | null>(null);

    // Computed signals
    offsetX = computed(() => this.grid.viewportOffset().x);
    offsetY = computed(() => this.grid.viewportOffset().y);
    showText = computed(() => this.zoomLevel() > 0.35);

    constructor(public grid: GridStoreService, private dictionary: DictionaryService) {
        // Set up effect to trigger re-render when state changes
        effect(() => {
            this.zoomLevel();
            this.grid.viewportOffset();
            this.grid.cells();
            this.grid.selectedCell();
            this.grid.inputDirection();
            this.pendingWordCoords();
            this.grid.inputDirection();
            this.pendingWordCoords();
            this.activeTheme(); // Trigger render on theme change
            this.activeFont(); // Trigger render on font change

            this.requestRender();
        });

        // Initialize activeTheme from cookie
        const savedThemeId = this.grid.getCookie('cross_plane_theme');
        if (savedThemeId) {
            const savedTheme = this.themes.find(t => t.id === savedThemeId);
            if (savedTheme) {
                this.activeTheme.set(savedTheme);
            }
        }

        // Initialize activeFont from cookie
        const savedFontId = this.grid.getCookie('cross_plane_font');
        if (savedFontId) {
            const savedFont = this.fonts.find(f => f.id === savedFontId);
            if (savedFont) {
                this.activeFont.set(savedFont);
            }
        }

        // Effect to update body background color to match theme and save to cookie
        effect(() => {
            const theme = this.activeTheme();
            document.body.style.backgroundColor = theme.colors.bg;
            this.grid.setCookie('cross_plane_theme', theme.id, 365);
        });

        // Effect to save font preference
        effect(() => {
            const font = this.activeFont();
            this.grid.setCookie('cross_plane_font', font.id, 365);
        });
    }

    ngOnInit() {
        const params = new URLSearchParams(window.location.search);
        const xParam = params.get('x');
        const yParam = params.get('y');

        if (xParam && yParam) {
            const x = parseInt(xParam, 10);
            const y = parseInt(yParam, 10);

            if (!isNaN(x) && !isNaN(y)) {
                // Calculate offset to center grid position (x,y)
                // ScreenCenterX = GridCenterX + OffsetX + (GridX * CellSize)
                // We want ScreenCenterX == Width/2, so GridCenterX + OffsetX + (GridX * CellSize) = 0 (relative to center)
                // Actually: ScreenX = CenterX + OffsetX + GridX * CellSize
                // CenterX is width/2.
                // We want ScreenX to be CenterX.
                // 0 = OffsetX + GridX * CellSize
                // OffsetX = -(GridX * CellSize)

                const cellSize = this.CELL_SIZE * this.zoomLevel();
                this.grid.viewportOffset.set({
                    x: -x * cellSize,
                    y: -y * cellSize
                });
            }
        }
    }

    ngAfterViewInit() {
        this.setupCanvas();
        this.startRenderLoop();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private setupCanvas() {
        const canvas = this.gridCanvas.nativeElement;
        this.ctx = canvas.getContext('2d')!;
        this.resizeCanvas();
    }

    private resizeCanvas() {
        const canvas = this.gridCanvas.nativeElement;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';

        this.ctx.scale(dpr, dpr);
        this.requestRender();
    }

    private requestRender() {
        this.needsRender = true;
    }

    private startRenderLoop() {
        this.ngZone.runOutsideAngular(() => {
            const render = () => {
                if (this.needsRender) {
                    this.renderCanvas();
                    this.needsRender = false;
                }
                this.animationFrameId = requestAnimationFrame(render);
            };
            render();
        });
    }

    private renderCanvas() {
        const ctx = this.ctx;
        const width = window.innerWidth;
        const height = window.innerHeight;

        const theme = this.activeTheme().colors;

        ctx.clearRect(0, 0, width, height);

        // Fill background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);

        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoom;

        const centerX = width / 2 + offset.x;
        const centerY = height / 2 + offset.y;

        const startGridX = Math.floor(-centerX / cellSize) - 1;
        const endGridX = Math.ceil((width - centerX) / cellSize) + 1;
        const startGridY = Math.floor(-centerY / cellSize) - 1;
        const endGridY = Math.ceil((height - centerY) / cellSize) + 1;

        // Draw background grid pattern
        ctx.strokeStyle = theme.gridLines;
        ctx.lineWidth = 1;

        for (let x = startGridX; x <= endGridX; x++) {
            const screenX = centerX + x * cellSize;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, height);
            ctx.stroke();
        }
        for (let y = startGridY; y <= endGridY; y++) {
            const screenY = centerY + y * cellSize;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(width, screenY);
            ctx.stroke();
        }

        // Draw black squares (walls)
        ctx.fillStyle = theme.blackSquare;
        for (let x = startGridX; x <= endGridX; x++) {
            for (let y = startGridY; y <= endGridY; y++) {
                if (this.grid.isBlackSquare(x, y)) {
                    const screenX = centerX + x * cellSize;
                    const screenY = centerY + y * cellSize;
                    ctx.fillRect(screenX + 0.5, screenY + 0.5, cellSize - 1, cellSize - 1);
                }
            }
        }

        // Draw cells with letters
        const showText = this.showText();
        const selectedCell = this.grid.selectedCell();
        const fontSize = Math.max(8, Math.floor(cellSize * 0.55));

        ctx.font = `bold ${fontSize}px ${this.activeFont().fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw confirmed cells
        // Hybrid Render:
        // If the viewport area is smaller than the total number of cells, iterate the viewport (spatial lookup).
        // This makes rendering O(Viewport) which is constant time relative to grid size.
        // If zoomed out or sparse, iterate the map to avoid checking millions of empty cells.
        const viewportW = endGridX - startGridX;
        const viewportH = endGridY - startGridY;
        const viewportArea = viewportW * viewportH;
        const totalCells = this.grid.cells().size;

        // Threshold: If viewport has fewer slots than total cells (times a constant factor for overhead), scan viewport.
        // Otherwise scan all cells and filter.
        const useViewportScan = viewportArea < (totalCells * 2);

        if (useViewportScan) {
            for (let x = startGridX; x <= endGridX; x++) {
                for (let y = startGridY; y <= endGridY; y++) {
                    const cell = this.grid.getCell(x, y);
                    if (cell) {
                        this.drawCell(ctx, cell, centerX, centerY, cellSize, theme, showText, selectedCell);
                    }
                }
            }
        } else {
            this.grid.cells().forEach(cell => {
                // Optimization: Check bounds first
                if (cell.x < startGridX || cell.x > endGridX || cell.y < startGridY || cell.y > endGridY) {
                    return;
                }
                this.drawCell(ctx, cell, centerX, centerY, cellSize, theme, showText, selectedCell);
            });
        }

        // Draw pending cells
        this.pendingWordCoords().forEach(p => {
            const screenX = centerX + p.x * cellSize;
            const screenY = centerY + p.y * cellSize;

            if (screenX + cellSize < 0 || screenX > width || screenY + cellSize < 0 || screenY > height) {
                return;
            }

            if (showText) {
                const isSelected = selectedCell && selectedCell.x === p.x && selectedCell.y === p.y;
                ctx.fillStyle = isSelected ? theme.selectionBg : theme.confirmedBg;
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.strokeStyle = theme.pendingBorder;
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.fillStyle = theme.pendingText;
                ctx.fillText(p.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
            } else {
                ctx.fillStyle = theme.pendingBg;
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
            }
        });

        // Draw selection cursor
        if (selectedCell && showText) {
            const screenX = centerX + selectedCell.x * cellSize - 1;
            const screenY = centerY + selectedCell.y * cellSize - 1;

            ctx.strokeStyle = theme.selectionBorder;
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);

            ctx.shadowColor = theme.selectionShadow;
            ctx.shadowBlur = 10;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);
            ctx.shadowBlur = 0;

            const isAcross = this.grid.inputDirection() === 'across';
            const arrowSize = Math.max(12, cellSize * 0.35);
            ctx.fillStyle = theme.selectionBorder;
            ctx.beginPath();

            if (isAcross) {
                const arrowX = screenX + cellSize + 8;
                const arrowY = screenY + cellSize / 2;
                ctx.moveTo(arrowX, arrowY - arrowSize / 2);
                ctx.lineTo(arrowX + arrowSize, arrowY);
                ctx.lineTo(arrowX, arrowY + arrowSize / 2);
            } else {
                const arrowX = screenX + cellSize / 2;
                const arrowY = screenY + cellSize + 8;
                ctx.moveTo(arrowX - arrowSize / 2, arrowY);
                ctx.lineTo(arrowX, arrowY + arrowSize);
                ctx.lineTo(arrowX + arrowSize / 2, arrowY);
            }
            ctx.fill();
        }
    }

    // --- Canvas Click Handling ---

    onCanvasClick(e: MouseEvent) {
        if (this.isPanning) return;

        const gridPos = this.screenToGrid(e.clientX, e.clientY);

        if (this.grid.isBlackSquare(gridPos.x, gridPos.y)) {
            return;
        }

        this.selectCell(gridPos.x, gridPos.y);
    }

    onCanvasTouch(e: TouchEvent) {
        if (e.touches.length > 1) return;

        const touch = e.touches[0];
        const gridPos = this.screenToGrid(touch.clientX, touch.clientY);

        if (this.grid.isBlackSquare(gridPos.x, gridPos.y)) {
            return;
        }

        setTimeout(() => {
            if (!this.isPanning && !this.isPinching) {
                this.selectCell(gridPos.x, gridPos.y);
            }
        }, 100);
    }

    private screenToGrid(screenX: number, screenY: number): { x: number, y: number } {
        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoom;

        const centerX = window.innerWidth / 2 + offset.x;
        const centerY = window.innerHeight / 2 + offset.y;

        const gridX = Math.floor((screenX - centerX) / cellSize);
        const gridY = Math.floor((screenY - centerY) / cellSize);

        return { x: gridX, y: gridY };
    }

    // --- Zoom Controls ---

    private setZoom(newZoom: number, centerX: number, centerY: number) {
        const currentZoom = this.zoomLevel();
        const oldOffset = this.grid.viewportOffset();

        const clampedZoom = Math.min(Math.max(newZoom, this.MIN_ZOOM), this.MAX_ZOOM);

        if (clampedZoom === currentZoom) return;

        // Formula: nextOffset = relativeMouse - (relativeMouse - currentOffset) * (nextZoom / currentZoom)
        const width = window.innerWidth;
        const height = window.innerHeight;

        const relX = centerX - width / 2;
        const relY = centerY - height / 2;

        const ratio = clampedZoom / currentZoom;

        const newOffsetX = relX - (relX - oldOffset.x) * ratio;
        const newOffsetY = relY - (relY - oldOffset.y) * ratio;

        this.grid.viewportOffset.set({ x: newOffsetX, y: newOffsetY });
        this.zoomLevel.set(clampedZoom);
    }

    zoomIn() {
        this.setZoom(this.zoomLevel() * 1.2, window.innerWidth / 2, window.innerHeight / 2);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel() / 1.2, window.innerWidth / 2, window.innerHeight / 2);
    }

    onWheel(e: WheelEvent) {
        e.preventDefault();

        const zoomSpeed = 0.001;
        const delta = -e.deltaY;

        let factor = 1 + (delta * zoomSpeed);
        // Cap speed
        if (factor > 1.15) factor = 1.15;
        if (factor < 0.85) factor = 0.85;

        const targetZoom = this.zoomLevel() * factor;
        this.setZoom(targetZoom, e.clientX, e.clientY);
    }

    // --- Input & Interaction ---

    selectCell(x: number, y: number) {
        const current = this.grid.selectedCell();

        if (current && current.x === x && current.y === y) {
            this.grid.inputDirection.update(d => d === 'across' ? 'down' : 'across');
            return;
        }

        const isPartOfPending = this.pendingWordCoords().some(p => p.x === x && p.y === y);

        if (!isPartOfPending) {
            this.clearPending();
        }

        this.grid.selectedCell.set({ x, y });
        this.entryStart.set({ x, y });
        this.validationMessage.set('');
        this.focusInput();
    }

    focusInput() {
        this.hiddenInput?.nativeElement?.focus();
    }

    onInput(e: Event) {
        const input = e.target as HTMLInputElement;
        const rawVal = input.value;
        const char = rawVal.slice(-1).toUpperCase();
        input.value = '';

        if (!char.match(/[A-Z]/)) return;
        this.processCharInput(char);
    }

    onGlobalKeyDown(e: KeyboardEvent) {
        const sel = this.grid.selectedCell();
        if (!sel) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.grid.selectedCell.update(c => c ? { x: c.x - 1, y: c.y } : null);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.grid.selectedCell.update(c => c ? { x: c.x + 1, y: c.y } : null);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.grid.selectedCell.update(c => c ? { x: c.x, y: c.y - 1 } : null);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.grid.selectedCell.update(c => c ? { x: c.x, y: c.y + 1 } : null);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            this.submitWord();
            return;
        }
        if (e.key === ' ') {
            e.preventDefault();
            this.grid.inputDirection.update(d => d === 'across' ? 'down' : 'across');
            return;
        }
        if (e.key === 'Backspace') {
            this.handleBackspace();
            return;
        }
        if (e.key === 'Escape') {
            this.clearPending();
            return;
        }

        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            if (document.activeElement === this.hiddenInput?.nativeElement) {
                return;
            }
            e.preventDefault();
            this.processCharInput(e.key.toUpperCase());
        }
    }

    processCharInput(char: string) {
        const sel = this.grid.selectedCell();
        if (!sel) return;

        if (this.grid.isBlackSquare(sel.x, sel.y)) return;

        const existing = this.grid.getCell(sel.x, sel.y);

        if (existing && existing.confirmed) {
            if (existing.char === char) {
                this.moveCursor(1);
            } else {
                const prevX = sel.x;
                const prevY = sel.y;

                this.moveCursor(1);

                const newSel = this.grid.selectedCell();
                if (newSel && (newSel.x === prevX && newSel.y === prevY)) {
                    this.showError("Cannot change existing letters!");
                    return;
                }

                this.processCharInput(char);
            }
            return;
        }

        this.addPendingChar(sel.x, sel.y, char);
        this.moveCursor(1);
        this.focusInput();
    }

    handleBackspace() {
        const sel = this.grid.selectedCell();
        const start = this.entryStart();
        if (!sel || !start) return;

        const currentIsPending = this.pendingWordCoords().some(p => p.x === sel.x && p.y === sel.y);

        if (currentIsPending) {
            this.removePendingAt(sel.x, sel.y);
            return;
        }

        const isAcross = this.grid.inputDirection() === 'across';
        const dx = isAcross ? -1 : 0;
        const dy = isAcross ? 0 : -1;

        const prevX = sel.x + dx;
        const prevY = sel.y + dy;

        if (sel.x === start.x && sel.y === start.y) {
            return;
        }

        if (this.grid.isBlackSquare(prevX, prevY)) return;

        this.grid.selectedCell.set({ x: prevX, y: prevY });

        const prevIsPending = this.pendingWordCoords().some(p => p.x === prevX && p.y === prevY);

        if (prevIsPending) {
            this.removePendingAt(prevX, prevY);
        }
    }

    moveCursor(step: number) {
        const sel = this.grid.selectedCell();
        if (!sel) return;

        const dx = this.grid.inputDirection() === 'across' ? step : 0;
        const dy = this.grid.inputDirection() === 'down' ? step : 0;

        let nextX = sel.x + dx;
        let nextY = sel.y + dy;

        if (this.grid.isBlackSquare(nextX, nextY)) {
            return;
        }

        this.grid.selectedCell.set({ x: nextX, y: nextY });
    }

    addPendingChar(x: number, y: number, char: string) {
        this.pendingWordCoords.update(prev => {
            const filtered = prev.filter(p => !(p.x === x && p.y === y));
            return [...filtered, { x, y, char }];
        });
        this.validationMessage.set('');
    }

    removePendingAt(x: number, y: number) {
        this.pendingWordCoords.update(prev => prev.filter(p => !(p.x === x && p.y === y)));
    }

    // --- Validation & Submission ---

    async submitWord() {
        if (this.pendingWordCoords().length === 0) return;

        this.isValidating.set(true);
        this.validationMessage.set('');
        this.isError.set(false);

        const direction = this.grid.inputDirection();
        const isAcross = direction === 'across';

        const sorted = [...this.pendingWordCoords()].sort((a, b) => isAcross ? a.x - b.x : a.y - b.y);
        const startP = sorted[0];
        const endP = sorted[sorted.length - 1];

        let currX = startP.x;
        let currY = startP.y;
        while (!this.grid.isBlackSquare(isAcross ? currX - 1 : currX, isAcross ? currY : currY - 1)) {
            const checkX = isAcross ? currX - 1 : currX;
            const checkY = isAcross ? currY : currY - 1;
            const cell = this.grid.getCell(checkX, checkY);
            const pending = this.pendingWordCoords().find(p => p.x === checkX && p.y === checkY);
            if (cell || pending) {
                currX = checkX;
                currY = checkY;
            } else {
                break;
            }
        }
        const trueStartX = currX;
        const trueStartY = currY;

        currX = endP.x;
        currY = endP.y;
        while (!this.grid.isBlackSquare(isAcross ? currX + 1 : currX, isAcross ? currY : currY + 1)) {
            const checkX = isAcross ? currX + 1 : currX;
            const checkY = isAcross ? currY : currY + 1;
            const cell = this.grid.getCell(checkX, checkY);
            const pending = this.pendingWordCoords().find(p => p.x === checkX && p.y === checkY);
            if (cell || pending) {
                currX = checkX;
                currY = checkY;
            } else {
                break;
            }
        }
        const trueEndX = currX;
        const trueEndY = currY;

        let word = '';
        let intersectsExisting = false;
        let hasPending = false;

        const len = isAcross ? (trueEndX - trueStartX + 1) : (trueEndY - trueStartY + 1);

        for (let i = 0; i < len; i++) {
            const x = isAcross ? trueStartX + i : trueStartX;
            const y = isAcross ? trueStartY : trueStartY + i;

            const cell = this.grid.getCell(x, y);
            const pending = this.pendingWordCoords().find(p => p.x === x && p.y === y);

            if (cell && cell.confirmed) {
                word += cell.char;
                intersectsExisting = true;
            } else if (pending) {
                word += pending.char;
                hasPending = true;
            } else {
                this.showError("Word has gaps!");
                this.isValidating.set(false);
                return;
            }
        }

        if (!hasPending) {
            this.showError("No new letters added.");
            this.isValidating.set(false);
            return;
        }

        if (!intersectsExisting && this.grid.cells().size > 0) {
            this.showError("Must connect to existing words!");
            this.isValidating.set(false);
            return;
        }

        if (word.length < 2) {
            this.showError("Word too short.");
            this.isValidating.set(false);
            return;
        }

        // Check Cooldown
        const now = Date.now();
        const lastTime = this.grid.lastPlacedTime();
        const timeSince = now - lastTime;

        if (timeSince < this.COOLDOWN_MS) {
            const remaining = Math.ceil((this.COOLDOWN_MS - timeSince) / 1000);
            this.showError(`Wait ${remaining}s to place next word.`);
            this.isValidating.set(false);
            return;
        }

        const result = await this.dictionary.validateWord(word);

        if (result.valid) {
            for (let i = 0; i < len; i++) {
                const x = isAcross ? trueStartX + i : trueStartX;
                const y = isAcross ? trueStartY : trueStartY + i;
                const char = word[i];
                if (!this.grid.getCell(x, y)) {
                    this.grid.setCell(x, y, char, true);
                }
            }
            this.grid.lastPlacedTime.set(Date.now());
            this.grid.incrementWordsPlaced(); // Increment counter
            this.pendingWordCoords.set([]);
            this.validationMessage.set(`Placed: "${word}"\n${result.definition}`);
            this.isError.set(false);
        } else {
            this.showError(result.reason || `"${word}" not found.`);
        }

        this.isValidating.set(false);
    }

    clearPending() {
        this.pendingWordCoords.set([]);
        this.validationMessage.set('');
        this.hiddenInput?.nativeElement && (this.hiddenInput.nativeElement.value = '');
        const sel = this.grid.selectedCell();
        if (sel) this.entryStart.set(sel);
    }

    showError(msg: string) {
        this.validationMessage.set(msg);
        this.isError.set(true);
    }

    // --- Viewport Panning & Zoom ---

    startPan(e: MouseEvent) {
        if (e.button !== 0) return;
        this.isPanning = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startOffsetX = this.grid.viewportOffset().x;
        this.startOffsetY = this.grid.viewportOffset().y;
    }

    startPanTouch(e: TouchEvent) {
        if (e.touches.length === 2) {
            this.isPinching = true;
            this.isPanning = false;
            this.initialPinchDist = this.getDist(e.touches);
            this.startZoom = this.zoomLevel();
            return;
        }

        if (e.touches.length === 1) {
            this.isPanning = true;
            this.isPinching = false;
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.startOffsetX = this.grid.viewportOffset().x;
            this.startOffsetY = this.grid.viewportOffset().y;
        }
    }

    pan(e: MouseEvent) {
        if (!this.isPanning) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.grid.viewportOffset.set({
            x: this.startOffsetX + dx,
            y: this.startOffsetY + dy
        });
    }

    panTouch(e: TouchEvent) {
        if (this.isPinching && e.touches.length === 2) {
            const dist = this.getDist(e.touches);
            const scale = dist / this.initialPinchDist;

            // Calculate center of pinch
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            // Target zoom based on start zoom of this gesture
            const targetZoom = this.startZoom * scale;

            // We use setZoom to handle offset updates correctly to zoom INTO the pinch center
            this.setZoom(targetZoom, cx, cy);

            e.preventDefault();
            return;
        }

        if (this.isPanning && e.touches.length === 1) {
            const dx = e.touches[0].clientX - this.startX;
            const dy = e.touches[0].clientY - this.startY;
            this.grid.viewportOffset.set({
                x: this.startOffsetX + dx,
                y: this.startOffsetY + dy
            });
            if (e.cancelable) e.preventDefault();
        }
    }

    endPan() {
        this.isPanning = false;
        this.isPinching = false;
    }

    getDist(touches: TouchList) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    resetView() {
        this.grid.viewportOffset.set({ x: 0, y: 0 });
        this.zoomLevel.set(1.0);
    }

    sharePosition() {
        const center = this.screenToGrid(window.innerWidth / 2, window.innerHeight / 2);
        const url = new URL(window.location.href);
        url.searchParams.set('x', center.x.toString());
        url.searchParams.set('y', center.y.toString());

        navigator.clipboard.writeText(url.toString()).then(() => {
            this.validationMessage.set('Link copied to clipboard!');
            this.isError.set(false);
            setTimeout(() => {
                if (this.validationMessage() === 'Link copied to clipboard!') {
                    this.validationMessage.set('');
                }
            }, 3000);
        });
    }

    isCellSelected(x: number, y: number): boolean {
        const s = this.grid.selectedCell();
        return !!s && s.x === x && s.y === y;
    }

    private drawCell(
        ctx: CanvasRenderingContext2D,
        cell: Cell,
        centerX: number,
        centerY: number,
        cellSize: number,
        theme: any,
        showText: boolean,
        selectedCell: { x: number, y: number } | null
    ) {
        const screenX = centerX + cell.x * cellSize;
        const screenY = centerY + cell.y * cellSize;
        const width = ctx.canvas.width / window.devicePixelRatio; // Approximate width checks if needed, but we already filtered in loop
        const height = ctx.canvas.height / window.devicePixelRatio;

        // Double check bounds if useful, though loops handle it mostly.
        if (screenX + cellSize < 0 || screenX > width || screenY + cellSize < 0 || screenY > height) {
            return;
        }

        if (showText) {
            const isSelected = selectedCell && selectedCell.x === cell.x && selectedCell.y === cell.y;
            const isStartWord = cell.y === 0 && Math.abs(cell.x) <= 5 && cell.x !== 0;

            if (isSelected) {
                ctx.fillStyle = theme.selectionBg;
            } else if (isStartWord) {
                ctx.fillStyle = theme.startWordBg;
            } else {
                ctx.fillStyle = theme.confirmedBg;
            }

            ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

            if (isStartWord && !isSelected) {
                ctx.strokeStyle = theme.startWordBorder;
            } else {
                ctx.strokeStyle = theme.confirmedBorder;
            }

            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = theme.confirmedText;
            ctx.fillText(cell.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
        } else {
            ctx.fillStyle = theme.confirmedBorder; // Placeholder color when zoomed out
            ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
        }
    }
}