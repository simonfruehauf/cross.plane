import { Component, EventEmitter, Input, Output, signal, ElementRef, ViewChild, NgZone, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme } from '../../../app.component';

@Component({
    selector: 'app-top-bar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Info & Status (Top Left) -->
    <div class="absolute top-0 left-0 right-0 p-4 pointer-events-none z-50 flex justify-center md:justify-start">
      <div class="bg-white/95 backdrop-blur shadow-lg border border-gray-200 px-4 py-3 rounded-xl pointer-events-auto max-w-sm w-full md:w-auto text-center md:text-left">
        <div class="flex items-center gap-3 mb-1">
          <!-- Cooldown Indicator -->
          <div class="relative w-6 h-6 flex-shrink-0">
            <svg class="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
              <path class="text-gray-200"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke="currentColor" stroke-width="4" />
              <!-- High-Performance Direct DOM Manipulation path -->
              <path #progressPath class="text-blue-500 transition-[stroke-dasharray] duration-100 ease-linear"
                stroke-dasharray="100, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                stroke="currentColor" stroke-width="4" />
            </svg>
            <div *ngIf="cooldownProgress >= 1" class="absolute inset-0 flex items-center justify-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          <h1 class="text-xl font-black tracking-tighter">Cross.plane</h1>
        </div>
        <p class="hidden md:block text-xs text-gray-500 mb-2 leading-relaxed">
          Infinite, procedural, collaborative crossword. <br />
          Click to select. Space to rotate. Type to type.
        </p>
  
        <!-- Stats -->
        <div class="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Words this session: <span class="text-black text-sm">{{ wordsPlacedCount }}</span>
          </div>
        </div>
  
        <!-- Status Box -->
        <div class="min-h-[24px] flex flex-col justify-center items-center md:items-start">
          <div *ngIf="isValidating" class="flex items-center space-x-2 text-blue-600 animate-pulse">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            <span class="text-sm font-semibold">Validating...</span>
          </div>
          <div *ngIf="!isValidating && validationMessage" 
               class="text-sm font-medium whitespace-pre-wrap" 
               [class.text-red-500]="isError"
               [class.text-green-600]="!isError">
            {{ validationMessage }}
          </div>
        </div>
      </div>
    </div>
  
    <!-- Controls (Top Right) -->
    <div class="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-auto">
      <button (click)="resetView.emit()"
        class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700"
        title="Center View">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
          </path>
        </svg>
      </button>
      <button (click)="sharePosition.emit()"
        class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700"
        title="Share Position">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z">
          </path>
        </svg>
      </button>
  
      <!-- Theme Toggle -->
      <div class="relative">
        <button (click)="toggleThemeMenu()"
          class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700"
          title="Themes">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01">
            </path>
          </svg>
        </button>
  
        <div *ngIf="isThemeMenuOpen"
          class="absolute right-full top-0 mr-2 bg-white/95 backdrop-blur shadow-lg border border-gray-200 p-2 rounded-xl flex gap-2 animate-in fade-in slide-in-from-right-2">
          <button *ngFor="let t of themes" (click)="selectTheme(t)"
            class="w-8 h-8 rounded-full border transition-all relative flex items-center justify-center group"
            [class.ring-2]="activeTheme.id === t.id" [class.ring-offset-1]="activeTheme.id === t.id"
            [class.ring-blue-500]="activeTheme.id === t.id" [class.opacity-50]="wordsPlacedCount < t.unlockCount"
            [style.background-color]="t.colors.bg" [style.border-color]="t.colors.confirmedBorder"
            [title]="wordsPlacedCount < t.unlockCount ? 'Unlock at ' + t.unlockCount + ' words' : t.name">
  
            <svg *ngIf="wordsPlacedCount < t.unlockCount" class="w-4 h-4 text-gray-400" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
              </path>
            </svg>
          </button>
        </div>
      </div>
  
      <button (click)="zoomIn.emit()"
        class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700" title="Zoom In">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
      </button>
      <button (click)="zoomOut.emit()"
        class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700"
        title="Zoom Out">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
        </svg>
      </button>
    </div>
  `
})
export class TopBarComponent implements AfterViewInit, OnDestroy {
    @Input() lastPlacedTime: number = 0;
    @Input() cooldownMs: number = 15000;
    @Input() wordsPlacedCount: number = 0;
    @Input() isValidating: boolean = false;
    @Input() validationMessage: string = '';
    @Input() isError: boolean = false;
    @Input() activeTheme!: Theme;
    @Input() themes: Theme[] = [];

    @Output() themeSelected = new EventEmitter<Theme>();
    @Output() zoomIn = new EventEmitter<void>();
    @Output() zoomOut = new EventEmitter<void>();
    @Output() resetView = new EventEmitter<void>();
    @Output() sharePosition = new EventEmitter<void>();

    @ViewChild('progressPath') progressPath!: ElementRef<SVGPathElement>;

    private ngZone = inject(NgZone);
    private animationFrameId: number | null = null;

    // Internal state for checkmark
    cooldownProgress = 1.0;
    isThemeMenuOpen = false;

    ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            const loop = () => {
                const now = Date.now();
                const elapsed = now - this.lastPlacedTime;

                let progress = 1.0;
                if (elapsed < this.cooldownMs) {
                    progress = elapsed / this.cooldownMs;
                }

                if (this.progressPath?.nativeElement) {
                    const val = (progress * 100).toFixed(1);
                    this.progressPath.nativeElement.setAttribute('stroke-dasharray', `${val}, 100`);
                }

                if (progress >= 1.0 && this.cooldownProgress < 1.0) {
                    this.ngZone.run(() => this.cooldownProgress = 1.0);
                } else if (progress < 1.0 && this.cooldownProgress >= 1.0) {
                    this.ngZone.run(() => this.cooldownProgress = progress);
                }

                this.animationFrameId = requestAnimationFrame(loop);
            };
            loop();
        });
    }

    ngOnDestroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }

    toggleThemeMenu() {
        this.isThemeMenuOpen = !this.isThemeMenuOpen;
    }

    selectTheme(theme: Theme) {
        if (this.wordsPlacedCount >= theme.unlockCount) {
            this.themeSelected.emit(theme);
            this.isThemeMenuOpen = false;
        }
    }
}
