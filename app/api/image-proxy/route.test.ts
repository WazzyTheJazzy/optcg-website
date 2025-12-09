import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('Image Proxy API', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn();
    (global as any).fetch = fetchMock;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('URL Validation', () => {
    it('should return 400 when URL parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/image-proxy');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Missing URL parameter');
    });
    
    it('should return 400 for invalid URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=not-a-valid-url');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid or unsafe URL');
    });
    
    it('should return 400 for localhost URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=http://localhost/image.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid or unsafe URL');
    });
    
    it('should return 400 for private IP addresses', async () => {
      const privateIps = [
        'http://127.0.0.1/image.jpg',
        'http://192.168.1.1/image.jpg',
        'http://10.0.0.1/image.jpg',
        'http://172.16.0.1/image.jpg',
      ];
      
      for (const url of privateIps) {
        const request = new NextRequest(`http://localhost:3000/api/image-proxy?url=${encodeURIComponent(url)}`);
        const response = await GET(request);
        
        expect(response.status).toBe(400);
      }
    });
    
    it('should return 400 for non-http(s) protocols', async () => {
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=ftp://example.com/image.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid or unsafe URL');
    });
  });
  
  describe('External Image Fetching', () => {
    it('should successfully fetch and return an image', async () => {
      const mockImageBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'image/jpeg']]),
        arrayBuffer: async () => mockImageBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/card.jpg',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'OnePieceTCG/1.0',
            'Accept': 'image/*',
          }),
        })
      );
    });
    
    it('should handle HTTP errors from external source', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/missing.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toContain('Failed to fetch image');
    });
    
    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Failed to proxy image');
    });
    
    it('should handle timeout errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValueOnce(abortError);
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/slow.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(504);
      const text = await response.text();
      expect(text).toBe('Request timeout');
    });
    
    it('should return 400 for non-image content types', async () => {
      const mockBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        arrayBuffer: async () => mockBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/page.html');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('URL does not point to an image');
    });
  });
  
  describe('Cache and CORS Headers', () => {
    it('should include Cache-Control header with 24-hour cache', async () => {
      const mockImageBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: async () => mockImageBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.png');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    });
    
    it('should include CORS headers', async () => {
      const mockImageBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'image/webp']]),
        arrayBuffer: async () => mockImageBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.webp');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
    
    it('should preserve content-type from external source', async () => {
      const mockImageBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'image/svg+xml']]),
        arrayBuffer: async () => mockImageBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.svg');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
    });
    
    it('should default to image/jpeg when content-type is missing', async () => {
      const mockImageBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        arrayBuffer: async () => mockImageBuffer,
      });
      
      const request = new NextRequest('http://localhost:3000/api/image-proxy?url=https://example.com/card.jpg');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    });
  });
});
