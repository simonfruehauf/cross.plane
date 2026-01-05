import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {

  constructor() { }

  async validateWord(word: string): Promise<{ valid: boolean; definition: string; reason?: string }> {
    try {
      // Step 1: Check for profanity FIRST (silently reject bad words)
      const isProfane = await this.checkProfanity(word);
      if (isProfane) {
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
   * Checks if a word contains profanity using the PurgoMalum API.
   * This is done silently - the player won't know their word was blocked for profanity.
   */
  private async checkProfanity(word: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(word.toLowerCase())}`
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