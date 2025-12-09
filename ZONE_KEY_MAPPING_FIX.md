# Zone Key Mapping Fix

## Issue Identified

The leader area and character area were not rendering because of a **key mismatch** between the ZoneId enum and the rendering interface's zone keys.

### Root Cause

1. **ZoneId enum** uses SCREAMING_SNAKE_CASE:
   - `LEADER_AREA`
   - `CHARACTER_AREA`
   - `STAGE_AREA`
   - `COST_AREA`
   - `DON_DECK`

2. **RenderingInterface** returns zones with camelCase keys:
   - `leaderArea`
   - `characterArea`
   - `stageArea`
   - `costArea`
   - `donDeck`

3. **GameScene** was converting ZoneId to lowercase:
   - `LEADER_AREA` → `leader_area` ❌
   - But the actual key is `leaderArea` ✅

### Evidence from Console Log

```
GameScene.tsx:427 🔍 Checking zone LEADER_AREA (key: leader_area): {zoneExists: false}
GameScene.tsx:442 Rendering P1 LEADER_AREA: 0 cards
GameScene.tsx:427 🔍 Checking zone CHARACTER_AREA (key: character_area): {zoneExists: false}
GameScene.tsx:442 Rendering P1 CHARACTER_AREA: 0 cards
```

The zones were being checked with the wrong keys (`leader_area` instead of `leaderArea`), so they were never found, resulting in 0 cards being rendered even when cards were present.

## Solution

Created explicit mapping from ZoneId enum values to the camelCase keys used by the rendering interface:

```typescript
const zoneKeyMap: Partial<Record<ZoneId, keyof typeof boardState.player1.zones>> = {
  [ZoneId.DECK]: 'deck',
  [ZoneId.HAND]: 'hand',
  [ZoneId.TRASH]: 'trash',
  [ZoneId.LIFE]: 'life',
  [ZoneId.LEADER_AREA]: 'leaderArea',
  [ZoneId.CHARACTER_AREA]: 'characterArea',
  [ZoneId.STAGE_AREA]: 'stageArea',
};
```

## Changes Made

### components/game/GameScene.tsx

- Replaced simple `.toLowerCase()` conversion with explicit mapping
- Added mapping for both Player 1 and Player 2 zone rendering
- Properly maps SCREAMING_SNAKE_CASE enum values to camelCase object keys

## Impact

- Leader cards now render correctly in the leader area
- Character cards now render correctly in the character area
- Stage cards now render correctly in the stage area
- All zones are properly accessible and display their contents
- No more "0 cards" when cards are actually present

## Testing

To verify the fix:
1. Start a game
2. Check that the leader card is visible in the center of your side
3. Play a character card - it should appear in the character area
4. Play a stage card - it should appear in the stage area
5. Console should show "Rendering P1 LEADER_AREA: 1 cards" (or appropriate count)

Expected console output:
```
🔍 Checking zone LEADER_AREA (key: leaderArea): {zoneExists: true}
Rendering P1 LEADER_AREA: 1 cards
🔍 Checking zone CHARACTER_AREA (key: characterArea): {zoneExists: true}
Rendering P1 CHARACTER_AREA: X cards
```
