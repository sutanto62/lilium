import '@statsig/js-client';

declare module '@statsig/js-client' {
    interface StatsigClient {
        updateUser(user: { userID: string; custom?: Record<string, any> }): Promise<void>;
    }
} 