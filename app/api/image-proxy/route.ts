/**
 * Image Proxy API Route
 * 
 * Server-side proxy for fetching external card images to avoid CORS restrictions.
 * This endpoint accepts a URL parameter, fetches the image from the external source,
 * and returns it with appropriate caching and CORS headers.
 * 
 * **Security Features:**
 * - URL validation (http/https only)
 * - Localhost and private IP blocking
 * - Content-type validation (images only)
 * - 10-second timeout
 * 
 * **Performance Features:**
 * - 24-hour cache headers
 * - CORS headers for cross-origin access
 * 
 * @module ImageProxyAPI
 * 
 * @example
 * ```typescript
 * // Fetch external card image through proxy
 * const response = await fetch('/api/image-proxy?url=' + encodeURIComponent('https://example.com/card.png'));
 * const blob = await response.blob();
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates if a URL is a valid and safe image URL
 * 
 * Performs security checks to prevent SSRF (Server-Side Request Forgery) attacks
 * by blocking localhost and private IP ranges. Only allows http and https protocols.
 * 
 * **Security Checks:**
 * - Protocol must be http or https
 * - Must have valid hostname
 * - Blocks localhost (localhost, 127.0.0.1, [::1])
 * - Blocks private IP ranges (192.168.x.x, 10.x.x.x, 172.16.x.x)
 * 
 * @private
 * @param {string} url - The URL to validate
 * @returns {boolean} true if valid and safe, false otherwise
 * 
 * @example
 * ```typescript
 * isValidImageUrl('https://example.com/card.png'); // true
 * isValidImageUrl('http://localhost/card.png'); // false (blocked)
 * isValidImageUrl('ftp://example.com/card.png'); // false (invalid protocol)
 * ```
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check if URL has a valid hostname
    if (!parsedUrl.hostname) {
      return false;
    }
    
    // Prevent localhost and private IP ranges for security
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname === '[::1]'
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * GET handler for image proxy API route
 * 
 * Fetches external card images server-side to avoid CORS restrictions in the browser.
 * This is the main entry point for the image proxy functionality.
 * 
 * **Request:**
 * - Query parameter: `url` (required) - The external image URL to fetch
 * 
 * **Response:**
 * - Success (200): Image buffer with Content-Type and cache headers
 * - Bad Request (400): Missing, invalid, or unsafe URL
 * - Gateway Timeout (504): Request timeout (10 seconds)
 * - Internal Server Error (500): Network or other errors
 * 
 * **Headers:**
 * - `Content-Type`: Preserved from source (e.g., 'image/jpeg', 'image/png')
 * - `Cache-Control`: 'public, max-age=86400' (24 hours)
 * - `Access-Control-Allow-Origin`: '*' (allow all origins)
 * 
 * @async
 * @param {NextRequest} request - Next.js request object with URL query parameter
 * @returns {Promise<NextResponse>} Image buffer with appropriate headers or error response
 * 
 * @example
 * ```typescript
 * // Client-side usage
 * const imageUrl = 'https://example.com/cards/OP01-001.png';
 * const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
 * const response = await fetch(proxyUrl);
 * 
 * if (response.ok) {
 *   const blob = await response.blob();
 *   // Use blob with Three.js or img element
 * }
 * ```
 * 
 * @throws {NextResponse} Returns error response (never throws)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  // Validate URL parameter exists
  if (!url) {
    console.error('Image Proxy: Missing URL parameter');
    return new NextResponse('Missing URL parameter', { status: 400 });
  }
  
  // Validate URL format and security
  if (!isValidImageUrl(url)) {
    console.error('Image Proxy: Invalid or unsafe URL', { url });
    return new NextResponse('Invalid or unsafe URL', { status: 400 });
  }
  
  try {
    // Fetch external image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OnePieceTCG/1.0',
        'Accept': 'image/*',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle non-OK responses
    if (!response.ok) {
      console.error('Image Proxy: Fetch failed', {
        url,
        status: response.status,
      });
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    // Get image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Validate content type is an image
    if (!contentType.startsWith('image/')) {
      console.error('Image Proxy: Invalid content type', {
        url,
        contentType,
      });
      return new NextResponse('URL does not point to an image', { status: 400 });
    }
    
    // Return image with cache and CORS headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    // Handle timeout and network errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Image Proxy: Request timeout', { url });
        return new NextResponse('Request timeout', { status: 504 });
      }
      console.error('Image Proxy: Fetch error', { 
        url, 
        error: error.message,
      });
    } else {
      console.error('Image Proxy: Unknown error', { 
        url,
        error: String(error),
      });
    }
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
}
