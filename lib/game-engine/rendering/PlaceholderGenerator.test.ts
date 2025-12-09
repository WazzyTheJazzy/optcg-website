/**
 * PlaceholderGenerator.test.ts
 * 
 * Unit tests for PlaceholderGenerator utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaceholderGenerator } from './PlaceholderGenerator';

describe('PlaceholderGenerator', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  
  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
    } as unknown as HTMLCanvasElement;
    
    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
  });
  
  describe('generate', () => {
    it('should generate placeholder with default dimensions', () => {
      const result = PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockCanvas.width).toBe(512);
      expect(mockCanvas.height).toBe(716);
      expect(result).toBe('data:image/png;base64,mockdata');
    });
    
    it('should generate placeholder with custom dimensions', () => {
      const result = PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        width: 1024,
        height: 1432,
      });
      
      expect(mockCanvas.width).toBe(1024);
      expect(mockCanvas.height).toBe(1432);
      expect(result).toBe('data:image/png;base64,mockdata');
    });
    
    it('should use LEADER category color', () => {
      const fillStyleValues: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyleValues.push(value),
        get: () => fillStyleValues[fillStyleValues.length - 1] || '',
      });
      
      PlaceholderGenerator.generate({
        name: 'Leader Card',
        category: 'LEADER',
        power: 5000,
        cost: 0,
      });
      
      expect(fillStyleValues).toContain('#8B0000');
    });
    
    it('should use CHARACTER category color', () => {
      const fillStyleValues: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyleValues.push(value),
        get: () => fillStyleValues[fillStyleValues.length - 1] || '',
      });
      
      PlaceholderGenerator.generate({
        name: 'Character Card',
        category: 'CHARACTER',
        power: 4000,
        cost: 2,
      });
      
      expect(fillStyleValues).toContain('#1E3A8A');
    });
    
    it('should use EVENT category color', () => {
      const fillStyleValues: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyleValues.push(value),
        get: () => fillStyleValues[fillStyleValues.length - 1] || '',
      });
      
      PlaceholderGenerator.generate({
        name: 'Event Card',
        category: 'EVENT',
        power: 0,
        cost: 1,
      });
      
      expect(fillStyleValues).toContain('#065F46');
    });
    
    it('should use STAGE category color', () => {
      const fillStyleValues: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyleValues.push(value),
        get: () => fillStyleValues[fillStyleValues.length - 1] || '',
      });
      
      PlaceholderGenerator.generate({
        name: 'Stage Card',
        category: 'STAGE',
        power: 0,
        cost: 2,
      });
      
      expect(fillStyleValues).toContain('#7C2D12');
    });
    
    it('should use default color for unknown category', () => {
      const fillStyleValues: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyleValues.push(value),
        get: () => fillStyleValues[fillStyleValues.length - 1] || '',
      });
      
      PlaceholderGenerator.generate({
        name: 'Unknown Card',
        category: 'UNKNOWN',
        power: 1000,
        cost: 1,
      });
      
      expect(fillStyleValues).toContain('#2a2a4a');
    });
    
    it('should render card name', () => {
      PlaceholderGenerator.generate({
        name: 'Monkey D. Luffy',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Monkey D. Luffy',
        256,
        60
      );
    });
    
    it('should truncate long card names', () => {
      PlaceholderGenerator.generate({
        name: 'This is a very long card name that should be truncated',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'This is a very long ',
        256,
        60
      );
    });
    
    it('should render category text', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'CHARACTER',
        256,
        100
      );
    });
    
    it('should render power when greater than 0', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.fillText).toHaveBeenCalledWith('5000', 256, 400);
      expect(mockContext.fillText).toHaveBeenCalledWith('POWER', 256, 430);
    });
    
    it('should not render power when 0', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'EVENT',
        power: 0,
        cost: 1,
      });
      
      expect(mockContext.fillText).not.toHaveBeenCalledWith(
        expect.stringContaining('POWER'),
        expect.any(Number),
        expect.any(Number)
      );
    });
    
    it('should render cost when greater than 0', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.arc).toHaveBeenCalledWith(80, 80, 40, 0, Math.PI * 2);
      expect(mockContext.fillText).toHaveBeenCalledWith('3', 80, 95);
    });
    
    it('should not render cost when 0', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'LEADER',
        power: 5000,
        cost: 0,
      });
      
      expect(mockContext.arc).not.toHaveBeenCalled();
    });
    
    it('should render error indicator when showError is true', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: true,
      });
      
      expect(mockContext.fillText).toHaveBeenCalledWith(
        '⚠ Image Load Failed',
        256,
        676
      );
    });
    
    it('should not render error indicator when showError is false', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
        showError: false,
      });
      
      expect(mockContext.fillText).not.toHaveBeenCalledWith(
        expect.stringContaining('Image Load Failed'),
        expect.any(Number),
        expect.any(Number)
      );
    });
    
    it('should handle missing canvas context gracefully', () => {
      mockCanvas.getContext = vi.fn(() => null);
      
      const result = PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(result).toBe('');
    });
    
    it('should render border with correct styling', () => {
      PlaceholderGenerator.generate({
        name: 'Test Card',
        category: 'CHARACTER',
        power: 5000,
        cost: 3,
      });
      
      expect(mockContext.strokeStyle).toBe('#FFD700');
      expect(mockContext.lineWidth).toBe(8);
      expect(mockContext.strokeRect).toHaveBeenCalledWith(8, 8, 496, 700);
    });
  });
});
