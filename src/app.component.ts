import { Component, ElementRef, ViewChild, computed, signal, effect, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridStoreService, Cell } from './services/grid-store.service';
import { DictionaryService } from './services/dict.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit {
    @ViewChild('hiddenInput') hiddenInput!: ElementRef<HTMLInputElement>;
    @ViewChild('gridCanvas') gridCanvas!: ElementRef<HTMLCanvasElement>;

    private ctx!: CanvasRenderingContext2D;
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
    readonly MIN_ZOOM = 0.05;  // Allow much further zoom out with canvas
    readonly MAX_ZOOM = 2.0;

    // Pinch Zoom State
    isPinching = false;
    initialPinchDist = 0;
    startZoom = 1;

    // Grid constants
    readonly CELL_SIZE = 40;

    // Logic State
    pendingWordCoords = signal<{ x: number, y: number, char: string }[]>([]);
    isValidating = signal(false);
    validationMessage = signal('');
    isError = signal(false);

    // Track where the current input session started to restrict deletion
    entryStart = signal<{ x: number, y: number } | null>(null);

    // Computed signals for rendering
    offsetX = computed(() => this.grid.viewportOffset().x);
    offsetY = computed(() => this.grid.viewportOffset().y);

    // LOD: Only show text when zoomed in enough
    showText = computed(() => this.zoomLevel() > 0.35);

    constructor(public grid: GridStoreService, private dictionary: DictionaryService) {
        // Set up effect to trigger re-render when state changes
        effect(() => {
            // Touch these signals to track them
            this.zoomLevel();
            this.grid.viewportOffset();
            this.grid.cells();
            this.grid.selectedCell();
            this.grid.inputDirection();
            this.pendingWordCoords();

            this.requestRender();
        });
    }

    ngAfterViewInit() {
        this.setupCanvas();
        this.startRenderLoop();

        // Handle window resize
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
        const render = () => {
            if (this.needsRender) {
                this.renderCanvas();
                this.needsRender = false;
            }
            this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    }

    private renderCanvas() {
        const ctx = this.ctx;
        const canvas = this.gridCanvas.nativeElement;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoom;

        // Calculate visible grid range
        const centerX = width / 2 + offset.x;
        const centerY = height / 2 + offset.y;

        const startGridX = Math.floor(-centerX / cellSize) - 1;
        const endGridX = Math.ceil((width - centerX) / cellSize) + 1;
        const startGridY = Math.floor(-centerY / cellSize) - 1;
        const endGridY = Math.ceil((height - centerY) / cellSize) + 1;

        // Draw background grid pattern
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
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
        ctx.fillStyle = '#000000';
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

        ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw confirmed cells
        this.grid.cells().forEach(cell => {
            const screenX = centerX + cell.x * cellSize;
            const screenY = centerY + cell.y * cellSize;

            // Check if in view
            if (screenX + cellSize < 0 || screenX > width || screenY + cellSize < 0 || screenY > height) {
                return;
            }

            // Cell background
            if (showText) {
                const isSelected = selectedCell && selectedCell.x === cell.x && selectedCell.y === cell.y;
                ctx.fillStyle = isSelected ? '#dbeafe' : '#ffffff';
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                // Cell border
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                // Letter
                ctx.fillStyle = '#000000';
                ctx.fillText(cell.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
            } else {
                // Zoomed out: show as solid colored block
                ctx.fillStyle = '#9ca3af';
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
            }
        });

        // Draw pending cells
        this.pendingWordCoords().forEach(p => {
            const screenX = centerX + p.x * cellSize;
            const screenY = centerY + p.y * cellSize;

            if (screenX + cellSize < 0 || screenX > width || screenY + cellSize < 0 || screenY > height) {
                return;
            }

            if (showText) {
                const isSelected = selectedCell && selectedCell.x === p.x && selectedCell.y === p.y;
                ctx.fillStyle = isSelected ? '#dbeafe' : '#ffffff';
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.fillStyle = '#2563eb'; // Blue for pending
                ctx.fillText(p.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
            } else {
                ctx.fillStyle = '#93c5fd';
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
            }
        });

        // Draw selection cursor
        if (selectedCell && showText) {
            const screenX = centerX + selectedCell.x * cellSize - 1;
            const screenY = centerY + selectedCell.y * cellSize - 1;

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);

            // Glow effect
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
            ctx.shadowBlur = 10;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);
            ctx.shadowBlur = 0;

            // Draw direction arrow
            const isAcross = this.grid.inputDirection() === 'across';
            const arrowSize = Math.max(12, cellSize * 0.35);
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();

            if (isAcross) {
                // Arrow pointing right
                const arrowX = screenX + cellSize + 8;
                const arrowY = screenY + cellSize / 2;
                ctx.moveTo(arrowX, arrowY - arrowSize / 2);
                ctx.lineTo(arrowX + arrowSize, arrowY);
                ctx.lineTo(arrowX, arrowY + arrowSize / 2);
            } else {
                // Arrow pointing down
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

        // Don't select black squares
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

        // Delay to distinguish from pan
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

    // --- Cursor screen position for DOM overlay ---

    getCursorScreenX(): number {
        const sel = this.grid.selectedCell();
        if (!sel) return 0;

        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoom;
        const centerX = window.innerWidth / 2 + offset.x;

        return centerX + sel.x * cellSize - 1;
    }

    getCursorScreenY(): number {
        const sel = this.grid.selectedCell();
        if (!sel) return 0;

        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoom;
        const centerY = window.innerHeight / 2 + offset.y;

        return centerY + sel.y * cellSize - 1;
    }

    // --- Zoom Controls ---
    zoomIn() {
        this.zoomLevel.update(z => Math.min(z * 1.2, this.MAX_ZOOM));
    }

    zoomOut() {
        this.zoomLevel.update(z => Math.max(z / 1.2, this.MIN_ZOOM));
    }

    onWheel(e: WheelEvent) {
        e.preventDefault();

        const zoomSpeed = 0.001;
        const delta = -e.deltaY;

        let factor = 1 + (delta * zoomSpeed);
        if (factor > 1.15) factor = 1.15;
        if (factor < 0.85) factor = 0.85;

        this.zoomLevel.update(z => Math.min(Math.max(z * factor, this.MIN_ZOOM), this.MAX_ZOOM));
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

        const result = await this.dictionary.validateWord(word);

        if (result.valid) {
            for (let i = 0; i < len; i++) {
                const x = isAcross ? trueStartX + i : trueStartX;
                const y = isAcross ? trueStartY : trueStartY + i;
                const char = word[i];
                if (!this.grid.getCell(x, y)) {
                    this.grid.setCell(x, y, char, true, result.definition);
                }
            }
            this.pendingWordCoords.set([]);
            this.validationMessage.set(`Placed: ${word}`);
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
            const newZoom = Math.min(Math.max(this.startZoom * scale, this.MIN_ZOOM), this.MAX_ZOOM);
            this.zoomLevel.set(newZoom);
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

    // Helpers
    isCellSelected(x: number, y: number): boolean {
        const s = this.grid.selectedCell();
        return !!s && s.x === x && s.y === y;
    }
}