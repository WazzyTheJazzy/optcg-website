'use client';

/**
 * ActionPanel.tsx
 * 
 * Displays available actions for the selected card during Main Phase.
 * Shows buttons for Play Card, Attack, and Attach DON based on card state.
 */

import React from 'react';
import { Phase, ZoneId, CardState, CardCategory, PlayerId } from '@/lib/game-engine/core/types';
import { BoardVisualState, CardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';

/**
 * Available action types
 */
export type Action = 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON';

/**
 * Determines which actions are available for a selected card based on game state
 * 
 * This function checks:
 * - PLAY_CARD: Card must be in hand with sufficient DON to pay cost
 * - ATTACK: Card must be an active character in character area
 * - ATTACH_DON: Card must be a character/leader in play with active DON available
 * 
 * @param selectedCard - The currently selected card
 * @param boardState - Current board state from RenderingInterface
 * @param phase - Current game phase (only Main Phase allows actions)
 * @param playerId - The player who owns the card
 * @returns Array of available action types
 * 
 * @example
 * ```typescript
 * const actions = getAvailableActions(card, boardState, Phase.MAIN, PlayerId.PLAYER_1);
 * // Returns: ['PLAY_CARD', 'ATTACK'] if card can be played and attacked with
 * ```
 */
export function getAvailableActions(
  selectedCard: CardVisualState | null,
  boardState: BoardVisualState,
  phase: Phase,
  playerId: PlayerId
): Action[] {
  const actions: Action[] = [];
  
  // Only allow actions during Main Phase
  if (phase !== Phase.MAIN || !selectedCard) {
    return actions;
  }

  // Get the player state for the card's owner
  const playerState = playerId === PlayerId.PLAYER_1
    ? boardState.player1 
    : boardState.player2;

  // Count active DON cards in cost area
  const activeDonCount = playerState.zones.costArea.filter(
    don => don.state === CardState.ACTIVE
  ).length;

  // PLAY_CARD action - card must be in hand and player must have sufficient DON
  if (selectedCard.position.zone === ZoneId.HAND) {
    const cardCost = selectedCard.cost;
    if (activeDonCount >= cardCost) {
      actions.push('PLAY_CARD');
    }
  }

  // ATTACK action - card must be an active character in character area
  if (
    selectedCard.position.zone === ZoneId.CHARACTER_AREA &&
    selectedCard.state === CardState.ACTIVE &&
    selectedCard.metadata.category === CardCategory.CHARACTER
  ) {
    actions.push('ATTACK');
  }

  // ATTACH_DON action - card must be a character or leader in play and player must have active DON
  if (
    (selectedCard.position.zone === ZoneId.CHARACTER_AREA || selectedCard.position.zone === ZoneId.LEADER_AREA) &&
    (selectedCard.metadata.category === CardCategory.CHARACTER || 
     selectedCard.metadata.category === CardCategory.LEADER) &&
    activeDonCount > 0
  ) {
    actions.push('ATTACH_DON');
  }

  return actions;
}

/**
 * Props for the ActionPanel component
 */
export interface ActionPanelProps {
  selectedCard: CardVisualState | null;
  availableActions: Action[];
  onAction: (action: Action) => void;
  phase: Phase;
}

/**
 * ActionPanel component - displays available actions for selected card
 */
export function ActionPanel({
  selectedCard,
  availableActions,
  onAction,
  phase,
}: ActionPanelProps) {
  // Don't show panel if no card selected or not in Main Phase
  if (!selectedCard || phase !== Phase.MAIN || availableActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border-2 border-blue-500">
      <div className="text-white font-semibold mb-3 text-sm">
        {selectedCard.metadata.name}
      </div>
      
      <div className="space-y-2">
        {availableActions.includes('PLAY_CARD') && (
          <button
            onClick={() => onAction('PLAY_CARD')}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg text-sm"
            aria-label={`Play ${selectedCard.metadata.name} for ${selectedCard.cost} DON`}
          >
            Play Card
            <span className="ml-2 text-xs opacity-90">
              (Cost: {selectedCard.cost})
            </span>
          </button>
        )}

        {availableActions.includes('ATTACK') && (
          <button
            onClick={() => onAction('ATTACK')}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg text-sm"
            aria-label={`Attack with ${selectedCard.metadata.name}, power ${selectedCard.power}`}
          >
            Attack
            <span className="ml-2 text-xs opacity-90">
              (Power: {selectedCard.power})
            </span>
          </button>
        )}

        {availableActions.includes('ATTACH_DON') && (
          <button
            onClick={() => onAction('ATTACH_DON')}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-lg text-sm"
            aria-label={`Attach DON to ${selectedCard.metadata.name}, increases power by 1000`}
          >
            Attach DON
            <span className="ml-2 text-xs opacity-90">
              (+1000 Power)
            </span>
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          Click an action to perform it
        </div>
      </div>
    </div>
  );
}
