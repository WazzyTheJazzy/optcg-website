'use client';

/**
 * GameBoard.tsx
 * 
 * Complete game board layout component that composes GameScene with UI overlays.
 * Provides phase indicators, turn counter, player info, and action buttons.
 * Wires user interactions to GameEngine action methods and displays legal actions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameScene } from './GameScene';
import { ActionPanel, Action, getAvailableActions } from './ActionPanel';
import { ErrorToast } from './ErrorToast';
import { SuccessToast } from './SuccessToast';
import { GameEngine } from '@/lib/game-engine/core/GameEngine';
import { RenderingInterface, BoardVisualState } from '@/lib/game-engine/rendering/RenderingInterface';
import { PlayerId, ZoneId, Phase, ActionType } from '@/lib/game-engine/core/types';

/**
 * Props for the GameBoard component
 */
export interface GameBoardProps {
  engine: GameEngine;
  renderingInterface: RenderingInterface;
  localPlayerId?: PlayerId; // The player using this UI (for perspective)
  onError?: (error: Error) => void;
}

/**
 * Action button configuration
 */
interface ActionButton {
  id: string;
  label: string;
  action: () => void;
  enabled: boolean;
  variant: 'primary' | 'secondary' | 'danger';
}

/**
 * GameBoard component - complete board layout with UI
 */
export function GameBoard({
  engine,
  renderingInterface,
  localPlayerId = PlayerId.PLAYER_1,
  onError,
}: GameBoardProps) {
  const [boardState, setBoardState] = useState<BoardVisualState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [legalActions, setLegalActions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attackMode, setAttackMode] = useState<boolean>(false);
  const [validTargets, setValidTargets] = useState<string[]>([]);
  const [donAttachMode, setDonAttachMode] = useState<boolean>(false);
  const [selectedDonId, setSelectedDonId] = useState<string | null>(null);
  const [highlightedCards, setHighlightedCards] = useState<string[]>([]); // For battle effects (task 9.2)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null); // For keyboard navigation (task 11.1)
  const [announcement, setAnnouncement] = useState<string>(''); // For screen reader announcements (task 12.2)
  const [effectLog, setEffectLog] = useState<Array<{ id: string; message: string; timestamp: number }>>([]); // For effect event log (task 45)
  const isAdvancingRef = useRef(false);

  /**
   * Handles errors by displaying an error message and notifying the parent component
   * @param err - The error to handle
   */
  const handleError = useCallback((err: Error) => {
    console.error('Game error:', err);
    setErrorMessage(err.message);
    // Clear error after 3 seconds
    setTimeout(() => setErrorMessage(null), 3000);
    if (onError) {
      onError(err);
    }
  }, [onError]);

  /**
   * Announces state changes for screen readers using ARIA live regions
   * @param message - The message to announce to screen readers
   */
  const announce = useCallback((message: string) => {
    console.log('📢 Announcement:', message);
    setAnnouncement(message);
    // Clear announcement after a short delay to allow it to be read
    setTimeout(() => setAnnouncement(''), 100);
  }, []);

  /**
   * Displays an error message to the user via toast notification
   * Also announces the error to screen readers
   * @param message - The error message to display
   */
  const showError = useCallback((message: string) => {
    console.error('Error:', message);
    setErrorMessage(message);
    // Set timeout to clear error after 3 seconds
    setTimeout(() => setErrorMessage(null), 3000);
    // Announce error for screen readers (task 12.2)
    announce(`Error: ${message}`);
  }, [announce]);

  /**
   * Displays a success message to the user via toast notification
   * @param message - The success message to display
   */
  const showSuccess = useCallback((message: string) => {
    console.log('✅ Success:', message);
    setSuccessMessage(message);
    // Set timeout to clear success after 2 seconds
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  // Update board state when game state changes
  // Don't use useCallback - we want to capture the latest engine/renderingInterface
  const updateBoardState = () => {
    if (!engine || !renderingInterface) return;
    
    console.log('🔔 GameBoard.updateBoardState: Event triggered, fetching new board state');
    
    // Force a fresh read from the engine
    const newBoardState = renderingInterface.getBoardState();
    
    console.log('🎮 GameBoard: Board state fetched:', {
      phase: newBoardState.phase,
      turn: newBoardState.turnNumber,
      p1Deck: newBoardState.player1.zones.deck.length,
      p1Hand: newBoardState.player1.zones.hand.length,
      p1CharacterArea: newBoardState.player1.zones.characterArea.length,
      p1Leader: newBoardState.player1.zones.leaderArea?.metadata.name || 'None',
      p2Deck: newBoardState.player2.zones.deck.length,
      p2Hand: newBoardState.player2.zones.hand.length,
      p2CharacterArea: newBoardState.player2.zones.characterArea.length,
      p2Leader: newBoardState.player2.zones.leaderArea?.metadata.name || 'None',
    });
    console.log('📝 GameBoard: Setting board state in React');
    
    // Use functional update to ensure we're not depending on stale state
    setBoardState(prevState => {
      console.log('🔄 GameBoard: Previous state had', prevState?.player1.zones.characterArea.length || 0, 'cards in character area');
      console.log('🔄 GameBoard: New state has', newBoardState.player1.zones.characterArea.length, 'cards in character area');
      console.log('🃏 GameBoard: Previous hand had', prevState?.player1.zones.hand.length || 0, 'cards');
      console.log('🃏 GameBoard: New hand has', newBoardState.player1.zones.hand.length, 'cards');
      return newBoardState;
    });
    
    // Update legal actions for local player
    if (engine.isGameSetup()) {
      const actions = engine.getLegalActions(localPlayerId);
      setLegalActions(actions);
    }
  };

  // Subscribe to events - recreate subscriptions when dependencies change
  useEffect(() => {
    if (!engine || !renderingInterface) return;

    // Initial state
    console.log('🎬 GameBoard: Initial board state fetch');
    updateBoardState();

    // Subscribe to all state-changing events
    renderingInterface.onStateChanged(updateBoardState); // Primary state update listener
    renderingInterface.onCardMoved(updateBoardState);
    renderingInterface.onCardStateChanged(updateBoardState);
    renderingInterface.onPowerChanged(updateBoardState);
    renderingInterface.onTurnStart(updateBoardState);
    renderingInterface.onTurnEnd(updateBoardState);
    renderingInterface.onGameOver(updateBoardState);
    
    // Subscribe to PHASE_CHANGED events (task 10.3)
    renderingInterface.onPhaseChanged((event) => {
      console.log('🔄 Phase changed event received:', event);
      
      // Update board state first
      updateBoardState();
      
      // Clear UI state when leaving MAIN phase
      if (event.oldPhase === Phase.MAIN && event.newPhase !== Phase.MAIN) {
        console.log('🧹 Clearing UI state on phase change from MAIN to', event.newPhase);
        
        // Batch all state updates together (task 15.3)
        React.startTransition(() => {
          // Clear selectedCardId when leaving MAIN phase
          setSelectedCardId(null);
          
          // Exit attack mode when leaving MAIN phase
          if (attackMode) {
            console.log('🚫 Exiting attack mode');
            setAttackMode(false);
            setValidTargets([]);
          }
          
          // Exit DON attach mode when leaving MAIN phase
          if (donAttachMode) {
            console.log('🚫 Exiting DON attach mode');
            setDonAttachMode(false);
            setSelectedDonId(null);
          }
        });
      }
    });
    
    // Subscribe to battle events (task 44: Update UI to display battle events)
    renderingInterface.onBattleEvent((event) => {
      console.log('⚔️ Battle event received:', event);
      
      // Get current board state for card lookups
      const currentBoardState = renderingInterface.getBoardState();
      
      // Helper function to find a card by ID
      const findCard = (cardId: string) => {
        return (
          currentBoardState.player1.zones.characterArea.find(c => c.id === cardId) ||
          currentBoardState.player2.zones.characterArea.find(c => c.id === cardId) ||
          (currentBoardState.player1.zones.leaderArea?.id === cardId ? currentBoardState.player1.zones.leaderArea : null) ||
          (currentBoardState.player2.zones.leaderArea?.id === cardId ? currentBoardState.player2.zones.leaderArea : null)
        );
      };
      
      // Handle ATTACK_DECLARED events (Requirement 9.1)
      if (event.type === 'ATTACK_DECLARED') {
        const attacker = findCard(event.attackerId);
        const target = findCard(event.targetId);
        
        // Highlight the attacker and target cards
        setHighlightedCards([event.attackerId, event.targetId]);
        
        // Show battle animation feedback
        if (attacker && target) {
          const message = `${attacker.metadata.name} attacks ${target.metadata.name}!`;
          showSuccess(message);
          announce(message);
        } else {
          showSuccess('Attack declared!');
          announce('Attack declared');
        }
        
        console.log(`⚔️ ATTACK_DECLARED: ${event.attackerId} → ${event.targetId}`);
      }
      
      // Handle BLOCK_DECLARED events (Requirement 9.2)
      else if (event.type === 'BLOCK_DECLARED') {
        const blocker = findCard(event.blockerId);
        const attacker = findCard(event.attackerId);
        
        // Highlight the blocker card
        setHighlightedCards([event.blockerId, event.attackerId]);
        
        // Show blocker feedback
        if (blocker && attacker) {
          const message = `${blocker.metadata.name} blocks ${attacker.metadata.name}!`;
          showSuccess(message);
          announce(message);
        } else {
          showSuccess('Blocker declared!');
          announce('Blocker declared');
        }
        
        console.log(`🛡️ BLOCK_DECLARED: ${event.blockerId} blocks ${event.attackerId}`);
      }
      
      // Handle COUNTER_STEP_START events (Requirement 9.3)
      else if (event.type === 'COUNTER_STEP_START') {
        const defender = findCard(event.defenderId);
        
        // Highlight the defender card
        setHighlightedCards([event.defenderId]);
        
        // Show counter step feedback
        if (defender) {
          const message = `Counter step: ${defender.metadata.name} can use counter cards`;
          showSuccess(message);
          announce(message);
        } else {
          showSuccess('Counter step started');
          announce('Counter step started');
        }
        
        console.log(`💫 COUNTER_STEP_START: Defender ${event.defenderId}`);
      }
      
      // Handle BATTLE_END events (Requirement 9.4)
      else if (event.type === 'BATTLE_END') {
        const attacker = findCard(event.attackerId);
        const defender = findCard(event.defenderId);
        
        // Clear highlights after a delay
        setTimeout(() => {
          setHighlightedCards([]);
        }, 1500);
        
        // Show battle results
        if (attacker && defender) {
          const message = `Battle complete! ${attacker.metadata.name} vs ${defender.metadata.name}. Damage: ${event.damageDealt}`;
          showSuccess(message);
          announce(message);
        } else if (attacker) {
          // Defender was KO'd
          const message = `Battle complete! ${attacker.metadata.name} defeated the defender. Damage: ${event.damageDealt}`;
          showSuccess(message);
          announce(message);
        } else {
          showSuccess(`Battle complete! Damage: ${event.damageDealt}`);
          announce(`Battle complete! Damage dealt: ${event.damageDealt}`);
        }
        
        console.log(`✅ BATTLE_END: Damage dealt: ${event.damageDealt}`);
        
        // Verify attacker becomes RESTED after attack
        const newBoardState = renderingInterface.getBoardState();
        const attackerCard = findCard(event.attackerId);
        
        if (attackerCard) {
          console.log(`✅ Attacker ${event.attackerId} state after battle: ${attackerCard.state}`);
          if (attackerCard.state === 'RESTED') {
            console.log('✅ Verified: Attacker became RESTED after attack');
          }
        }
        
        // Verify KO occurs if defender is no longer on field
        const defenderCard = findCard(event.defenderId);
        if (!defenderCard) {
          console.log('✅ Verified: Defender was KO\'d (card no longer in play)');
        } else {
          console.log(`✅ Defender ${event.defenderId} power after battle: ${defenderCard.power}`);
        }
      }
      
      // Update board state to reflect battle changes
      updateBoardState();
    });

    // Subscribe to effect events (task 45: Update UI to display effect events)
    renderingInterface.onEffectEvent((event) => {
      console.log('✨ Effect event received:', event);
      
      // Get current board state for card lookups
      const currentBoardState = renderingInterface.getBoardState();
      
      // Helper function to find a card by ID
      const findCard = (cardId: string) => {
        return (
          currentBoardState.player1.zones.characterArea.find(c => c.id === cardId) ||
          currentBoardState.player2.zones.characterArea.find(c => c.id === cardId) ||
          currentBoardState.player1.zones.hand.find(c => c.id === cardId) ||
          currentBoardState.player2.zones.hand.find(c => c.id === cardId) ||
          (currentBoardState.player1.zones.leaderArea?.id === cardId ? currentBoardState.player1.zones.leaderArea : null) ||
          (currentBoardState.player2.zones.leaderArea?.id === cardId ? currentBoardState.player2.zones.leaderArea : null) ||
          (currentBoardState.player1.zones.stageArea?.id === cardId ? currentBoardState.player1.zones.stageArea : null) ||
          (currentBoardState.player2.zones.stageArea?.id === cardId ? currentBoardState.player2.zones.stageArea : null)
        );
      };
      
      // Handle EFFECT_TRIGGERED events (Requirement 36.1)
      if (event.type === 'EFFECT_TRIGGERED') {
        const sourceCard = findCard(event.sourceCardId);
        
        // Build effect description
        let effectDescription = `${event.effectLabel} ${event.effectType.replace(/_/g, ' ').toLowerCase()}`;
        
        // Add target information if available
        if (event.targets && event.targets.length > 0) {
          const targetNames = event.targets.map(t => t.cardName).join(', ');
          effectDescription += ` targeting ${targetNames}`;
        }
        
        // Highlight the source card
        if (sourceCard) {
          setHighlightedCards([event.sourceCardId]);
        }
        
        // Show effect trigger notification
        const message = sourceCard 
          ? `${sourceCard.metadata.name}: ${effectDescription}`
          : `Effect triggered: ${effectDescription}`;
        
        showSuccess(message);
        announce(message);
        
        // Add to effect log
        setEffectLog((prev: Array<{ id: string; message: string; timestamp: number }>) => [
          ...prev.slice(-9), // Keep last 9 entries
          {
            id: event.effectId,
            message: `⚡ ${message}`,
            timestamp: event.timestamp,
          },
        ]);
        
        console.log(`✨ EFFECT_TRIGGERED: ${event.sourceCardName} - ${effectDescription}`);
      }
      
      // Handle EFFECT_AWAITING_INPUT events (Requirement 36.2)
      else if (event.type === 'EFFECT_AWAITING_INPUT') {
        const sourceCard = findCard(event.sourceCardId);
        
        // Build input prompt
        const inputPrompt = `${event.inputType.replace(/_/g, ' ').toLowerCase()}`;
        
        // Highlight the source card
        if (sourceCard) {
          setHighlightedCards([event.sourceCardId]);
        }
        
        // Show awaiting input notification
        const message = sourceCard
          ? `${sourceCard.metadata.name} awaiting ${inputPrompt}`
          : `Effect awaiting ${inputPrompt}`;
        
        showSuccess(message);
        announce(message);
        
        // Add to effect log
        setEffectLog((prev: Array<{ id: string; message: string; timestamp: number }>) => [
          ...prev.slice(-9), // Keep last 9 entries
          {
            id: event.effectId,
            message: `⏳ ${message}`,
            timestamp: event.timestamp,
          },
        ]);
        
        console.log(`⏳ EFFECT_AWAITING_INPUT: ${event.sourceCardName} - ${inputPrompt}`);
      }
      
      // Handle EFFECT_RESOLVED events (Requirement 36.3)
      else if (event.type === 'EFFECT_RESOLVED') {
        const sourceCard = findCard(event.sourceCardId);
        
        // Build result description
        let resultDescription = event.result || 'resolved';
        
        // Add target information if available
        if (event.targets && event.targets.length > 0) {
          const targetNames = event.targets.map(t => t.cardName).join(', ');
          resultDescription += ` (${targetNames})`;
        }
        
        // Clear highlights after a delay
        setTimeout(() => {
          setHighlightedCards([]);
        }, 1500);
        
        // Show effect resolved notification
        const message = sourceCard
          ? `${sourceCard.metadata.name}: ${event.effectLabel} ${resultDescription}`
          : `Effect ${resultDescription}`;
        
        showSuccess(message);
        announce(message);
        
        // Add to effect log
        setEffectLog((prev: Array<{ id: string; message: string; timestamp: number }>) => [
          ...prev.slice(-9), // Keep last 9 entries
          {
            id: event.effectId,
            message: `✅ ${message}`,
            timestamp: event.timestamp,
          },
        ]);
        
        console.log(`✅ EFFECT_RESOLVED: ${event.sourceCardName} - ${resultDescription}`);
      }
      
      // Update board state to reflect effect changes
      updateBoardState();
    });

    // Subscribe to POWER_CHANGED events (task 6.4)
    renderingInterface.onPowerChanged((event) => {
      console.log('💪 Power changed event received:', event);
      
      // Verify character power increases by 1000 when DON is attached
      if (event.reason === 'DON given') {
        const powerIncrease = event.newPower - event.oldPower;
        console.log(`✅ Power increased by ${powerIncrease} (expected 1000)`);
        
        if (powerIncrease === 1000) {
          console.log('✅ Verified: Character power increased by 1000 after DON attachment');
        } else {
          console.warn(`⚠️ Unexpected power increase: ${powerIncrease} (expected 1000)`);
        }
      }
      
      // Update board state to reflect power change
      updateBoardState();
    });

    return () => {
      // Cleanup subscriptions handled by event emitter
      console.log('🧹 GameBoard: Cleaning up event subscriptions');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, renderingInterface, localPlayerId]);

  // DISABLED: Auto-advance through non-interactive phases
  // Temporarily disabled to debug phase skipping issue
  // TODO: Re-enable once phase flow is working correctly
  /*
  useEffect(() => {
    if (!boardState || !engine.isGameSetup()) return;
    
    const isActivePlayer = boardState.activePlayer === localPlayerId;
    if (!isActivePlayer) return;
    
    // Prevent multiple simultaneous advances
    if (isAdvancingRef.current) {
      console.log(`⏳ Already advancing, skipping...`);
      return;
    }
    
    // Auto-advance through Refresh, Draw, and DON phases ONLY
    const nonInteractivePhases = [Phase.REFRESH, Phase.DRAW, Phase.DON_PHASE];
    
    console.log(`🔍 Phase check: ${boardState.phase}, Should auto-advance: ${nonInteractivePhases.includes(boardState.phase)}`);
    
    if (nonInteractivePhases.includes(boardState.phase)) {
      console.log(`⚡ Auto-advancing through ${boardState.phase} phase...`);
      isAdvancingRef.current = true;
      
      // Small delay to let players see what happened
      const timer = setTimeout(async () => {
        try {
          console.log(`⏩ Executing advancePhase from ${boardState.phase}`);
          const result = engine.advancePhase();
          // If result is a promise (AI player), wait for it
          if (result instanceof Promise) {
            await result;
          }
          // Reset flag after a short delay to allow state to update
          setTimeout(() => {
            isAdvancingRef.current = false;
          }, 100);
        } catch (error) {
          console.error('Failed to auto-advance phase:', error);
          isAdvancingRef.current = false;
          handleError(error instanceof Error ? error : new Error(String(error)));
        }
      }, 800); // 800ms delay to see the phase action
      
      return () => {
        console.log(`🧹 Cleaning up timer for ${boardState.phase}`);
        clearTimeout(timer);
        isAdvancingRef.current = false;
      };
    } else {
      console.log(`⏸️ Stopping at ${boardState.phase} phase (interactive)`);
      isAdvancingRef.current = false;
    }
  }, [boardState, engine, localPlayerId, handleError]);
  */



  /**
   * Handles clicks on game zones
   * @param playerId - The player who owns the zone
   * @param zone - The zone that was clicked
   */
  const handleZoneClick = useCallback((playerId: PlayerId, zone: ZoneId) => {
    console.log(`Zone clicked: ${playerId} - ${zone}`);
  }, []);

  /**
   * Executes a game action with error handling
   * @param action - The action function to execute (returns boolean for success)
   * @param actionName - The name of the action for error messages
   */
  const executeAction = useCallback((action: () => boolean, actionName: string) => {
    try {
      const success = action();
      if (!success && onError) {
        onError(new Error(`Failed to execute ${actionName}`));
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [onError]);

  /**
   * Handles card movement from drag-and-drop interactions
   * Validates the move and calls the appropriate game engine method
   * @param cardId - The ID of the card being moved
   * @param fromZone - The zone the card is moving from
   * @param toZone - The zone the card is moving to
   * @param toPlayerId - The player who owns the destination zone
   */
  const handleCardMove = useCallback((cardId: string, fromZone: ZoneId, toZone: ZoneId, toPlayerId: PlayerId) => {
    console.log(`🎯 Card ${cardId} moved from ${fromZone} to ${toZone} for player ${toPlayerId}`);
    console.log('Current phase:', boardState?.phase, 'Active player:', boardState?.activePlayer);
    
    // Validate move is during MAIN phase
    if (boardState?.phase !== Phase.MAIN) {
      console.warn('⚠️ Not in Main Phase - cannot play cards');
      handleError(new Error(`Cannot play cards during ${boardState?.phase} phase. Click "Continue" to reach Main Phase.`));
      return;
    }
    
    // Check if it's the active player
    if (boardState?.activePlayer !== localPlayerId) {
      console.warn('⚠️ Not your turn');
      handleError(new Error('It\'s not your turn!'));
      return;
    }
    
    // Detect HAND → CHARACTER_AREA moves (or STAGE_AREA for stage cards)
    if (fromZone === ZoneId.HAND && (toZone === ZoneId.CHARACTER_AREA || toZone === ZoneId.STAGE_AREA)) {
      console.log(`🎯 GameBoard.handleCardMove: Playing card ${cardId} from ${fromZone} to ${toZone}`);
      
      // Get the card being played to check its cost
      const playerState = localPlayerId === PlayerId.PLAYER_1 
        ? boardState.player1 
        : boardState.player2;
      
      const card = playerState.zones.hand.find(c => c.id === cardId);
      
      if (!card) {
        console.warn('⚠️ Card not found in hand');
        handleError(new Error('Card not found in hand'));
        return;
      }
      
      // Check character area card count before allowing play (if dragging to character area)
      const characterAreaCount = playerState.zones.characterArea.length;
      const isCharacterCard = card.metadata.category === 'CHARACTER';
      
      if (toZone === ZoneId.CHARACTER_AREA && isCharacterCard && characterAreaCount >= 5) {
        const errorMsg = 'Character area is full (5/5). Cannot play more character cards.';
        console.error('❌ handleCardMove:', errorMsg);
        handleError(new Error(errorMsg));
        return;
      }
      
      // Before calling engine.playCard, check active DON count
      const activeDonCount = playerState.zones.costArea.filter(
        don => don.state === 'ACTIVE'
      ).length;
      
      const cardCost = card.cost;
      
      // Display error if insufficient DON before attempting play
      if (activeDonCount < cardCost) {
        const errorMsg = `Insufficient DON! Need ${cardCost} DON but only have ${activeDonCount} active DON.`;
        console.error('❌ handleCardMove:', errorMsg);
        handleError(new Error(errorMsg));
        return;
      }
      
      // Show preview of cost vs available DON
      console.log(`💰 Cost validation: Card costs ${cardCost} DON, you have ${activeDonCount} active DON`);
      
      try {
        // Call engine.playCard() for valid moves
        const success = engine.playCard(localPlayerId, cardId);
        console.log('🎲 GameBoard.handleCardMove: Play card result:', success);
        
        if (!success) {
          // Show error message for invalid moves
          console.warn('⚠️ Cannot play card - card type may be invalid for this zone');
          handleError(new Error('Cannot play this card. It may be the wrong card type for this zone.'));
        } else {
          console.log('✅ GameBoard.handleCardMove: Card played successfully!');
          
          // Show success notification (task 9.1)
          showSuccess(`${card.metadata.name} played successfully!`);
        }
      } catch (error) {
        // Show error message for exceptions
        console.error('❌ GameBoard.handleCardMove: Error playing card:', error);
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    } else {
      console.log(`⏭️ GameBoard.handleCardMove: Skipping - not a valid play (from: ${fromZone}, to: ${toZone})`);
    }
  }, [engine, localPlayerId, boardState, handleError]);

  /**
   * Handles playing a card from hand to the board
   * Validates cost, zone limits, and calls engine.playCard()
   */
  const handlePlayCard = useCallback(() => {
    if (!selectedCardId || !boardState) {
      console.warn('⚠️ No card selected or no board state');
      return;
    }
    
    // Disable action handlers when not in MAIN phase (task 10.3)
    if (boardState.phase !== Phase.MAIN) {
      console.warn('⚠️ Cannot play cards outside of Main Phase');
      handleError(new Error('Cannot play cards outside of Main Phase'));
      return;
    }

    console.log(`🎯 handlePlayCard: Attempting to play card ${selectedCardId}`);
    
    // Get the selected card to check its cost
    const playerState = localPlayerId === PlayerId.PLAYER_1 
      ? boardState.player1 
      : boardState.player2;
    
    const selectedCard = playerState.zones.hand.find(c => c.id === selectedCardId);
    
    if (!selectedCard) {
      console.warn('⚠️ Selected card not found in hand');
      handleError(new Error('Card not found in hand'));
      return;
    }
    
    // Check character area card count before allowing play (if it's a character card)
    const characterAreaCount = playerState.zones.characterArea.length;
    const isCharacterCard = selectedCard.metadata.category === 'CHARACTER';
    
    if (isCharacterCard && characterAreaCount >= 5) {
      const errorMsg = 'Character area is full (5/5). Cannot play more character cards.';
      console.error('❌ handlePlayCard:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    // Before calling engine.playCard, check active DON count
    const activeDonCount = playerState.zones.costArea.filter(
      don => don.state === 'ACTIVE'
    ).length;
    
    const cardCost = selectedCard.cost;
    
    // Display error if insufficient DON before attempting play
    if (activeDonCount < cardCost) {
      const errorMsg = `Insufficient DON! Need ${cardCost} DON but only have ${activeDonCount} active DON.`;
      console.error('❌ handlePlayCard:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    // Show preview of cost vs available DON
    console.log(`💰 Cost validation: Card costs ${cardCost} DON, you have ${activeDonCount} active DON`);
    
    try {
      // Call engine.playCard with currentPlayerId and selectedCardId
      const success = engine.playCard(localPlayerId, selectedCardId);
      
      if (!success) {
        // Show error toast if success is false
        const errorMsg = 'Failed to play card. The card cannot be played at this time.';
        console.error('❌ handlePlayCard: Play failed -', errorMsg);
        handleError(new Error(errorMsg));
      } else {
        // Clear selectedCardId if success is true
        console.log('✅ handlePlayCard: Card played successfully');
        setSelectedCardId(null);
        
        // Show success notification (task 9.1)
        showSuccess(`${selectedCard.metadata.name} played successfully!`);
        
        // Announce action result (task 12.2)
        announce(`${selectedCard.metadata.name} played successfully`);
      }
    } catch (error) {
      // Handle any exceptions thrown by engine.playCard
      console.error('❌ handlePlayCard: Exception thrown -', error);
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [engine, localPlayerId, selectedCardId, boardState, handleError, showSuccess, announce]);

  /**
   * Handles giving DON to a target card
   * @param targetCardId - The ID of the card to receive the DON
   */
  const handleGiveDon = useCallback((targetCardId: string) => {
    if (!selectedCardId) return;
    executeAction(
      () => engine.giveDon(localPlayerId, selectedCardId, targetCardId),
      'give DON'
    );
    setSelectedCardId(null);
  }, [engine, localPlayerId, selectedCardId, executeAction]);

  /**
   * Initiates attack mode for the selected card
   * Queries the engine for valid attack targets and highlights them
   */
  const startAttackMode = useCallback(() => {
    if (!selectedCardId || !boardState) {
      console.warn('⚠️ No card selected or no board state');
      return;
    }
    
    // Disable action handlers when not in MAIN phase (task 10.3)
    if (boardState.phase !== Phase.MAIN) {
      console.warn('⚠️ Cannot attack outside of Main Phase');
      handleError(new Error('Cannot attack outside of Main Phase'));
      return;
    }

    console.log(`🎯 startAttackMode: Starting attack mode with attacker ${selectedCardId}`);
    
    // Get the attacker card to verify its state (task 4.5)
    const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
    const attacker = 
      playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
      (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
        ? playerState.zones.leaderArea 
        : null);
    
    if (!attacker) {
      console.warn('⚠️ Attacker not found');
      handleError(new Error('Selected card is not a valid attacker'));
      return;
    }
    
    // Verify attacker is in ACTIVE state before allowing attack (task 4.5)
    if (attacker.state === 'RESTED') {
      // Show error "Character is rested and cannot attack" if RESTED
      const errorMsg = 'Character is rested and cannot attack';
      console.error('❌ startAttackMode:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    // Query engine for valid attack targets using BattleSystem.getLegalTargets()
    const targets = engine.getLegalAttackTargets(selectedCardId);
    
    // Verify target is valid (opponent's leader or rested character) - handled by engine
    if (targets.length === 0) {
      const errorMsg = 'No valid attack targets available';
      console.error('❌ startAttackMode:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    // Batch state updates together (task 15.3)
    // React 18 automatically batches these, but grouping them improves readability
    React.startTransition(() => {
      setValidTargets(targets);
      setAttackMode(true);
    });
    
    console.log(`✅ Attack mode started with ${targets.length} valid targets:`, targets);
  }, [selectedCardId, boardState, engine, localPlayerId, handleError]);

  /**
   * Cancels attack mode and clears valid targets
   */
  const cancelAttackMode = useCallback(() => {
    console.log('🚫 cancelAttackMode: Canceling attack mode');
    // Batch state updates together (task 15.3)
    React.startTransition(() => {
      setAttackMode(false);
      setValidTargets([]);
    });
  }, []);

  /**
   * Initiates DON attachment mode for the selected character
   * Validates that the character is valid and active DON cards are available
   */
  const startDonAttachMode = useCallback(() => {
    if (!selectedCardId || !boardState) {
      console.warn('⚠️ No card selected or no board state');
      return;
    }
    
    // Disable action handlers when not in MAIN phase (task 10.3)
    if (boardState.phase !== Phase.MAIN) {
      console.warn('⚠️ Cannot attach DON outside of Main Phase');
      handleError(new Error('Cannot attach DON outside of Main Phase'));
      return;
    }

    console.log(`🎯 startDonAttachMode: Starting DON attach mode for character ${selectedCardId}`);
    
    // Get the character card to verify it's valid
    const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
    const character = 
      playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
      (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
        ? playerState.zones.leaderArea 
        : null);
    
    if (!character) {
      console.warn('⚠️ Selected card is not a character or leader');
      handleError(new Error('Selected card must be a character or leader'));
      return;
    }
    
    // Check if player has active DON
    const activeDonCount = playerState.zones.costArea.filter(
      don => don.state === 'ACTIVE'
    ).length;
    
    if (activeDonCount === 0) {
      const errorMsg = 'No active DON cards available';
      console.error('❌ startDonAttachMode:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    // Set DON attach mode to true
    setDonAttachMode(true);
    
    console.log(`✅ DON attach mode started with ${activeDonCount} active DON available`);
  }, [selectedCardId, boardState, localPlayerId, handleError]);

  /**
   * Cancels DON attachment mode and clears selected DON
   */
  const cancelDonAttachMode = useCallback(() => {
    console.log('🚫 cancelDonAttachMode: Canceling DON attach mode');
    // Batch state updates together (task 15.3)
    React.startTransition(() => {
      setDonAttachMode(false);
      setSelectedDonId(null);
    });
  }, []);

  /**
   * Handles attaching a DON card to the selected character
   * Validates DON state and calls engine.giveDon()
   */
  const handleAttachDon = useCallback(() => {
    // Get selectedCardId (character) and selectedDonId from state
    if (!selectedCardId || !selectedDonId || !boardState) {
      console.warn('⚠️ No character or DON selected');
      return;
    }

    console.log(`🎯 handleAttachDon: Attaching DON ${selectedDonId} to character ${selectedCardId}`);
    
    // Get the DON card to validate it's in ACTIVE state
    const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
    const donCard = playerState.zones.costArea.find(c => c.id === selectedDonId);
    
    if (!donCard) {
      console.warn('⚠️ DON card not found in cost area');
      handleError(new Error('DON card not found'));
      return;
    }
    
    // Validate DON is in ACTIVE state
    if (donCard.state !== 'ACTIVE') {
      const errorMsg = 'DON card is rested and cannot be attached';
      console.error('❌ handleAttachDon:', errorMsg);
      handleError(new Error(errorMsg));
      return;
    }
    
    try {
      // Get character name for success message
      const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
      const character = 
        playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
        (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
          ? playerState.zones.leaderArea 
          : null);
      
      // Call engine.giveDon(currentPlayerId, selectedDonId, selectedCardId)
      const success = engine.giveDon(localPlayerId, selectedDonId, selectedCardId);
      
      // Handle ActionResult response
      if (!success) {
        // Show error toast on failure
        const errorMsg = 'Failed to attach DON. The DON cannot be attached at this time.';
        console.error('❌ handleAttachDon: Attach failed -', errorMsg);
        handleError(new Error(errorMsg));
      } else {
        // Exit DON attach mode on success
        console.log('✅ handleAttachDon: DON attached successfully');
        cancelDonAttachMode();
        
        // Clear selections on success
        setSelectedCardId(null);
        
        // Show success notification
        if (character) {
          const message = `DON attached to ${character.metadata.name}! Power increased by 1000`;
          showSuccess(`DON attached to ${character.metadata.name}! Power +1000`);
          announce(message); // Announce action result (task 12.2)
        } else {
          showSuccess('DON attached successfully! Power +1000');
          announce('DON attached successfully! Power increased by 1000'); // Announce action result (task 12.2)
        }
      }
    } catch (error) {
      // Show error toast on failure
      console.error('❌ handleAttachDon: Exception thrown -', error);
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [engine, localPlayerId, selectedCardId, selectedDonId, boardState, cancelDonAttachMode, handleError, showSuccess, announce]);

  /**
   * Handles declaring an attack on a target card
   * Calls engine.declareAttack() and displays battle results
   * @param targetId - The ID of the card being attacked
   */
  const handleDeclareAttack = useCallback((targetId: string) => {
    // Get selectedCardId (attacker) and targetId from parameters
    if (!selectedCardId || !boardState) {
      console.warn('⚠️ No attacker selected');
      return;
    }
    
    // Disable action handlers when not in MAIN phase (task 10.3)
    if (boardState.phase !== Phase.MAIN) {
      console.warn('⚠️ Cannot attack outside of Main Phase');
      handleError(new Error('Cannot attack outside of Main Phase'));
      return;
    }

    console.log(`🎯 handleDeclareAttack: Declaring attack from ${selectedCardId} to ${targetId}`);
    
    // Get attacker and target cards for success message
    const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
    const opponentState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player2 : boardState.player1;
    
    const attacker = 
      playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
      (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
        ? playerState.zones.leaderArea 
        : null);
    
    const target = 
      opponentState.zones.characterArea.find(c => c.id === targetId) ||
      (opponentState.zones.leaderArea && opponentState.zones.leaderArea.id === targetId 
        ? opponentState.zones.leaderArea 
        : null);
    
    try {
      // Call engine.declareAttack(currentPlayerId, selectedCardId, targetId)
      const success = engine.declareAttack(localPlayerId, selectedCardId, targetId);
      
      // Handle ActionResult response
      if (!success) {
        // Show error toast on failure
        const errorMsg = 'Failed to declare attack. The attack may not be valid at this time.';
        console.error('❌ handleDeclareAttack: Attack failed -', errorMsg);
        handleError(new Error(errorMsg));
      } else {
        // Exit attack mode on success
        console.log('✅ handleDeclareAttack: Attack declared successfully');
        
        // Batch state updates together (task 15.3)
        React.startTransition(() => {
          cancelAttackMode();
          setSelectedCardId(null);
          setHighlightedCards([selectedCardId, targetId]);
        });
        
        // Clear highlight after delay
        setTimeout(() => {
          React.startTransition(() => {
            setHighlightedCards([]);
          });
        }, 1000); // Clear highlight after 1 second
        
        // Show success notification with damage info (task 9.2)
        if (attacker && target) {
          const attackerPower = attacker.power;
          const targetPower = target.power;
          const damage = Math.max(0, attackerPower - targetPower);
          
          if (target.metadata.category === 'LEADER') {
            const message = `${attacker.metadata.name} attacked ${target.metadata.name}! Dealt 1 life damage.`;
            showSuccess(message);
            announce(message); // Announce action result (task 12.2)
          } else {
            const message = `${attacker.metadata.name} attacked ${target.metadata.name}! ${attackerPower} power versus ${targetPower} power`;
            showSuccess(`${attacker.metadata.name} attacked ${target.metadata.name}! (${attackerPower} vs ${targetPower})`);
            announce(message); // Announce action result (task 12.2)
          }
        } else {
          showSuccess('Attack successful!');
          announce('Attack successful'); // Announce action result (task 12.2)
        }
      }
    } catch (error) {
      // Show error toast on failure
      console.error('❌ handleDeclareAttack: Exception thrown -', error);
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [engine, localPlayerId, selectedCardId, boardState, cancelAttackMode, handleError, showSuccess, announce]);

  /**
   * Handles card click interactions
   * Manages card selection, attack target selection, and DON selection
   * @param cardId - The ID of the card that was clicked
   */
  const handleCardClick = useCallback((cardId: string) => {
    console.log('Card clicked:', cardId, 'Currently selected:', selectedCardId, 'Attack mode:', attackMode, 'DON attach mode:', donAttachMode);
    
    // Check if in attack mode (task 4.3)
    if (attackMode) {
      // Validate clicked card is in validTargets array
      if (validTargets.includes(cardId)) {
        console.log('✅ Valid target clicked:', cardId);
        // Call handleDeclareAttack(targetId) if valid
        handleDeclareAttack(cardId);
        // Exit attack mode after declaring attack
        cancelAttackMode();
      } else {
        // Show error if invalid target clicked
        console.warn('⚠️ Invalid target clicked:', cardId);
        handleError(new Error('Invalid attack target. You can only attack the opponent\'s leader or rested characters.'));
      }
      return;
    }
    
    // Check if in DON attach mode (task 6.2)
    if (donAttachMode && boardState) {
      const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
      
      // Check if clicked card is a DON card in cost area
      const donCard = playerState.zones.costArea.find(c => c.id === cardId);
      
      if (donCard) {
        // Validate DON is in ACTIVE state
        if (donCard.state !== 'ACTIVE') {
          console.warn('⚠️ DON card is rested');
          handleError(new Error('DON card is rested and cannot be attached'));
          return;
        }
        
        // Store selectedDonId when DON clicked during donAttachMode
        setSelectedDonId(cardId);
        console.log('✅ DON card selected for attachment:', cardId);
        
        // Automatically call handleAttachDon after selecting DON
        // We need to use a timeout to ensure state is updated first
        setTimeout(() => {
          // Call handleAttachDon with the selected DON
          if (!selectedCardId) {
            console.warn('⚠️ No character selected');
            return;
          }

          console.log(`🎯 Auto-attaching DON ${cardId} to character ${selectedCardId}`);
          
          // Get character name for success message
          const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
          const character = 
            playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
            (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
              ? playerState.zones.leaderArea 
              : null);
          
          try {
            // Call engine.giveDon(currentPlayerId, selectedDonId, selectedCardId)
            const success = engine.giveDon(localPlayerId, cardId, selectedCardId);
            
            // Handle ActionResult response
            if (!success) {
              // Show error toast on failure
              const errorMsg = 'Failed to attach DON. The DON cannot be attached at this time.';
              console.error('❌ Auto-attach failed -', errorMsg);
              handleError(new Error(errorMsg));
            } else {
              // Exit DON attach mode on success
              console.log('✅ DON attached successfully');
              cancelDonAttachMode();
              
              // Clear selections on success
              setSelectedCardId(null);
              
              // Show success notification
              if (character) {
                const message = `DON attached to ${character.metadata.name}! Power increased by 1000`;
                showSuccess(`DON attached to ${character.metadata.name}! Power +1000`);
                announce(message); // Announce action result (task 12.2)
              } else {
                showSuccess('DON attached successfully! Power +1000');
                announce('DON attached successfully! Power increased by 1000'); // Announce action result (task 12.2)
              }
            }
          } catch (error) {
            // Show error toast on failure
            console.error('❌ Auto-attach exception -', error);
            handleError(error instanceof Error ? error : new Error(String(error)));
          }
        }, 0);
        
        return;
      }
    }
    
    // Normal card selection logic (not in attack mode or DON attach mode)
    // If clicking the same card, deselect it (handled in subtask 1.3)
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      console.log('Card deselected');
      announce('Card deselected');
    } else {
      // Select the new card
      setSelectedCardId(cardId);
      console.log('Card selected:', cardId);
      
      // Announce card selection with card name (task 12.2)
      if (boardState) {
        const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
        const card = 
          playerState.zones.hand.find(c => c.id === cardId) ||
          playerState.zones.characterArea.find(c => c.id === cardId) ||
          (playerState.zones.leaderArea && playerState.zones.leaderArea.id === cardId 
            ? playerState.zones.leaderArea 
            : null);
        
        if (card) {
          announce(`${card.metadata.name} selected. Cost ${card.cost}, Power ${card.power}`);
        } else {
          announce('Card selected');
        }
      }
    }
  }, [selectedCardId, attackMode, donAttachMode, validTargets, boardState, localPlayerId, handleDeclareAttack, cancelAttackMode, handleError, announce, engine, cancelDonAttachMode, showSuccess]);

  /**
   * Handles action button clicks from the ActionPanel
   * Routes to the appropriate handler based on action type
   * @param action - The action type to execute (PLAY_CARD, ATTACK, ATTACH_DON)
   */
  const handleAction = useCallback((action: Action) => {
    console.log('Action triggered:', action, 'for card:', selectedCardId);
    
    if (!selectedCardId) {
      console.warn('No card selected');
      return;
    }

    switch (action) {
      case 'PLAY_CARD':
        handlePlayCard();
        break;
      case 'ATTACK':
        // Start attack mode (task 4.2)
        startAttackMode();
        break;
      case 'ATTACH_DON':
        // Start DON attach mode (task 6)
        startDonAttachMode();
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, [selectedCardId, handlePlayCard, startAttackMode, startDonAttachMode]);

  // Handle keyboard navigation (task 11.1 and 11.2)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!boardState || boardState.activePlayer !== localPlayerId) return;

      const playerState = localPlayerId === PlayerId.PLAYER_1 ? boardState.player1 : boardState.player2;
      const handCards = playerState.zones.hand;
      const characterCards = playerState.zones.characterArea;
      const allInteractiveCards = [...handCards, ...characterCards];

      // Escape key to cancel attack mode (task 11.2)
      if (event.key === 'Escape') {
        if (attackMode) {
          cancelAttackMode();
          event.preventDefault();
        } else if (donAttachMode) {
          cancelDonAttachMode();
          event.preventDefault();
        } else if (selectedCardId) {
          setSelectedCardId(null);
          setFocusedCardId(null);
          event.preventDefault();
        }
        return;
      }

      // Tab key to cycle through cards in hand (task 11.1)
      if (event.key === 'Tab' && handCards.length > 0) {
        event.preventDefault();
        
        const currentIndex = focusedCardId 
          ? handCards.findIndex(c => c.id === focusedCardId)
          : -1;
        
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? handCards.length - 1 : currentIndex - 1)
          : (currentIndex >= handCards.length - 1 ? 0 : currentIndex + 1);
        
        setFocusedCardId(handCards[nextIndex].id);
        return;
      }

      // Arrow keys to navigate between cards (task 11.2)
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && allInteractiveCards.length > 0) {
        event.preventDefault();
        
        const currentIndex = focusedCardId 
          ? allInteractiveCards.findIndex(c => c.id === focusedCardId)
          : -1;
        
        const nextIndex = event.key === 'ArrowLeft'
          ? (currentIndex <= 0 ? allInteractiveCards.length - 1 : currentIndex - 1)
          : (currentIndex >= allInteractiveCards.length - 1 ? 0 : currentIndex + 1);
        
        setFocusedCardId(allInteractiveCards[nextIndex].id);
        return;
      }

      // Enter key to select/deselect focused card (task 11.2)
      if (event.key === 'Enter' && focusedCardId) {
        event.preventDefault();
        handleCardClick(focusedCardId);
        return;
      }

      // Space key to execute primary action (task 11.2)
      if (event.key === ' ' && selectedCardId && boardState.phase === Phase.MAIN) {
        event.preventDefault();
        
        const selectedCard = 
          playerState.zones.hand.find(c => c.id === selectedCardId) ||
          playerState.zones.characterArea.find(c => c.id === selectedCardId) ||
          (playerState.zones.leaderArea && playerState.zones.leaderArea.id === selectedCardId 
            ? playerState.zones.leaderArea 
            : null);
        
        if (!selectedCard) return;
        
        const availableActions = getAvailableActions(selectedCard, boardState, boardState.phase, localPlayerId);
        
        // Execute the first available action
        if (availableActions.length > 0) {
          handleAction(availableActions[0]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState, localPlayerId, focusedCardId, selectedCardId, attackMode, donAttachMode, cancelAttackMode, cancelDonAttachMode, handleAction, handleCardClick]);

  /**
   * Gets the list of action buttons to display based on current game state
   * @returns Array of action button configurations
   */
  const getActionButtons = useCallback((): ActionButton[] => {
    if (!boardState || !engine.isGameSetup()) {
      return [];
    }

    const buttons: ActionButton[] = [];
    const isActivePlayer = boardState.activePlayer === localPlayerId;
    const isMainPhase = boardState.phase === Phase.MAIN;

    // Continue/Next Phase button (for all phases - manual control)
    if (isActivePlayer) {
      const getButtonLabel = () => {
        switch (boardState.phase) {
          case Phase.REFRESH:
            return 'Next Phase (Draw)';
          case Phase.DRAW:
            return 'Next Phase (DON)';
          case Phase.DON_PHASE:
            return 'Next Phase (Main)';
          case Phase.MAIN:
            return 'End Main Phase';
          case Phase.END:
            return 'End Turn';
          default:
            return 'Next Phase';
        }
      };
      
      buttons.push({
        id: 'continue',
        label: getButtonLabel(),
        action: async () => {
          try {
            console.log(`🎯 Manual advance from ${boardState.phase} phase...`);
            const result = engine.advancePhase();
            // If result is a promise (AI player), wait for it
            if (result instanceof Promise) {
              await result;
            }
            console.log(`✅ Advanced to next phase`);
          } catch (error) {
            console.error('Failed to advance phase:', error);
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        },
        enabled: true,
        variant: 'primary',
      });
    }

    // Pass Priority button
    if (isActivePlayer) {
      buttons.push({
        id: 'pass-priority',
        label: 'Pass Priority',
        action: () => {
          console.log('Pass priority');
        },
        enabled: true,
        variant: 'secondary',
      });
    }

    return buttons;
  }, [boardState, engine, localPlayerId, onError]);

  /**
   * Converts a phase enum to a human-readable display name
   * @param phase - The phase enum value
   * @returns The display name for the phase
   */
  const getPhaseDisplayName = (phase: Phase): string => {
    const phaseNames: Record<Phase, string> = {
      [Phase.REFRESH]: 'Refresh Phase',
      [Phase.DRAW]: 'Draw Phase',
      [Phase.DON_PHASE]: 'DON Phase',
      [Phase.MAIN]: 'Main Phase',
      [Phase.END]: 'End Phase',
    };
    return phaseNames[phase] || phase;
  };

  /**
   * Gets display information for a player
   * @param playerId - The player ID to get info for
   * @returns Player display information including name, counts, and active status
   */
  const getPlayerInfo = (playerId: PlayerId) => {
    if (!boardState) return null;

    const playerState = playerId === PlayerId.PLAYER_1 
      ? boardState.player1 
      : boardState.player2;

    return {
      name: playerId === localPlayerId ? 'You' : 'Opponent',
      deckCount: playerState.zones.deck.length,
      handCount: playerState.zones.hand.length,
      lifeCount: playerState.zones.life.length,
      donCount: playerState.zones.costArea.filter(d => d.state === 'ACTIVE').length,
      isActive: boardState.activePlayer === playerId,
    };
  };

  if (!boardState) {
    console.log('⚠️ GameBoard: No board state yet, showing loading...');
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  console.log('✅ GameBoard: Rendering with board state:', {
    p1Deck: boardState.player1.zones.deck.length,
    p1Hand: boardState.player1.zones.hand.length,
  });

  const actionButtons = getActionButtons();
  const player1Info = getPlayerInfo(PlayerId.PLAYER_1);
  const player2Info = getPlayerInfo(PlayerId.PLAYER_2);

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Three.js Game Scene */}
      <GameScene
        engine={engine}
        renderingInterface={renderingInterface}
        boardState={boardState}
        onCardClick={handleCardClick}
        onZoneClick={handleZoneClick}
        onCardMove={handleCardMove}
        selectedCardId={selectedCardId}
        attackMode={attackMode}
        validTargets={validTargets}
        donAttachMode={donAttachMode}
        selectedDonId={selectedDonId}
        highlightedCards={highlightedCards}
        focusedCardId={focusedCardId}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Bar - Opponent Info */}
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-white font-bold text-lg">
                  {player2Info?.name}
                  {player2Info?.isActive && (
                    <span className="ml-2 text-green-400 text-sm">(Active)</span>
                  )}
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="text-gray-300">
                    Deck: <span className="text-white font-semibold">{player2Info?.deckCount}</span>
                  </div>
                  <div className="text-gray-300">
                    Hand: <span className="text-white font-semibold">{player2Info?.handCount}</span>
                  </div>
                  <div className="text-gray-300">
                    Life: <span className="text-red-400 font-semibold">{player2Info?.lifeCount}</span>
                  </div>
                  <div className="text-gray-300">
                    DON: <span className="text-purple-400 font-semibold">{player2Info?.donCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Center - Phase and Turn Info with Continue Button */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className={`bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border-2 ${
            boardState.activePlayer === localPlayerId ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">Turn {boardState.turnNumber}</div>
                <div className={`font-bold text-lg mb-1 ${
                  boardState.activePlayer === localPlayerId ? 'text-green-400' : 'text-red-400'
                }`}>
                  {boardState.activePlayer === PlayerId.PLAYER_1 ? 'Player 1' : 'Player 2'}&apos;s Turn
                </div>
                <div className="text-white font-semibold text-base">
                  {getPhaseDisplayName(boardState.phase)}
                </div>
                {boardState.activePlayer === localPlayerId && (
                  <div className="text-xs text-green-400 mt-1">
                    ✓ Your turn
                  </div>
                )}
                {boardState.activePlayer !== localPlayerId && (
                  <div className="text-xs text-red-400 mt-1">
                    ⏳ Opponent&apos;s turn
                  </div>
                )}
                {boardState.gameOver && (
                  <div className="mt-2 text-yellow-400 font-semibold text-sm">
                    Game Over
                    {boardState.winner && (
                      <div className="text-xs mt-1">
                        Winner: {boardState.winner === localPlayerId ? 'You' : 'Opponent'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Continue Button */}
              {!boardState.gameOver && boardState.activePlayer === localPlayerId && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => {
                      try {
                        console.log('Advancing to next phase...');
                        engine.advancePhase();
                      } catch (error) {
                        console.error('Failed to advance phase:', error);
                        handleError(error instanceof Error ? error : new Error(String(error)));
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                  >
                    {boardState.phase === Phase.MAIN ? 'End Main Phase' : 'Next Phase'}
                  </button>
                  {boardState.phase !== Phase.MAIN && (
                    <div className="text-xs text-gray-400">
                      Click to reach Main Phase
                    </div>
                  )}
                  {boardState.phase === Phase.MAIN && (
                    <div className="text-xs text-green-400">
                      ✓ You can play cards now!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar - Local Player Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-white font-bold text-lg">
                  {player1Info?.name}
                  {player1Info?.isActive && (
                    <span className="ml-2 text-green-400 text-sm">(Active)</span>
                  )}
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="text-gray-300">
                    Deck: <span className="text-white font-semibold">{player1Info?.deckCount}</span>
                  </div>
                  <div className="text-gray-300">
                    Hand: <span className="text-white font-semibold">{player1Info?.handCount}</span>
                  </div>
                  <div className="text-gray-300">
                    Life: <span className="text-red-400 font-semibold">{player1Info?.lifeCount}</span>
                  </div>
                  <div className="text-gray-300">
                    DON: <span className="text-purple-400 font-semibold">{player1Info?.donCount}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side - Action Panel */}
        {selectedCardId && boardState.activePlayer === localPlayerId && boardState.phase === Phase.MAIN && (() => {
          // Get the selected card from board state
          const selectedCard = 
            boardState.player1.zones.hand.find(c => c.id === selectedCardId) ||
            boardState.player1.zones.characterArea.find(c => c.id === selectedCardId) ||
            (boardState.player1.zones.leaderArea && boardState.player1.zones.leaderArea.id === selectedCardId 
              ? boardState.player1.zones.leaderArea 
              : null);
          
          if (!selectedCard) return null;
          
          const availableActions = getAvailableActions(selectedCard, boardState, boardState.phase, localPlayerId);
          
          return (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
              <ActionPanel
                selectedCard={selectedCard}
                availableActions={availableActions}
                onAction={handleAction}
                phase={boardState.phase}
              />
            </div>
          );
        })()}

        {/* Right Side - Legal Actions Panel (below action panel) */}
        {legalActions.length > 0 && boardState.activePlayer === localPlayerId && (
          <div className="absolute right-4 bottom-24 pointer-events-auto">
            <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl max-w-xs">
              <div className="text-white font-semibold mb-3">Available Actions</div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {legalActions.slice(0, 10).map((action, index) => (
                  <div
                    key={index}
                    className="bg-gray-700/50 rounded p-2 text-sm text-gray-300"
                  >
                    <div className="font-medium text-white">
                      {action.type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {JSON.stringify(action).slice(0, 50)}...
                    </div>
                  </div>
                ))}
                {legalActions.length > 10 && (
                  <div className="text-gray-400 text-xs text-center">
                    +{legalActions.length - 10} more actions
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Left Side - Effect Log Panel (task 45: Display effect log) */}
        {effectLog.length > 0 && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
            <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 shadow-xl max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Effect Log</div>
                <button
                  onClick={() => setEffectLog([])}
                  className="text-gray-400 hover:text-white text-xs"
                  aria-label="Clear effect log"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {effectLog.map((entry: { id: string; message: string; timestamp: number }, index: number) => (
                  <div
                    key={`${entry.id}-${index}`}
                    className="bg-gray-700/50 rounded p-2 text-sm text-gray-300 animate-fade-in"
                  >
                    <div className="font-medium text-white break-words">
                      {entry.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Card Actions removed - using drag and drop instead */}
      </div>

      {/* Error Toast - using ErrorToast component (task 8.1) */}
      <ErrorToast
        message={errorMessage}
        visible={!!errorMessage}
        onDismiss={() => setErrorMessage(null)}
      />

      {/* Success Toast - using SuccessToast component (task 9) */}
      <SuccessToast
        message={successMessage}
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />

      {/* Screen reader announcement region (task 12.2) */}
      <div
        className="absolute left-[-10000px] w-[1px] h-[1px] overflow-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
}
