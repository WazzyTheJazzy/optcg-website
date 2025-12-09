# Requirements Document

## Introduction

After implementing the card image rendering feature, cards are displaying as blank colored rectangles instead of showing their actual images. The system has the imageUrl data in the database, the CardImageLoader is implemented, and the image proxy is configured, but the textures are not being applied to the card meshes in the 3D view. This specification addresses the root cause of this rendering issue.

## Glossary

- **CardMesh**: The Three.js React component responsible for rendering individual cards in 3D space
- **CardImageLoader**: Utility class for loading and caching card image textures
- **Texture**: Three.js object representing an image applied to a 3D surface
- **Material**: Three.js object that defines how a surface appears (color, texture, etc.)
- **ImageProxy**: Server-side endpoint that fetches external images to avoid CORS issues
- **Console Logging**: Browser developer tools output for debugging

## Requirements

### Requirement 1: Diagnostic Logging

**User Story:** As a developer, I want detailed logging of the image loading process, so that I can identify where the rendering pipeline is failing.

#### Acceptance Criteria

1. WHEN CardMesh attempts to load an image, THE System SHALL log the imageUrl being requested
2. WHEN CardImageLoader receives a load request, THE System SHALL log whether the URL is external or local
3. WHEN the image proxy is used, THE System SHALL log the proxied URL
4. WHEN a texture load succeeds, THE System SHALL log the success with card details
5. WHEN a texture load fails, THE System SHALL log the error with full context

### Requirement 2: Texture Application Verification

**User Story:** As a developer, I want to verify that loaded textures are being correctly applied to card materials, so that I can ensure the rendering pipeline is complete.

#### Acceptance Criteria

1. WHEN a texture is loaded successfully, THE System SHALL verify the texture object is not null
2. WHEN applying a texture to a material, THE System SHALL log the application
3. WHEN a card is face-up, THE System SHALL apply the loaded texture to the material
4. WHEN a card is face-down, THE System SHALL not apply the card texture
5. WHEN a texture fails to load, THE System SHALL apply the placeholder texture

### Requirement 3: Image URL Propagation Check

**User Story:** As a developer, I want to verify that imageUrl is correctly propagating from the database through the game engine to the rendering layer, so that I can identify data flow issues.

#### Acceptance Criteria

1. WHEN a card is loaded from the database, THE System SHALL include the imageUrl field
2. WHEN CardDefinition is created, THE System SHALL preserve the imageUrl
3. WHEN CardVisualState is created, THE System SHALL include imageUrl in metadata
4. WHEN CardMesh receives cardState, THE System SHALL have access to metadata.imageUrl
5. WHEN imageUrl is missing at any stage, THE System SHALL log a warning with the stage name

### Requirement 4: Browser Console Error Detection

**User Story:** As a developer, I want to identify any browser console errors related to image loading, so that I can fix CORS, network, or other client-side issues.

#### Acceptance Criteria

1. WHEN the browser attempts to load an image, THE System SHALL log any CORS errors
2. WHEN the image proxy returns an error, THE System SHALL log the HTTP status code
3. WHEN Three.js fails to create a texture, THE System SHALL log the Three.js error
4. WHEN network requests fail, THE System SHALL log the network error details
5. WHEN timeouts occur, THE System SHALL log the timeout with the URL

### Requirement 5: Material Configuration Verification

**User Story:** As a developer, I want to verify that card materials are correctly configured to display textures, so that I can ensure rendering settings are correct.

#### Acceptance Criteria

1. WHEN a material is created, THE System SHALL set the map property to the texture
2. WHEN a texture is applied, THE System SHALL set needsUpdate to true
3. WHEN a card is face-up with a texture, THE System SHALL set material color to white (#ffffff)
4. WHEN a card is face-down, THE System SHALL not set the map property
5. WHEN material properties change, THE System SHALL trigger a re-render

### Requirement 6: Fallback Behavior Verification

**User Story:** As a developer, I want to verify that the placeholder fallback is working correctly, so that I can distinguish between texture loading failures and texture application failures.

#### Acceptance Criteria

1. WHEN imageUrl is empty or null, THE System SHALL generate a placeholder immediately
2. WHEN image loading fails, THE System SHALL generate a placeholder with error indicator
3. WHEN a placeholder is generated, THE System SHALL log the reason for fallback
4. WHEN a placeholder texture is created, THE System SHALL apply it to the material
5. WHEN a placeholder is displayed, THE System SHALL show card name and stats

### Requirement 7: Fix Implementation

**User Story:** As a player, I want to see actual card images in the game, so that I can identify cards by their official artwork.

#### Acceptance Criteria

1. WHEN a card has a valid imageUrl, THE System SHALL display the actual card image
2. WHEN a card image loads successfully, THE System SHALL apply it to the card mesh
3. WHEN multiple cards share the same image, THE System SHALL reuse the cached texture
4. WHEN a card is moved or updated, THE System SHALL maintain the loaded texture
5. WHEN the game loads, THE System SHALL display card images within 2 seconds for local images and 5 seconds for external images
