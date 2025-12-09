# Requirements Document

## Introduction

This specification addresses the critical issue where card images from the database are not being displayed in the 3D game view. Currently, the CardMesh component generates placeholder textures instead of loading actual card images, resulting in a poor visual experience. The system has 1665 cards with imageUrl data in the database, but this data is not being utilized by the rendering pipeline.

## Glossary

- **CardMesh**: The Three.js React component responsible for rendering individual cards in 3D space
- **RenderingInterface**: The system that transforms game state into visual representations
- **CardVisualState**: The data structure containing card information for rendering
- **TextureLoader**: Three.js utility for loading image textures
- **ImageProxy**: A server-side endpoint that fetches external images to avoid CORS issues
- **Placeholder**: A dynamically generated canvas-based card representation used as fallback
- **CORS**: Cross-Origin Resource Sharing - browser security that blocks loading external images

## Requirements

### Requirement 1: Image URL Propagation

**User Story:** As a player, I want to see actual card artwork in the game, so that I can easily identify cards by their official images.

#### Acceptance Criteria

1. WHEN THE RenderingInterface transforms game state, THE System SHALL include the imageUrl field in CardVisualState
2. WHEN CardVisualState is created, THE System SHALL preserve the imageUrl from CardDefinition metadata
3. WHEN CardMesh receives CardVisualState, THE System SHALL access the imageUrl property for texture loading
4. WHEN imageUrl is missing or null, THE System SHALL use the placeholder generation as fallback
5. WHEN imageUrl is provided, THE System SHALL attempt to load the actual image before falling back to placeholder

### Requirement 2: Image Loading Strategy

**User Story:** As a player, I want card images to load reliably from various sources, so that I see consistent card artwork regardless of where images are hosted.

#### Acceptance Criteria

1. WHEN imageUrl starts with "http" or "https", THE System SHALL route the request through the image proxy API
2. WHEN imageUrl starts with "/", THE System SHALL load the image directly as a local resource
3. WHEN image loading fails, THE System SHALL log the error and fall back to placeholder generation
4. WHEN image loading succeeds, THE System SHALL apply the texture to the card mesh
5. WHEN multiple cards use the same imageUrl, THE System SHALL cache the loaded texture to avoid redundant requests

### Requirement 3: Image Proxy Implementation

**User Story:** As a developer, I want external card images to load without CORS errors, so that players can see artwork from third-party sources.

#### Acceptance Criteria

1. WHEN a request is made to /api/image-proxy, THE System SHALL accept a "url" query parameter
2. WHEN the proxy receives a valid URL, THE System SHALL fetch the image from the external source
3. WHEN the external fetch succeeds, THE System SHALL return the image with appropriate headers
4. WHEN the external fetch fails, THE System SHALL return a 404 status with error details
5. WHEN the proxy returns an image, THE System SHALL set cache headers to improve performance

### Requirement 4: Placeholder Fallback Enhancement

**User Story:** As a player, I want to see informative placeholder cards when images fail to load, so that I can still identify cards by their stats and names.

#### Acceptance Criteria

1. WHEN image loading fails or imageUrl is missing, THE System SHALL generate a canvas-based placeholder
2. WHEN generating a placeholder, THE System SHALL include card name, type, power, and cost
3. WHEN generating a placeholder, THE System SHALL use color-coding based on card category
4. WHEN a placeholder is displayed, THE System SHALL maintain the same dimensions as real card images
5. WHEN a placeholder is generated, THE System SHALL log a warning for debugging purposes

### Requirement 5: Texture Caching

**User Story:** As a player, I want card images to load quickly when the same card appears multiple times, so that the game performs smoothly.

#### Acceptance Criteria

1. WHEN an image is successfully loaded, THE System SHALL store the texture in a cache keyed by imageUrl
2. WHEN a card requests an image that exists in cache, THE System SHALL reuse the cached texture
3. WHEN the cache exceeds 100 textures, THE System SHALL remove the least recently used textures
4. WHEN a texture is removed from cache, THE System SHALL dispose of the Three.js texture object
5. WHEN the component unmounts, THE System SHALL clean up any textures it created

### Requirement 6: Loading States

**User Story:** As a player, I want visual feedback while card images are loading, so that I know the system is working.

#### Acceptance Criteria

1. WHEN a card begins loading an image, THE System SHALL display a loading indicator or placeholder
2. WHEN image loading completes successfully, THE System SHALL smoothly transition to the loaded image
3. WHEN image loading fails, THE System SHALL display the placeholder without flickering
4. WHEN multiple cards are loading simultaneously, THE System SHALL handle each independently
5. WHEN a card is removed before its image loads, THE System SHALL cancel the loading operation

### Requirement 7: Error Handling and Logging

**User Story:** As a developer, I want detailed logging of image loading issues, so that I can diagnose and fix problems quickly.

#### Acceptance Criteria

1. WHEN an image fails to load, THE System SHALL log the imageUrl and error message
2. WHEN the image proxy fails, THE System SHALL log the external URL and HTTP status
3. WHEN a placeholder is used, THE System SHALL log the reason for fallback
4. WHEN texture caching occurs, THE System SHALL log cache hits and misses at debug level
5. WHEN CORS errors occur, THE System SHALL provide actionable error messages

### Requirement 8: Performance Optimization

**User Story:** As a player, I want the game to run smoothly even with many cards visible, so that I can enjoy a responsive gaming experience.

#### Acceptance Criteria

1. WHEN loading textures, THE System SHALL use appropriate texture filtering (LinearFilter)
2. WHEN generating placeholders, THE System SHALL reuse canvas contexts where possible
3. WHEN cards are far from camera, THE System SHALL use lower resolution textures via LOD
4. WHEN textures are no longer needed, THE System SHALL dispose of them to free memory
5. WHEN multiple cards share an image, THE System SHALL load the image only once
