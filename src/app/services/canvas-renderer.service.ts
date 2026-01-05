import { Injectable, ElementRef, NgZone, inject } from '@angular/core';
import { GridStoreService, Cell } from '../../services/grid-store.service';
import { Theme } from '../models/theme.model';
import { Font } from '../models/font.model';

@Injectable({
    providedIn: 'root'
})
export class CanvasRendererService {
    private ctx!: CanvasRenderingContext2D;
    private ngZone = inject(NgZone);
    private animationFrameId: number | null = null;
    private needsRender = true;
    private canvasElement!: HTMLCanvasElement;

    // Constants (could be passed in, but hardcoded for now to match AppComponent)
    readonly CELL_SIZE = 40;

    constructor(private grid: GridStoreService) { }

    public setCanvas(canvas: HTMLCanvasElement) {
        this.canvasElement = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.resizeCanvas();
    }

    public resizeCanvas() {
        if (!this.canvasElement) return;

        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvasElement.width = width * dpr;
        this.canvasElement.height = height * dpr;
        this.canvasElement.style.width = width + 'px';
        this.canvasElement.style.height = height + 'px';

        this.ctx.scale(dpr, dpr);
        this.requestRender();
    }

    public requestRender() {
        this.needsRender = true;
    }

    public startRenderLoop(
        getState: () => {
            zoomLevel: number;
            theme: Theme;
            font: Font;
            showText: boolean;
            pendingWords: { x: number, y: number, char: string }[];
        }
    ) {
        this.ngZone.runOutsideAngular(() => {
            const render = () => {
                if (this.needsRender) {
                    this.renderCanvas(getState());
                    this.needsRender = false;
                }
                this.animationFrameId = requestAnimationFrame(render);
            };
            render();
        });
    }

    public stopRenderLoop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    private renderCanvas(state: {
        zoomLevel: number;
        theme: Theme;
        font: Font;
        showText: boolean;
        pendingWords: { x: number, y: number, char: string }[];
    }) {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const { zoomLevel, theme, font, showText, pendingWords } = state;
        const colors = theme.colors;

        // Clear and background
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        const offset = this.grid.viewportOffset();
        const cellSize = this.CELL_SIZE * zoomLevel;
        const centerX = width / 2 + offset.x;
        const centerY = height / 2 + offset.y;

        // Grid bounds
        const startGridX = Math.floor(-centerX / cellSize) - 1;
        const endGridX = Math.ceil((width - centerX) / cellSize) + 1;
        const startGridY = Math.floor(-centerY / cellSize) - 1;
        const endGridY = Math.ceil((height - centerY) / cellSize) + 1;

        // Draw Grid Lines
        ctx.strokeStyle = colors.gridLines;
        ctx.lineWidth = 1; // Could scale with zoom if desired

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

        // Draw Black Squares
        ctx.fillStyle = colors.blackSquare;
        for (let x = startGridX; x <= endGridX; x++) {
            for (let y = startGridY; y <= endGridY; y++) {
                if (this.grid.isBlackSquare(x, y)) {
                    const screenX = centerX + x * cellSize;
                    const screenY = centerY + y * cellSize;
                    ctx.fillRect(screenX + 0.5, screenY + 0.5, cellSize - 1, cellSize - 1);
                }
            }
        }

        // Draw Cells
        const selectedCell = this.grid.selectedCell();
        const fontSize = Math.max(8, Math.floor(cellSize * 0.55));

        ctx.font = `bold ${fontSize}px ${font.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Optimization: Viewport Scan for rendering confirmed cells
        const viewportArea = (endGridX - startGridX) * (endGridY - startGridY);
        const totalCells = this.grid.cells().size;
        const useViewportScan = viewportArea < (totalCells * 2);

        if (useViewportScan) {
            for (let x = startGridX; x <= endGridX; x++) {
                for (let y = startGridY; y <= endGridY; y++) {
                    const cell = this.grid.getCell(x, y);
                    if (cell) {
                        this.drawCell(ctx, cell, centerX, centerY, cellSize, colors, showText, selectedCell);
                    }
                }
            }
        } else {
            this.grid.cells().forEach(cell => {
                if (cell.x < startGridX || cell.x > endGridX || cell.y < startGridY || cell.y > endGridY) return;
                this.drawCell(ctx, cell, centerX, centerY, cellSize, colors, showText, selectedCell);
            });
        }

        // Draw Pending Cells
        pendingWords.forEach(p => {
            const screenX = centerX + p.x * cellSize;
            const screenY = centerY + p.y * cellSize;

            if (screenX + cellSize < 0 || screenX > width || screenY + cellSize < 0 || screenY > height) return;

            if (showText) {
                const isSelected = selectedCell && selectedCell.x === p.x && selectedCell.y === p.y;
                ctx.fillStyle = isSelected ? colors.selectionBg : colors.confirmedBg;
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.strokeStyle = colors.pendingBorder;
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

                ctx.fillStyle = colors.pendingText;
                ctx.fillText(p.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
            } else {
                ctx.fillStyle = colors.pendingBg;
                ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
            }
        });

        // Draw Selection Cursor
        if (selectedCell && showText) {
            const screenX = centerX + selectedCell.x * cellSize - 1;
            const screenY = centerY + selectedCell.y * cellSize - 1;

            ctx.strokeStyle = colors.selectionBorder;
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);

            // Shadow
            ctx.shadowColor = colors.selectionShadow;
            ctx.shadowBlur = 10;
            ctx.strokeRect(screenX, screenY, cellSize + 2, cellSize + 2);
            ctx.shadowBlur = 0;

            // Direction Arrow
            const isAcross = this.grid.inputDirection() === 'across';
            const arrowSize = Math.max(12, cellSize * 0.35);
            ctx.fillStyle = colors.selectionBorder;
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

    private drawCell(
        ctx: CanvasRenderingContext2D,
        cell: Cell,
        centerX: number,
        centerY: number,
        cellSize: number,
        colors: any,
        showText: boolean,
        selectedCell: { x: number, y: number } | null
    ) {
        const screenX = centerX + cell.x * cellSize;
        const screenY = centerY + cell.y * cellSize;

        if (showText) {
            const isSelected = selectedCell && selectedCell.x === cell.x && selectedCell.y === cell.y;
            const isStartWord = cell.y === 0 && Math.abs(cell.x) <= 5 && cell.x !== 0;

            if (isSelected) {
                ctx.fillStyle = colors.selectionBg;
            } else if (isStartWord) {
                ctx.fillStyle = colors.startWordBg;
            } else {
                ctx.fillStyle = colors.confirmedBg;
            }

            ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

            if (isStartWord && !isSelected) {
                ctx.strokeStyle = colors.startWordBorder;
            } else {
                ctx.strokeStyle = colors.confirmedBorder;
            }

            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = colors.confirmedText;
            ctx.fillText(cell.char, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
        } else {
            ctx.fillStyle = colors.zoomedOutCell;
            // Fill full cell to ensure visibility at low zoom levels
            // Using a slight overlap or exact boundary ensures adjacent cells merge visually
            ctx.fillRect(screenX, screenY, cellSize, cellSize);
        }
    }
}
