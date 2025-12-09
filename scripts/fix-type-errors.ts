/**
 * Script to fix TypeScript errors in AI test files
 */

import * as fs from 'fs';
import * as path from 'path';

const fixes = [
  // Fix 1: Replace turnCount with turnNumber
  {
    pattern: /turnCount:/g,
    replacement: 'turnNumber:',
    files: ['lib/game-engine/ai/**/*.test.ts']
  },
  
  // Fix 2: Add controller property to CardInstance mocks
  {
    pattern: /(owner: PlayerId\.\w+,)\n(\s+state: CardState)/g,
    replacement: '$1\n        controller: $1.split(\': \')[1].replace(\',\', \'\'),\n$2',
    files: ['lib/game-engine/ai/**/*.test.ts']
  },
  
  // Fix 3: Replace ActionType.PASS with ActionType.PASS_PRIORITY
  {
    pattern: /ActionType\.PASS(?!_PRIORITY)/g,
    replacement: 'ActionType.PASS_PRIORITY',
    files: ['lib/game-engine/ai/**/*.test.ts']
  },
  
  // Fix 4: Remove attachedDon property (doesn't exist in CardInstance)
  {
    pattern: /attachedDon: \[.*?\],?\n/g,
    replacement: '',
    files: ['lib/game-engine/ai/**/*.test.ts']
  },
  
  // Fix 5: Add timestamp to GameAction mocks
  {
    pattern: /type: ActionType\.\w+,\n\s+playerId: PlayerId\.\w+,\n\s+data: \{/g,
    replacement: (match: string) => match.replace('data: {', 'timestamp: Date.now(),\n      data: {'),
    files: ['lib/game-engine/ai/**/*.test.ts']
  },
];

console.log('This script would fix type errors, but needs manual implementation');
console.log('Please use the strReplace tool for each fix individually');
