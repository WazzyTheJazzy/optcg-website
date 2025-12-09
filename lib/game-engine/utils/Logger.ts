/**
 * Logger.ts
 * 
 * Comprehensive logging system for the game engine.
 * Supports multiple log levels, structured logging, and log export.
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  maxEntries?: number;
  enableConsole?: boolean;
  categories?: string[];
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private entries: LogEntry[] = [];
  private minLevel: LogLevel;
  private maxEntries: number;
  private enableConsole: boolean;
  private categories: Set<string> | null;

  constructor(config: LoggerConfig = {}) {
    this.minLevel = config.minLevel ?? LogLevel.INFO;
    this.maxEntries = config.maxEntries ?? 10000;
    this.enableConsole = config.enableConsole ?? true;
    this.categories = config.categories ? new Set(config.categories) : null;
  }

  /**
   * Log a debug message
   */
  debug(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Log an error message
   */
  error(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  /**
   * Log a message with a specific level
   */
  private log(level: LogLevel, category: string, message: string, data?: Record<string, any>): void {
    // Check if level is enabled
    if (level < this.minLevel) {
      return;
    }

    // Check if category is enabled
    if (this.categories && !this.categories.has(category)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Add to entries
    this.entries.push(entry);

    // Trim if exceeds max
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Output to console if enabled
    if (this.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Output a log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (entry.data) {
          console.debug(message, entry.data);
        } else {
          console.debug(message);
        }
        break;
      case LogLevel.INFO:
        if (entry.data) {
          console.log(message, entry.data);
        } else {
          console.log(message);
        }
        break;
      case LogLevel.WARN:
        if (entry.data) {
          console.warn(message, entry.data);
        } else {
          console.warn(message);
        }
        break;
      case LogLevel.ERROR:
        if (entry.data) {
          console.error(message, entry.data);
        } else {
          console.error(message);
        }
        break;
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  /**
   * Get entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(e => e.level === level);
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: string): LogEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  /**
   * Get entries in a time range
   */
  getEntriesInRange(startTime: number, endTime: number): LogEntry[] {
    return this.entries.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get minimum log level
   */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Enable or disable console output
   */
  setConsoleEnabled(enabled: boolean): void {
    this.enableConsole = enabled;
  }

  /**
   * Check if console output is enabled
   */
  isConsoleEnabled(): boolean {
    return this.enableConsole;
  }

  /**
   * Set enabled categories (null = all categories)
   */
  setCategories(categories: string[] | null): void {
    this.categories = categories ? new Set(categories) : null;
  }

  /**
   * Get enabled categories
   */
  getCategories(): string[] | null {
    return this.categories ? Array.from(this.categories) : null;
  }

  /**
   * Export logs as JSON string
   */
  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Export logs as CSV string
   */
  exportCSV(): string {
    const header = 'Timestamp,Level,Category,Message,Data\n';
    const rows = this.entries.map(entry => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = LogLevel[entry.level];
      const category = entry.category;
      const message = this.escapeCSV(entry.message);
      const data = entry.data ? this.escapeCSV(JSON.stringify(entry.data)) : '';
      return `${timestamp},${level},${category},${message},${data}`;
    });
    return header + rows.join('\n');
  }

  /**
   * Export logs as plain text
   */
  exportText(): string {
    return this.entries.map(entry => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = LogLevel[entry.level];
      const prefix = `[${timestamp}] [${level}] [${entry.category}]`;
      const message = `${prefix} ${entry.message}`;
      if (entry.data) {
        return `${message}\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      return message;
    }).join('\n');
  }

  /**
   * Escape a string for CSV
   */
  private escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Get statistics about the logs
   */
  getStats(): {
    totalEntries: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const entry of this.entries) {
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      byLevel,
      byCategory,
      oldestTimestamp: this.entries.length > 0 ? this.entries[0].timestamp : null,
      newestTimestamp: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
    };
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({
      minLevel: LogLevel.INFO,
      enableConsole: true,
    });
  }
  return globalLogger;
}

/**
 * Set the global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Create a new logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}
