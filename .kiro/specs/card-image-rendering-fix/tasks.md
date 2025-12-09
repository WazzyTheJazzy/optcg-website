# Implementation Plan

- [x] 1. Add diagnostic logging to CardMesh component





  - Add logging for initial texture load request with imageUrl and card details
  - Add logging for successful texture load with texture validation
  - Add logging for texture load failures with error details
  - Add logging for texture application to material
  - Add logging for showFaceUp state to verify conditional logic
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 2.3_

- [x] 2. Add diagnostic logging to CardImageLoader





  - Add logging for load request received with URL routing decision
  - Add logging for cache hit/miss with card details
  - Add logging for URL routing (external vs local, proxy transformation)
  - Add logging for successful texture load with texture details
  - Add logging for load failures with full error context
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.5_

- [x] 3. Add diagnostic logging to Image Proxy API





  - Add logging for incoming proxy requests with URL
  - Add logging for successful external fetch with status and content-type
  - Add logging for fetch failures with error details
  - _Requirements: 1.3, 4.2, 4.4_

- [x] 4. Test diagnostic logging and identify root cause





  - Start development server and load game page
  - Open browser console and review all logs
  - Identify at which stage the pipeline fails
  - Document the specific root cause in a troubleshooting file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement material update fix





  - Create material ref in CardMesh component
  - Add useEffect to manually update material.map when texture changes
  - Set material.needsUpdate = true after texture application
  - Log material updates for verification
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.5_

- [x] 6. Fix texture application conditional logic





  - Verify showFaceUp calculation is correct
  - Ensure cardTexture state is properly set
  - Fix any issues with conditional rendering of texture
  - Add logging to verify texture is applied when expected
  - _Requirements: 2.3, 2.4, 5.3, 5.4_

- [x] 7. Verify placeholder fallback behavior





  - Test with cards that have missing imageUrl
  - Test with cards that have invalid imageUrl
  - Verify placeholder shows card name and stats
  - Verify placeholder has error indicator when appropriate
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Test and verify fix





  - Load game and verify cards show actual images
  - Verify external URLs work through proxy
  - Verify local URLs work directly
  - Verify cache reuse for duplicate cards
  - Verify no console errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Performance verification





  - Measure image load times for local and external images
  - Verify cache hit rate for duplicate cards
  - Check memory usage over time
  - Verify no memory leaks
  - _Requirements: 7.3, 7.5_

- [x] 10. Clean up diagnostic logging





  - Remove or reduce verbose diagnostic logs
  - Keep essential error and warning logs
  - Ensure production-ready logging level
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
