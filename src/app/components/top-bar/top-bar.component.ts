import { Component, EventEmitter, Input, Output, signal, ElementRef, ViewChild, NgZone, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme } from '../../../app.component';
import { FirebaseService } from '../../../services/firebase.service';
import { GridStoreService } from '../../../services/grid-store.service';

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
            Words placed: <span class="text-black text-sm">{{ wordsPlacedCount }}</span>
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
      
      <!-- Auth -->
      <!-- Auth -->
      <div class="relative">
          <button *ngIf="!currentUser()" (click)="toggleAuthMenu()"
            class="bg-white shadow-lg border border-gray-200 p-2 rounded-full hover:bg-gray-50 text-gray-700"
            title="Sign In">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1">
                </path>
            </svg>
          </button>

          <!-- Auth Menu -->
          <div *ngIf="isAuthMenuOpen && !currentUser()" 
               class="absolute right-0 top-12 w-72 bg-white/95 backdrop-blur shadow-xl border border-gray-200 p-4 rounded-xl z-50 animate-in fade-in slide-in-from-top-2">
            
            <h3 class="font-bold text-lg mb-3">{{ isRegisterMode ? 'Create Account' : 'Welcome Back' }}</h3>

            <!-- Email/Pass Form -->
            <div class="space-y-2 mb-4">
                <input #emailInput type="email" placeholder="Email"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50"
                    (keydown)="$event.stopPropagation()"
                    (keyup.enter)="passwordInput.focus()">
                <input #passwordInput type="password" placeholder="Password"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50"
                    (keydown)="$event.stopPropagation()"
                    (keyup.enter)="handleAuth(emailInput.value, passwordInput.value)">
                
                <div *ngIf="authError" class="text-xs text-red-500 font-medium">{{ authError }}</div>

                <button (click)="handleAuth(emailInput.value, passwordInput.value)"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center">
                    <span *ngIf="!isAuthLoading">{{ isRegisterMode ? 'Sign Up' : 'Log In' }}</span>
                    <svg *ngIf="isAuthLoading" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
            </div>

            <div class="relative flex py-2 items-center">
                <div class="flex-grow border-t border-gray-300"></div>
                <span class="flex-shrink-0 mx-2 text-gray-400 text-xs">OR</span>
                <div class="flex-grow border-t border-gray-300"></div>
            </div>

            <!-- Google Button -->
            <button (click)="signInGoogle()"
                class="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                Google
            </button>

            <!-- Toggle Mode -->
            <div class="text-center text-xs text-gray-500">
                <span *ngIf="!isRegisterMode">Need an account? <button (click)="isRegisterMode = true; authError = ''" class="text-blue-600 hover:underline">Sign up</button></span>
                <span *ngIf="isRegisterMode">Values account? <button (click)="isRegisterMode = false; authError = ''" class="text-blue-600 hover:underline">Log in</button></span>
            </div>
          </div>
      </div>

      <button *ngIf="currentUser()" (click)="signOut()"
        class="bg-white shadow-lg border border-gray-200 p-1 rounded-full hover:bg-gray-50 overflow-hidden w-10 h-10 flex items-center justify-center relative group"
        [title]="currentUser()?.displayName || 'Sign Out'">
        <img *ngIf="currentUser()?.photoURL" [src]="currentUser()?.photoURL" class="w-full h-full object-cover rounded-full">
        <span *ngIf="!currentUser()?.photoURL" class="text-xs font-bold">{{ currentUser()?.displayName?.charAt(0) || 'U' }}</span>
        
        <!-- Hover Overlay for Sign Out -->
        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
        </div>
      </button>

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
  private firebaseService = inject(FirebaseService);
  private gridStore = inject(GridStoreService);

  // Auth Signal
  currentUser = this.firebaseService.currentUser;

  private animationFrameId: number | null = null;

  // Internal state for checkmark
  cooldownProgress = 1.0;
  isThemeMenuOpen = false;

  // Auth State
  isAuthMenuOpen = false;
  isRegisterMode = false;
  isAuthLoading = false;
  authError = '';

  toggleAuthMenu() {
    this.isAuthMenuOpen = !this.isAuthMenuOpen;
    this.isThemeMenuOpen = false;
    this.authError = '';
  }

  // Auth methods
  async signInGoogle() {
    this.isAuthLoading = true;
    try {
      await this.firebaseService.signInWithGoogle();
      this.isAuthMenuOpen = false;
    } catch (e: any) {
      this.authError = e.message;
    } finally {
      this.isAuthLoading = false;
    }
  }

  async handleAuth(email: string, pass: string) {
    if (!email || !pass) {
      this.authError = 'Please enter email and password';
      return;
    }

    this.isAuthLoading = true;
    this.authError = '';

    try {
      if (this.isRegisterMode) {
        await this.firebaseService.registerEmail(email, pass);
      } else {
        await this.firebaseService.loginEmail(email, pass);
      }
      this.isAuthMenuOpen = false;
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/invalid-credential') {
        this.authError = 'Invalid email or password.';
      } else if (e.code === 'auth/email-already-in-use') {
        this.authError = 'Email already in use.';
      } else if (e.code === 'auth/weak-password') {
        this.authError = 'Password should be at least 6 characters.';
      } else {
        this.authError = 'Error: ' + (e.message || 'Unknown');
      }
    } finally {
      this.isAuthLoading = false;
    }
  }

  async signOut() {
    await this.firebaseService.signOut();
    this.gridStore.resetUserStats();
  }

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
    this.isAuthMenuOpen = false;
  }

  selectTheme(theme: Theme) {
    if (this.wordsPlacedCount >= theme.unlockCount) {
      this.themeSelected.emit(theme);
      this.isThemeMenuOpen = false;
    }
  }
}

