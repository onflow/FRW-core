import type { TrackingEvents } from '@onflow/frw-shared/types';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private initialized = false;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async init(analyticsService?: AnalyticsService) {
    if (this.initialized) return;

    if (analyticsService) {
      AnalyticsService.instance = analyticsService;
      this.initialized = true;
    }
  }

  async time<T extends keyof TrackingEvents>(eventName: T) {
    if (!this.initialized) return;

    return AnalyticsService.instance.time<T>(eventName);
  }

  async track<T extends keyof TrackingEvents>(eventName: T, properties: TrackingEvents[T]) {
    if (!this.initialized) return;

    return AnalyticsService.instance.track<T>(eventName, properties);
  }
  async trackPageView(pathname: string) {
    if (!this.initialized) return;

    return AnalyticsService.instance.trackPageView(pathname);
  }

  async identify(userId: string, name?: string) {
    if (!this.initialized) return;

    return AnalyticsService.instance.identify(userId, name);
  }

  async reset() {
    if (!this.initialized) return;

    return AnalyticsService.instance.reset();
  }
}

export const analyticsService = AnalyticsService.getInstance();
