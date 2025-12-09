/**
 * LazyEvaluation.ts
 * 
 * Lazy evaluation utilities for deferring expensive computations
 * until they're actually needed.
 */

/**
 * Lazy value that computes on first access
 */
export class Lazy<T> {
  private value: T | undefined;
  private computed: boolean;
  private factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
    this.computed = false;
  }

  /**
   * Get the value, computing it if necessary
   */
  get(): T {
    if (!this.computed) {
      this.value = this.factory();
      this.computed = true;
    }
    return this.value!;
  }

  /**
   * Check if value has been computed
   */
  isComputed(): boolean {
    return this.computed;
  }

  /**
   * Reset the lazy value
   */
  reset(): void {
    this.value = undefined;
    this.computed = false;
  }

  /**
   * Map the lazy value to a new lazy value
   */
  map<U>(fn: (value: T) => U): Lazy<U> {
    return new Lazy(() => fn(this.get()));
  }
}

/**
 * Lazy list that computes elements on demand
 */
export class LazyList<T> {
  private items: (T | Lazy<T>)[];
  private computedIndices: Set<number>;

  constructor(items: (T | Lazy<T>)[] = []) {
    this.items = items;
    this.computedIndices = new Set();
  }

  /**
   * Get item at index, computing if necessary
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }

    const item = this.items[index];
    if (item instanceof Lazy) {
      const value = item.get();
      this.items[index] = value;
      this.computedIndices.add(index);
      return value;
    }

    return item;
  }

  /**
   * Get all items, computing any lazy ones
   */
  getAll(): T[] {
    return this.items.map((item, index) => {
      if (item instanceof Lazy) {
        const value = item.get();
        this.items[index] = value;
        this.computedIndices.add(index);
        return value;
      }
      return item;
    });
  }

  /**
   * Get length without computing lazy items
   */
  length(): number {
    return this.items.length;
  }

  /**
   * Filter items, only computing those that pass the predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this.items.length; i++) {
      const item = this.get(i);
      if (item !== undefined && predicate(item)) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Map items lazily
   */
  map<U>(fn: (item: T) => U): LazyList<U> {
    const mapped = this.items.map(item => {
      if (item instanceof Lazy) {
        return new Lazy(() => fn(item.get()));
      }
      return new Lazy(() => fn(item));
    });
    
    return new LazyList(mapped);
  }

  /**
   * Find first item matching predicate, computing lazily
   */
  find(predicate: (item: T) => boolean): T | undefined {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.get(i);
      if (item !== undefined && predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Check if any item matches predicate, computing lazily
   */
  some(predicate: (item: T) => boolean): boolean {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.get(i);
      if (item !== undefined && predicate(item)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Take first N items, computing only those
   */
  take(n: number): T[] {
    const result: T[] = [];
    const count = Math.min(n, this.items.length);
    
    for (let i = 0; i < count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Get number of computed items
   */
  getComputedCount(): number {
    return this.computedIndices.size;
  }
}

/**
 * Memoize a function to cache results
 */
export function memoize<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>();

  return (...args: TArgs): TResult => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Debounce a function to limit call frequency
 */
export function debounce<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: TArgs): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle a function to limit call rate
 */
export function throttle<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: TArgs): void => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delayMs) {
      fn(...args);
      lastCall = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
        timeoutId = null;
      }, delayMs - timeSinceLastCall);
    }
  };
}

/**
 * Lazy computation with timeout
 * Computes value in background after delay
 */
export class LazyWithTimeout<T> extends Lazy<T> {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(factory: () => T, timeoutMs: number = 0) {
    super(factory);

    if (timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        this.get(); // Trigger computation
        this.timeoutId = null;
      }, timeoutMs);
    }
  }

  /**
   * Cancel the timeout
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Lazy computation with dependencies
 * Only recomputes when dependencies change
 */
export class LazyWithDeps<T, TDeps extends any[]> {
  private value: T | undefined;
  private computed: boolean;
  private factory: (...deps: TDeps) => T;
  private lastDeps: TDeps | undefined;

  constructor(factory: (...deps: TDeps) => T) {
    this.factory = factory;
    this.computed = false;
  }

  /**
   * Get the value, recomputing if dependencies changed
   */
  get(...deps: TDeps): T {
    if (!this.computed || this.depsChanged(deps)) {
      this.value = this.factory(...deps);
      this.lastDeps = deps;
      this.computed = true;
    }
    return this.value!;
  }

  /**
   * Check if dependencies changed
   */
  private depsChanged(newDeps: TDeps): boolean {
    if (!this.lastDeps) return true;
    if (this.lastDeps.length !== newDeps.length) return true;

    for (let i = 0; i < newDeps.length; i++) {
      if (this.lastDeps[i] !== newDeps[i]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Reset the lazy value
   */
  reset(): void {
    this.value = undefined;
    this.computed = false;
    this.lastDeps = undefined;
  }
}
