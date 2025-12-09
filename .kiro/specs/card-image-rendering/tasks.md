# Implementation Plan

- [x] 1. Create PlaceholderGenerator utility





  - Extract placeholder generation logic from CardMesh into reusable utility class
  - Add support for error state indicators
  - Create unit tests for different card types and states
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Create CardImageLoader utility





  - [x] 2.1 Implement core texture loading with Three.js TextureLoader


    - Create CardImageLoader class with singleton pattern
    - Implement loadTexture method with async/await
    - Add texture configuration (minFilter, magFilter)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_


  - [x] 2.2 Implement texture caching system

    - Create Map-based cache with TextureCacheEntry structure
    - Implement cache hit/miss logic
    - Add reference counting for texture lifecycle management
    - _Requirements: 5.1, 5.2, 5.5_



  - [x] 2.3 Implement LRU cache eviction

    - Track lastUsed timestamp for each cached texture
    - Implement evictLRU method to remove oldest textures
    - Set max cache size to 100 textures
    - Properly dispose Three.js textures on eviction
    - _Requirements: 5.3, 5.4_


  - [x] 2.4 Add fallback to PlaceholderGenerator

    - Integrate PlaceholderGenerator for failed loads
    - Handle missing imageUrl gracefully
    - Log warnings for debugging
    - _Requirements: 1.4, 4.5, 7.3_


  - [x] 2.5 Write unit tests for CardImageLoader

    - Test cache hit/miss scenarios
    - Test LRU eviction logic
    - Test reference counting
    - Test fallback generation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Create Image Proxy API






  - [x] 3.1 Implement /api/image-proxy route

    - Create Next.js API route handler
    - Parse and validate URL query parameter
    - Implement URL validation and security checks
    - _Requirements: 3.1, 3.2_

  - [x] 3.2 Implement external image fetching

    - Fetch image from external URL with proper headers
    - Handle HTTP errors and timeouts
    - Return image buffer with correct content-type
    - _Requirements: 3.2, 3.3, 3.4_


  - [x] 3.3 Add caching headers

    - Set Cache-Control headers for 24-hour caching
    - Add CORS headers for cross-origin access
    - _Requirements: 3.5, 8.1_


  - [x] 3.4 Write tests for image proxy

    - Test valid external URLs
    - Test invalid URLs and error handling
    - Test cache header presence
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Update CardMesh component





  - [x] 4.1 Remove hardcoded placeholder generation


    - Remove current placeholderDataUrl useMemo
    - Remove useEffect that always loads placeholder
    - Clean up related state variables
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Implement imageUrl-based loading

    - Extract imageUrl from cardState.metadata
    - Use CardImageLoader.loadTexture with imageUrl
    - Pass fallback data (name, category, power, cost) to loader
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Add loading states

    - Add isLoading and loadError state variables
    - Show loading indicator while texture loads
    - Handle successful load and error states
    - _Requirements: 6.1, 6.2, 6.3, 6.4_


  - [x] 4.4 Implement texture cleanup on unmount

    - Call CardImageLoader.releaseTexture in useEffect cleanup
    - Ensure proper disposal of textures
    - _Requirements: 5.5, 6.5_




  - [x] 4.5 Add error logging
    - Log image load failures with card details
    - Log fallback usage for debugging
    - Use structured logging format
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Update CardImageLoader to use Image Proxy





  - [x] 5.1 Detect external URLs


    - Check if imageUrl starts with "http" or "https"
    - Route external URLs through /api/image-proxy
    - Load local URLs (starting with "/") directly
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Implement proxy URL transformation

    - Transform external URLs to proxy format: `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    - Handle URL encoding properly
    - _Requirements: 2.1, 3.1_

  - [x] 5.3 Add timeout handling


    - Set 5-second timeout for image loading
    - Fall back to placeholder on timeout
    - Log timeout events
    - _Requirements: 2.3, 7.2_

  - [x] 5.4 Handle CORS errors


    - Detect CORS errors specifically
    - Provide actionable error messages
    - Automatically retry through proxy
    - _Requirements: 2.1, 2.2, 7.5_

- [x] 6. Performance optimization





  - [x] 6.1 Implement texture reuse for duplicate images


    - Check cache before loading new texture
    - Increment reference count for cache hits
    - Log cache hit/miss at debug level
    - _Requirements: 5.1, 5.2, 7.4, 8.5_

  - [x] 6.2 Optimize texture settings


    - Use LinearFilter for minFilter and magFilter
    - Set appropriate texture format
    - _Requirements: 8.1_


  - [x] 6.3 Add memory management

    - Dispose textures properly on eviction
    - Monitor cache size
    - Prevent memory leaks
    - _Requirements: 5.4, 8.4_

- [x] 7. Integration and testing




  - [x] 7.1 Test with local images

    - Verify cards load from /cards/ directory
    - Check placeholder fallback for missing files
    - _Requirements: 2.2, 2.3_


  - [x] 7.2 Test with external images
    - Verify external URLs route through proxy
    - Check CORS handling
    - Verify cache headers work
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.5_


  - [x] 7.3 Test error scenarios
    - Missing imageUrl
    - Invalid URLs
    - Network failures
    - Timeout scenarios
    - _Requirements: 2.3, 7.1, 7.2, 7.3_


  - [x] 7.4 Performance testing

    - Load game with 50+ cards
    - Monitor memory usage
    - Verify cache effectiveness
    - Check for memory leaks
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Documentation and cleanup





  - [x] 8.1 Add JSDoc comments


    - Document CardImageLoader public API
    - Document PlaceholderGenerator methods
    - Document image proxy API route
    - _Requirements: All_



  - [x] 8.2 Update component README





    - Document imageUrl usage in CardMesh
    - Add examples of image loading
    - Document error handling behavior


    - _Requirements: All_
-

  - [x] 8.3 Create troubleshooting guide




    - Document common image loading issues
    - Provide debugging steps
    - List error codes and meanings
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
