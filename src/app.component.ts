import { Component, ElementRef, ViewChild, signal, effect, AfterViewInit, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridStoreService, Cell } from './services/grid-store.service';
import { DictionaryService } from './services/dict.service';
import { CanvasRendererService } from './app/services/canvas-renderer.service';
import { InputManagerService } from './app/services/input-manager.service';
import { Theme, THEMES } from './app/models/theme.model';
import { Font, FONTS } from './app/models/font.model';
import { TopBarComponent } from './app/components/top-bar/top-bar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, TopBarComponent],
    templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnInit {
    @ViewChild('hiddenInput') hiddenInput!: ElementRef<HTMLInputElement>;
    @ViewChild('gridCanvas') gridCanvas!: ElementRef<HTMLCanvasElement>;

    // Services
    private renderer = inject(CanvasRendererService);
    private inputManager = inject(InputManagerService);

    // Core State
    activeTheme = signal<Theme>(THEMES[0]);
    themes = THEMES;
    activeFont = signal<Font>(FONTS[0]);
    fonts = FONTS;

    // Game Logic State
    pendingWordCoords = signal<{ x: number, y: number, char: string }[]>([]);
    isValidating = signal(false);
    validationMessage = signal('');
    isError = signal(false);
    entryStart = signal<{ x: number, y: number } | null>(null);

    readonly COOLDOWN_MS = 5000;

    constructor(public grid: GridStoreService, private dictionary: DictionaryService) {
        // 1. Setup Render Loop Binding
        effect(() => {
            // Dependencies for rendering
            this.inputManager.zoomLevel();
            this.grid.viewportOffset();
            this.grid.cells();
            this.grid.selectedCell();
            this.grid.inputDirection();
            this.pendingWordCoords();
            this.activeTheme();
            this.activeFont();

            this.renderer.requestRender();
        });

        // 2. Load Preferences
        this.loadPreferences();

        // 3. Persist Preferences
        effect(() => {
            const theme = this.activeTheme();
            document.body.style.backgroundColor = theme.colors.bg;
            this.grid.setCookie('cross_plane_theme', theme.id, 365);
        });
        effect(() => {
            const font = this.activeFont();
            this.grid.setCookie('cross_plane_font', font.id, 365);
        });
    }

    ngOnInit() {
        this.handleUrlParams();
    }

    ngAfterViewInit() {
        this.renderer.setCanvas(this.gridCanvas.nativeElement);
        this.renderer.startRenderLoop(() => ({
            zoomLevel: this.inputManager.zoomLevel(),
            theme: this.activeTheme(),
            font: this.activeFont(),
            showText: this.inputManager.zoomLevel() > 0.35,
            pendingWords: this.pendingWordCoords()
        }));
        window.addEventListener('resize', () => this.renderer.resizeCanvas());
    }

    // --- Input Delegation ---

    startPan(e: MouseEvent) { this.inputManager.startPan(e); }
    startPanTouch(e: TouchEvent) { this.inputManager.startPanTouch(e); }
    pan(e: MouseEvent) { this.inputManager.handlePan(e); }
    panTouch(e: TouchEvent) { this.inputManager.handlePanTouch(e); }
    endPan() { this.inputManager.endPan(); }
    onWheel(e: WheelEvent) { this.inputManager.handleWheel(e); }

    zoomIn() { this.inputManager.zoomIn(window.innerWidth, window.innerHeight); }
    zoomOut() { this.inputManager.zoomOut(window.innerWidth, window.innerHeight); }
    resetView() {
        this.grid.viewportOffset.set({ x: 0, y: 0 });
        this.inputManager.zoomLevel.set(1.0);
    }

    onCanvasClick(e: MouseEvent) {
        if (this.inputManager.isPanning) return;
        const gridPos = this.inputManager.screenToGrid(e.clientX, e.clientY, this.renderer.CELL_SIZE);

        if (this.grid.isBlackSquare(gridPos.x, gridPos.y)) return;
        this.selectCell(gridPos.x, gridPos.y);
    }

    onCanvasTouch(e: TouchEvent) {
        if (e.touches.length > 1) return;
        const touch = e.touches[0];
        const gridPos = this.inputManager.screenToGrid(touch.clientX, touch.clientY, this.renderer.CELL_SIZE);

        if (this.grid.isBlackSquare(gridPos.x, gridPos.y)) return;

        setTimeout(() => {
            if (!this.inputManager.isPanning && !this.inputManager.isPinching) {
                this.selectCell(gridPos.x, gridPos.y);
            }
        }, 100);
    }

    onGlobalKeyDown(e: KeyboardEvent) {
        const sel = this.grid.selectedCell();
        if (!sel) return;

        // Movement
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.grid.selectedCell.update(c => c ? { x: c.x - 1, y: c.y } : null); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.grid.selectedCell.update(c => c ? { x: c.x + 1, y: c.y } : null); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); this.grid.selectedCell.update(c => c ? { x: c.x, y: c.y - 1 } : null); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); this.grid.selectedCell.update(c => c ? { x: c.x, y: c.y + 1 } : null); return; }

        // Actions
        if (e.key === 'Enter') { e.preventDefault(); this.submitWord(); return; }
        if (e.key === ' ') { e.preventDefault(); this.grid.inputDirection.update(d => d === 'across' ? 'down' : 'across'); return; }
        if (e.key === 'Backspace') { this.handleBackspace(); return; }
        if (e.key === 'Escape') { this.clearPending(); return; }

        // Character Input
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            if (document.activeElement === this.hiddenInput?.nativeElement) return;
            e.preventDefault();
            this.processCharInput(e.key.toUpperCase());
        }
    }

    // --- Game Logic (Selection, Input, Validation) ---

    selectCell(x: number, y: number) {
        const current = this.grid.selectedCell();
        if (current && current.x === x && current.y === y) {
            this.grid.inputDirection.update(d => d === 'across' ? 'down' : 'across');
            return;
        }

        const isPartOfPending = this.pendingWordCoords().some(p => p.x === x && p.y === y);
        if (!isPartOfPending) this.clearPending();

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
        const char = input.value.slice(-1).toUpperCase();
        input.value = '';
        if (char.match(/[A-Z]/)) this.processCharInput(char);
    }

    processCharInput(char: string) {
        const sel = this.grid.selectedCell();
        if (!sel || this.grid.isBlackSquare(sel.x, sel.y)) return;

        const existing = this.grid.getCell(sel.x, sel.y);
        if (existing && existing.confirmed) {
            if (existing.char === char) {
                this.moveCursor(1);
            } else {
                this.showError("Cannot change existing letters!");
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

        if (sel.x === start.x && sel.y === start.y) return;

        const isAcross = this.grid.inputDirection() === 'across';
        const dx = isAcross ? -1 : 0;
        const dy = isAcross ? 0 : -1;
        const prevX = sel.x + dx;
        const prevY = sel.y + dy;

        if (this.grid.isBlackSquare(prevX, prevY)) return;

        this.grid.selectedCell.set({ x: prevX, y: prevY });

        // If we backspaced into a pending char, remove it too
        if (this.pendingWordCoords().some(p => p.x === prevX && p.y === prevY)) {
            this.removePendingAt(prevX, prevY);
        }
    }

    moveCursor(step: number) {
        const sel = this.grid.selectedCell();
        if (!sel) return;
        const dx = this.grid.inputDirection() === 'across' ? step : 0;
        const dy = this.grid.inputDirection() === 'down' ? step : 0;
        const nextX = sel.x + dx;
        const nextY = sel.y + dy;

        if (!this.grid.isBlackSquare(nextX, nextY)) {
            this.grid.selectedCell.set({ x: nextX, y: nextY });
        }
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

    async submitWord() {
        if (this.pendingWordCoords().length === 0) return;

        // Check cooldown
        const now = Date.now();
        const timeSince = now - this.grid.lastPlacedTime();
        if (timeSince < this.COOLDOWN_MS) {
            const remaining = Math.ceil((this.COOLDOWN_MS - timeSince) / 1000);
            this.showError(`Wait ${remaining}s to place next word.`);
            return;
        }

        this.isValidating.set(true);
        this.validationMessage.set('');
        this.isError.set(false);

        // Reconstruct word string and bounds
        // (Logic simplified for brevity, assuming standard "find contiguous word" logic)
        // For this refactor, I will copy the core logic but ensure it uses the service state

        const direction = this.grid.inputDirection();
        const isAcross = direction === 'across';
        const sorted = [...this.pendingWordCoords()].sort((a, b) => isAcross ? a.x - b.x : a.y - b.y);
        const startP = sorted[0];
        const endP = sorted[sorted.length - 1];

        // Scan backwards to find true start
        let currX = startP.x, currY = startP.y;
        while (!this.grid.isBlackSquare(isAcross ? currX - 1 : currX, isAcross ? currY : currY - 1)) {
            const cx = isAcross ? currX - 1 : currX;
            const cy = isAcross ? currY : currY - 1;
            if (this.grid.getCell(cx, cy) || this.pendingWordCoords().find(p => p.x === cx && p.y === cy)) {
                currX = cx; currY = cy;
            } else break;
        }
        const trueStartX = currX, trueStartY = currY;

        // Scan forwards
        currX = endP.x; currY = endP.y;
        while (!this.grid.isBlackSquare(isAcross ? currX + 1 : currX, isAcross ? currY : currY + 1)) {
            const cx = isAcross ? currX + 1 : currX;
            const cy = isAcross ? currY : currY + 1;
            if (this.grid.getCell(cx, cy) || this.pendingWordCoords().find(p => p.x === cx && p.y === cy)) {
                currX = cx; currY = cy;
            } else break;
        }
        // const trueEndX = currX, trueEndY = currY; // Unused variable warning fix

        const len = isAcross ? (currX - trueStartX + 1) : (currY - trueStartY + 1);
        let word = '';
        let intersectsExisting = false;

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
            } else {
                this.showError("Word has gaps!");
                this.isValidating.set(false);
                return;
            }
        }

        // Must intersect
        if (!intersectsExisting && this.grid.cells().size > 0) {
            // Special case: First word (size > 0 check might fail if cleared, but usually "START" exists)
            // If grid is empty (only possible if hacked or cleared), allow. 
            // But for normal play:
            this.showError("Must connect to existing words!");
            this.isValidating.set(false);
            return;
        }

        const result = await this.dictionary.validateWord(word);

        if (result.valid) {
            for (let i = 0; i < len; i++) {
                const x = isAcross ? trueStartX + i : trueStartX;
                const y = isAcross ? trueStartY : trueStartY + i;
                if (!this.grid.getCell(x, y)) {
                    this.grid.setCell(x, y, word[i], true);
                }
            }
            this.grid.lastPlacedTime.set(Date.now());
            this.grid.incrementWordsPlaced();
            this.clearPending();
            this.validationMessage.set(`Placed: "${word}"\n${result.definition}`);
        } else {
            this.showError(result.reason || `"${word}" not found.`);
        }
        this.isValidating.set(false);
    }

    clearPending() {
        this.pendingWordCoords.set([]);
        this.validationMessage.set('');
        if (this.hiddenInput?.nativeElement) this.hiddenInput.nativeElement.value = '';
        const sel = this.grid.selectedCell();
        if (sel) this.entryStart.set(sel);
    }

    showError(msg: string) {
        this.validationMessage.set(msg);
        this.isError.set(true);
    }

    sharePosition() {
        const center = this.inputManager.screenToGrid(window.innerWidth / 2, window.innerHeight / 2, this.renderer.CELL_SIZE);
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

    private loadPreferences() {
        const savedThemeId = this.grid.getCookie('cross_plane_theme');
        if (savedThemeId) {
            const savedTheme = this.themes.find(t => t.id === savedThemeId);
            if (savedTheme) this.activeTheme.set(savedTheme);
        }
        const savedFontId = this.grid.getCookie('cross_plane_font');
        if (savedFontId) {
            const savedFont = this.fonts.find(f => f.id === savedFontId);
            if (savedFont) this.activeFont.set(savedFont);
        }
    }

    private handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const xParam = params.get('x');
        const yParam = params.get('y');
        if (xParam && yParam) {
            const x = parseInt(xParam, 10);
            const y = parseInt(yParam, 10);
            if (!isNaN(x) && !isNaN(y)) {
                // Zoom must be known to calc offset. Assuming default 1.0 or read signal if persistent.
                // ScreenCenter = Center + Offset + Grid * Cell
                // 0 = Offset + Grid * Cell
                const cellSize = this.renderer.CELL_SIZE * this.inputManager.zoomLevel();
                this.grid.viewportOffset.set({ x: -x * cellSize, y: -y * cellSize });
            }
        }
    }
}