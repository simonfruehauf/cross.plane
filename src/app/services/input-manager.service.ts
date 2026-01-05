import { Injectable, signal, computed } from '@angular/core';
import { GridStoreService } from '../../services/grid-store.service';

@Injectable({
    providedIn: 'root'
})
export class InputManagerService {
    // Panning State
    isPanning = false;
    startX = 0;
    startY = 0;
    startOffsetX = 0;
    startOffsetY = 0;

    // Zoom State
    readonly zoomLevel = signal(1.0);
    readonly MIN_ZOOM = 0.03;
    readonly MAX_ZOOM = 2.0;

    // Pinch Zoom State
    isPinching = false;
    initialPinchDist = 0;
    startZoom = 1;

    constructor(private grid: GridStoreService) { }

    // --- Zoom Logic ---

    public setZoom(newZoom: number, centerX: number, centerY: number, viewportWidth: number, viewportHeight: number) {
        const currentZoom = this.zoomLevel();
        const oldOffset = this.grid.viewportOffset();
        const clampedZoom = Math.min(Math.max(newZoom, this.MIN_ZOOM), this.MAX_ZOOM);

        if (clampedZoom === currentZoom) return;

        const relX = centerX - viewportWidth / 2;
        const relY = centerY - viewportHeight / 2;
        const ratio = clampedZoom / currentZoom;

        const newOffsetX = relX - (relX - oldOffset.x) * ratio;
        const newOffsetY = relY - (relY - oldOffset.y) * ratio;

        this.grid.viewportOffset.set({ x: newOffsetX, y: newOffsetY });
        this.zoomLevel.set(clampedZoom);
    }

    public zoomIn(viewportWidth: number, viewportHeight: number) {
        this.setZoom(this.zoomLevel() * 1.2, viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight);
    }

    public zoomOut(viewportWidth: number, viewportHeight: number) {
        this.setZoom(this.zoomLevel() / 1.2, viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight);
    }

    public handleWheel(e: WheelEvent) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const delta = -e.deltaY;

        let factor = 1 + (delta * zoomSpeed);
        if (factor > 1.15) factor = 1.15;
        if (factor < 0.85) factor = 0.85;

        const targetZoom = this.zoomLevel() * factor;
        this.setZoom(targetZoom, e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    }

    // --- Panning Logic ---

    public startPan(e: MouseEvent) {
        if (e.button !== 0) return;
        this.isPanning = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startOffsetX = this.grid.viewportOffset().x;
        this.startOffsetY = this.grid.viewportOffset().y;
    }

    public startPanTouch(e: TouchEvent) {
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

    public handlePan(e: MouseEvent) {
        if (!this.isPanning) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.grid.viewportOffset.set({
            x: this.startOffsetX + dx,
            y: this.startOffsetY + dy
        });
    }

    public handlePanTouch(e: TouchEvent) {
        if (this.isPinching && e.touches.length === 2) {
            const dist = this.getDist(e.touches);
            const scale = dist / this.initialPinchDist;

            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            const targetZoom = this.startZoom * scale;
            this.setZoom(targetZoom, cx, cy, window.innerWidth, window.innerHeight);

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

    public endPan() {
        this.isPanning = false;
        this.isPinching = false;
    }

    private getDist(touches: TouchList) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // --- Utility ---

    public screenToGrid(screenX: number, screenY: number, cellSize: number): { x: number, y: number } {
        const zoom = this.zoomLevel();
        const offset = this.grid.viewportOffset();
        const effectiveCellSize = cellSize * zoom;

        const centerX = window.innerWidth / 2 + offset.x;
        const centerY = window.innerHeight / 2 + offset.y;

        const gridX = Math.floor((screenX - centerX) / effectiveCellSize);
        const gridY = Math.floor((screenY - centerY) / effectiveCellSize);

        return { x: gridX, y: gridY };
    }
}
