# TypeScript Errors Fix Documentation

## Overview
This document tracks the 14+ TypeScript errors found in the codebase and their fixes.

## Error Categories

### 1. Test Mock Type Issues (1 error)
**File**: `app/api/image-proxy/route.test.ts:11`
- **Error**: Mock type not assignable to fetch function type
- **Fix**: Update mock type definition to match fetch signature

### 2. Enum Comparison Issues (2 errors)
**Files**: `components/game/DonMesh.test.tsx:439, 452`
- **Error**: Comparing CardState.ACTIVE with CardState.RESTED (no overlap)
- **Fix**: Fix test logic to use correct state comparisons

### 3. CardDefinition Type Issues (3 errors)
**Files**: `components/game/GameBoard.integration.test.tsx:24, 44, 64`
- **Error**: 'cost' property doesn't exist on CardDefinition type
- **Fix**: Remove or update 'cost' property in test data

### 4. Three.js API Issues (8 errors)
**Files**: Multiple GameScene and component test files
- **Error**: Various Three.js type mismatches (Color, Fog, shadow types, material properties)
- **Fix**: Update to match current Three.js API

### 5. Phase Enum Issues (2 errors)
**Files**: `components/game/PhaseTransition.tsx:78, 143`
- **Error**: Property 'DON' doesn't exist on Phase enum
- **Fix**: Use correct Phase enum value

### 6. Material Property Issues (2 errors)
**Files**: `components/game/PhaseTransition.tsx:132, 163`
- **Error**: MeshBasicMaterial doesn't have emissive properties
- **Fix**: Use MeshStandardMaterial or remove emissive properties

### 7. Duplicate Type Properties (4 errors)
**Files**: `lib/game-engine/phases/EventEmission.test.ts`, `PhaseManager.test.ts`
- **Error**: 'type' property specified more than once
- **Fix**: Remove duplicate type properties in test objects

### 8. TextureCache Access Issues (7 errors)
**Files**: `lib/game-engine/rendering/Performance.integration.test.ts`, `PerformanceOptimizer.ts`, `TextureCache.ts`
- **Error**: Private constructor, missing properties, type mismatches
- **Fix**: Update TextureCache API usage and type definitions

### 9. BoardVisualState Type Issues (3 errors)
**Files**: `components/game/VisualEnvironment.integration.test.tsx:634, 681, 724`
- **Error**: Missing required properties (activePlayer, phase, turnNumber, gameOver, winner)
- **Fix**: Add missing properties to test data

## Total Errors: 32 (not 14 as initially stated)

## Fix Priority
1. High: Production code errors (PhaseTransition.tsx, TextureCache.ts, PerformanceOptimizer.ts)
2. Medium: Test infrastructure (mock types, test data)
3. Low: Test-only type issues

## Status
- [x] All errors identified
- [x] Fixes applied
- [x] TypeScript compilation successful
- [x] Documentation updated

## Summary of Fixes Applied

### Production Code Fixes
1. **PhaseTransition.tsx** - Fixed Phase enum references (DON → DON_PHASE) and removed emissive properties from MeshBasicMaterial
2. **TextureCache.ts** - Added proper type guards for magFilter, added `size` property to stats, added `set()` method for testing
3. **PerformanceOptimizer.ts** - Changed to use TextureCache.getInstance() instead of constructor

### Test Code Fixes
1. **DonMesh.test.tsx** - Fixed CardState comparison logic using helper function
2. **GameBoard.integration.test.tsx** - Updated CardDefinition test data to match proper interface
3. **GameScene.background.test.tsx** - Fixed getHSL() calls to use proper Three.js API, fixed RenderingInterface constructor
4. **GameScene.shadows.test.tsx** - Added type assertions for shadow map type assignment
5. **VisualEnvironment.integration.test.tsx** - Added Phase import, fixed RenderingInterface constructor, added missing BoardVisualState properties, used type assertions for complex test data
6. **EventEmission.test.ts** - Renamed duplicate 'type' properties to 'eventType'
7. **PhaseManager.test.ts** - Renamed duplicate 'type' properties to 'eventType'
8. **Performance.integration.test.ts** - Fixed TextureCache usage, fixed PerformanceMonitor method calls
9. **image-proxy/route.test.ts** - Added type assertion for global.fetch mock

## All TypeScript Errors Resolved ✓
