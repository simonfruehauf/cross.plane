import { inject, Injectable, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';

// Cooldown duration for unlogged users who submit profanity (30 seconds)
const PROFANITY_COOLDOWN_MS = 30000;

// Additional words to block that may not be caught by the external profanity API
// Includes anatomical terms, slurs, drug references, and other inappropriate words
const LOCAL_BLOCKLIST = new Set([
  // Anatomical/crude terms
  'penis',
  'vagina',
  'anus',
  'rectum',
  'scrotum',
  'testicle',
  'testicles',
  'clitoris',
  'labia',
  'foreskin',
  'genitals',
  'genital',
  'phallus',
  'urethra',
  'pubic',
  'groin',

  // Bodily functions/fluids
  'feces',
  'faeces',
  'urine',
  'semen',
  'sperm',
  'enema',

  // Drug references
  'cocaine',
  'heroin',
  'meth',
  'crack',
  'ecstasy',
  'lsd',
  'ketamine',
  'opium',
  'fentanyl',
  'morphine',

  // Slurs and offensive terms (keeping list minimal but covering major ones)
  'nazi',
  'nazis',
  'hitler',
  'holocaust',
  'genocide',
  'kkk',
  'jihad',
  'terrorist',
  'terrorists',

  // Violence-related
  'murder',
  'rape',
  'rapist',
  'molest',
  'pedophile',
  'incest',
  'suicide',
  'homicide',

  // Other inappropriate
  'porn',
  'porno',
  'hentai',
  'fetish',
  'bondage',
  'orgy',
  'brothel',
  'prostitute',
  'escort',
]);

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {
  private firebaseService = inject(FirebaseService);

  // Track profanity cooldown for unlogged users
  private lastProfanityTime = 0;

  /** Exposed signal for UI to show remaining cooldown time */
  readonly profanityCooldownEnd = signal<number>(0);

  constructor() { }

  /** Check if user is currently in profanity cooldown */
  isInProfanityCooldown(): boolean {
    const user = this.firebaseService.currentUser();
    if (user) {
      // Logged-in users don't have profanity cooldown
      return false;
    }
    return Date.now() < this.lastProfanityTime + PROFANITY_COOLDOWN_MS;
  }

  /** Get remaining cooldown time in milliseconds */
  getProfanityCooldownRemaining(): number {
    if (!this.isInProfanityCooldown()) return 0;
    return (this.lastProfanityTime + PROFANITY_COOLDOWN_MS) - Date.now();
  }

  async validateWord(word: string): Promise<{ valid: boolean; definition: string; reason?: string }> {
    try {
      // Step 0: Check if unlogged user is in profanity cooldown
      if (this.isInProfanityCooldown()) {
        const remaining = Math.ceil(this.getProfanityCooldownRemaining() / 1000);
        return { valid: false, definition: '', reason: `Please wait ${remaining}s before trying again` };
      }

      // Step 1: Check for profanity FIRST (silently reject bad words)
      const isProfane = await this.checkProfanity(word);
      if (isProfane) {
        const user = this.firebaseService.currentUser();
        if (user) {
          // Track profanity attempt in Firebase for logged-in users
          this.firebaseService.incrementProfanityCount();
        } else {
          // Apply cooldown for unlogged users
          this.lastProfanityTime = Date.now();
          this.profanityCooldownEnd.set(this.lastProfanityTime + PROFANITY_COOLDOWN_MS);
        }
        // Return generic "not found" message so player doesn't know why it was blocked
        return { valid: false, definition: '', reason: `"${word.toUpperCase()}" not found in dictionary` };
      }

      // Step 2: Proceed with normal dictionary validation
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);

      if (response.status === 404) {
        return { valid: false, definition: '', reason: `"${word.toUpperCase()}" not found in dictionary` };
      }

      if (!response.ok) {
        throw new Error('Dictionary API error');
      }

      const data = await response.json();

      // Extract the first available definition
      let definition = 'No definition found.';
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        if (entry.meanings && entry.meanings.length > 0) {
          const meaning = entry.meanings[0];
          if (meaning.definitions && meaning.definitions.length > 0) {
            definition = meaning.definitions[0].definition;
          }
        }
      }

      return {
        valid: true,
        definition: definition
      };

    } catch (error) {
      console.error('Dictionary validation error:', error);
      return { valid: false, definition: '', reason: 'Validation service unavailable' };
    }
  }

  /**
   * Checks if a word contains profanity using the local blocklist and PurgoMalum API.
   * This is done silently - the player won't know their word was blocked for profanity.
   */
  private async checkProfanity(word: string): Promise<boolean> {
    const lowerWord = word.toLowerCase();

    // Check local blocklist first
    if (LOCAL_BLOCKLIST.has(lowerWord)) {
      return true;
    }

    try {
      const response = await fetch(
        `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(lowerWord)}`
      );

      if (!response.ok) {
        // If profanity API fails, allow the word through (fail open)
        // Dictionary validation will still catch invalid words
        console.warn('Profanity check failed, allowing word through');
        return false;
      }

      const result = await response.text();
      return result === 'true';
    } catch (error) {
      // If profanity API is unavailable, allow the word through
      console.warn('Profanity API unavailable:', error);
      return false;
    }
  }
}