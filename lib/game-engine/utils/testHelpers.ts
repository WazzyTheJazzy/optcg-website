/**
 * Test helper utilities for creating test data
 */

import {
  CardInstance,
  CardDefinition,
  DonInstance,
  PlayerId,
  CardCategory,
  CardState,
  ZoneId,
  EffectTimingType,
  TriggerTiming,
} from '../core/types';

/**
 * Create a test card instance with sensible defaults
 */
export function createTestCard(options: {
  id: string;
  name: string;
  category: CardCategory;
  basePower?: number | null;
  baseCost?: number | null;
  lifeValue?: number | null;
  counterValue?: number | null;
  controller: PlayerId;
  zone: ZoneId;
  state: CardState;
  keywords?: string[];
  colors?: string[];
}): CardInstance {
  const definition: CardDefinition = {
    id: `def-${options.id}`,
    name: options.name,
    category: options.category,
    colors: options.colors || ['Red'],
    typeTags: [],
    attributes: [],
    basePower: options.basePower ?? null,
    baseCost: options.baseCost ?? null,
    lifeValue: options.lifeValue ?? null,
    counterValue: options.counterValue ?? null,
    rarity: 'C',
    keywords: options.keywords || [],
    effects: [],
    imageUrl: '',
    metadata: {
      setCode: 'TEST',
      cardNumber: '001',
      isAltArt: false,
      isPromo: false,
    },
  };

  return {
    id: options.id,
    definition,
    owner: options.controller,
    controller: options.controller,
    zone: options.zone,
    state: options.state,
    givenDon: [],
    modifiers: [],
    flags: new Map(),
  };
}

/**
 * Create a test DON instance
 */
export function createTestDon(options: {
  id: string;
  owner: PlayerId;
  zone: ZoneId;
  state: CardState;
}): DonInstance {
  return {
    id: options.id,
    owner: options.owner,
    zone: options.zone,
    state: options.state,
  };
}
