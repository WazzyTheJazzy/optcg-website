/**
 * Sleeve Preferences
 * 
 * Manages card sleeve customization preferences for players.
 * Stores preferences in localStorage for persistence.
 */

import { CardSleeve, cardSleeves } from './card-sleeves';

const STORAGE_KEY = 'optcg_sleeve_preference';

/**
 * Get the user's selected sleeve
 * Returns the default (midnight-black) if no preference is set
 */
export function getSelectedSleeve(): CardSleeve {
  if (typeof window === 'undefined') {
    // Server-side: return default
    return cardSleeves.find(s => s.id === 'midnight-black') || cardSleeves[0];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sleeveId = JSON.parse(stored);
      const sleeve = cardSleeves.find(s => s.id === sleeveId);
      if (sleeve) {
        return sleeve;
      }
    }
  } catch (error) {
    console.error('Error loading sleeve preference:', error);
  }

  // Default to midnight black
  return cardSleeves.find(s => s.id === 'midnight-black') || cardSleeves[0];
}

/**
 * Save the user's selected sleeve
 */
export function setSelectedSleeve(sleeve: CardSleeve): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sleeve.id));
  } catch (error) {
    console.error('Error saving sleeve preference:', error);
  }
}

/**
 * React hook for managing sleeve preferences
 */
export function useSleevePreference() {
  const [selectedSleeve, setSelectedSleeveState] = React.useState<CardSleeve>(getSelectedSleeve);

  const updateSleeve = React.useCallback((sleeve: CardSleeve) => {
    setSelectedSleeve(sleeve);
    setSelectedSleeveState(sleeve);
  }, []);

  return {
    selectedSleeve,
    setSelectedSleeve: updateSleeve,
  };
}

// Need to import React for the hook
import React from 'react';
