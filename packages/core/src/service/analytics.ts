import type { TrackingEvents } from '@onflow/frw-shared/types';

export class AnalytcsService {
  private static instance: AnalytcsService;
  private initialized = false;

  private constructor() {}

  static getInstance(): AnalytcsService {
    if (!AnalytcsService.instance) {
      AnalytcsService.instance = new AnalytcsService();
    }
    return AnalytcsService.instance;
  }

  async init(analyticsService?: AnalytcsService) {
    if (this.initialized) return;

    if (analyticsService) {
      AnalytcsService.instance = analyticsService;
      this.initialized = true;
    }
  }

  async time<T extends keyof TrackingEvents>(eventName: T) {
    if (!this.initialized) return;

    return AnalytcsService.instance.time<T>(eventName);
  }

  async track<T extends keyof TrackingEvents>(eventName: T, properties: TrackingEvents[T]) {
    if (!this.initialized) return;

    return AnalytcsService.instance.track<T>(eventName, properties);
  }
  async trackPageView(pathname: string) {
    if (!this.initialized) return;

    return AnalytcsService.instance.trackPageView(pathname);
  }

  async identify(userId: string, name?: string) {
    if (!this.initialized) return;

    return AnalytcsService.instance.identify(userId, name);
  }

  async reset() {
    if (!this.initialized) return;

    return AnalytcsService.instance.reset();
  }
}

export const analyticsService = AnalytcsService.getInstance();
