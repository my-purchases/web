// Analytics tracker — verbose console logging in dev, silent in production
// Production builds strip console.log/info/debug/trace via esbuild pure config

import type { AnalyticsEvent } from './events';

const isDev = import.meta.env.DEV;

interface TrackEventData {
  [key: string]: unknown;
}

class AnalyticsTracker {
  private context: string = 'global';

  /**
   * Track a named event with optional data payload
   */
  trackEvent(event: AnalyticsEvent, data?: TrackEventData): void {
    const timestamp = new Date().toISOString();
    const payload = {
      event,
      context: this.context,
      timestamp,
      ...data,
    };

    // Dev: verbose console logging (stripped in production by esbuild)
    console.log(
      `%c[Analytics] %c${event}`,
      'color: #a855f7; font-weight: bold;',
      'color: #3b82f6; font-weight: bold;',
      payload,
    );

    // Production: send to analytics service (placeholder)
    // In the future, this can be extended to send to Google Analytics,
    // Plausible, PostHog, or any other analytics service
    if (!isDev) {
      this.sendToAnalyticsService(payload);
    }
  }

  /**
   * Track a page view
   */
  trackPageView(page: string): void {
    this.trackEvent('page_view' as AnalyticsEvent, { page });
  }

  /**
   * Track a user interaction with a UI element
   */
  trackInteraction(element: string, action: string, data?: TrackEventData): void {
    console.info(
      `%c[Interaction] %c${element} → ${action}`,
      'color: #f59e0b; font-weight: bold;',
      'color: #10b981;',
      data,
    );

    this.trackEvent(`${element}_${action}` as AnalyticsEvent, data);
  }

  /**
   * Set the current context (e.g., component name) for tracking
   */
  setContext(context: string): void {
    this.context = context;
    console.debug(`[Analytics] Context set to: ${context}`);
  }

  /**
   * Log a debug message — only visible in dev
   */
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[Debug] ${message}`, ...args);
  }

  /**
   * Log an info message — only visible in dev
   */
  info(message: string, ...args: unknown[]): void {
    console.info(`[Info] ${message}`, ...args);
  }

  /**
   * Log a trace message — only visible in dev
   */
  trace(message: string, ...args: unknown[]): void {
    console.trace(`[Trace] ${message}`, ...args);
  }

  /**
   * Placeholder for sending events to an analytics service in production
   */
  private sendToAnalyticsService(_payload: Record<string, unknown>): void {
    // TODO: Integrate with Google Analytics, Plausible, or PostHog
    // Example: window.gtag?.('event', payload.event, payload);
  }
}

// Singleton instance
export const tracker = new AnalyticsTracker();

/**
 * React hook for analytics with automatic component context
 */
export function useTracker(componentName: string) {
  tracker.setContext(componentName);

  return {
    trackEvent: (event: AnalyticsEvent, data?: TrackEventData) =>
      tracker.trackEvent(event, data),
    trackInteraction: (element: string, action: string, data?: TrackEventData) =>
      tracker.trackInteraction(element, action, data),
    trackPageView: (page: string) => tracker.trackPageView(page),
    debug: (message: string, ...args: unknown[]) => tracker.debug(message, ...args),
    info: (message: string, ...args: unknown[]) => tracker.info(message, ...args),
  };
}
