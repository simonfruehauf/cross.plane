import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {

  constructor() {}

  async validateWord(word: string): Promise<{ valid: boolean; definition: string; reason?: string }> {
    try {
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
}