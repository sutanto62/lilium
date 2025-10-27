# PostHog Setup Guide

This guide explains how PostHog has been integrated into your SvelteKit application alongside your existing Statsig analytics.

## What's Been Set Up

### 1. PostHog Service (`src/lib/application/PostHogService.ts`)

- Singleton service similar to your existing StatsigService
- Handles initialization, event tracking, user identification
- Browser-only execution (server-safe)
- Automatic user context from session data

### 2. Environment Configuration

Add these environment variables to your `.env.local` file:

```bash
# PostHog Configuration
VITE_POSTHOG_KEY="your-posthog-project-api-key"
VITE_POSTHOG_HOST="https://app.posthog.com"  # Optional, defaults to PostHog cloud
```

### 3. Integration Points

- **Layout Server**: PostHog initializes alongside Statsig
- **Layout Client**: Automatic page view tracking
- **Page Handler**: Dual tracking (Statsig + PostHog) for server-side events
- **Example Pages**: Updated admin/misa page shows dual tracking pattern

## How to Use PostHog

### Basic Event Tracking

```typescript
import { posthogService } from '$src/lib/application/PostHogService';

// Track a simple event
await posthogService.trackEvent('button_clicked', {
	button_name: 'signup',
	page: 'homepage'
});

// Track with user context
await posthogService.trackEvent(
	'form_submitted',
	{
		form_type: 'contact',
		success: true
	},
	session
);
```

### User Identification

```typescript
// Identify a user (automatically done when session is provided)
posthogService.identifyUser('user123', {
	email: 'user@example.com',
	role: 'admin'
});
```

### Page View Tracking

```typescript
// Track page views (automatic in layout, manual if needed)
await posthogService.trackPageView(
	'admin_dashboard',
	{
		section: 'analytics'
	},
	session
);
```

## Dual Analytics Strategy

Your application now tracks events with both Statsig and PostHog:

```typescript
// Example from admin/misa page
await Promise.all([
	statsigService.logEvent('admin_misa_view', 'load', session),
	posthogService.trackEvent(
		'admin_misa_view',
		{
			event_type: 'page_view',
			page: 'admin_misa',
			user_role: session?.user?.role
		},
		session
	)
]);
```

## Testing the Integration

### 1. Set Up PostHog Account

1. Go to [PostHog.com](https://posthog.com) and create an account
2. Create a new project
3. Get your Project API Key from Settings → Project → API Keys
4. Add it to your `.env.local` file

### 2. Test Event Tracking

1. Start your development server: `npm run dev`
2. Navigate through your application
3. Check PostHog dashboard for incoming events
4. Use the PostHogDemo component to test custom events

### 3. Verify Integration

- Check browser console for PostHog initialization logs
- Verify events appear in PostHog dashboard
- Test both automatic page views and custom events

## PostHog Features Available

- **Event Tracking**: Custom events with properties
- **User Identification**: Link events to specific users
- **Page View Tracking**: Automatic and manual page tracking
- **Session Replay**: User session recordings (if enabled)
- **Feature Flags**: Can replace or complement Statsig
- **Cohorts**: User segmentation
- **Funnels**: Conversion tracking
- **Retention**: User retention analysis

## Migration Strategy

### Option 1: Dual Tracking (Current Setup)

- Keep both Statsig and PostHog running
- Gradually migrate critical events to PostHog
- Compare data between platforms

### Option 2: Full Migration

- Replace Statsig calls with PostHog equivalents
- Use PostHog for feature flags instead of Statsig
- Remove Statsig dependencies

### Option 3: Hybrid Approach

- Use PostHog for analytics
- Keep Statsig for feature flags
- Best of both worlds

## Troubleshooting

### Common Issues

1. **Events not appearing**: Check API key and network connectivity
2. **TypeScript errors**: Ensure proper session type handling
3. **Performance**: PostHog is lightweight but monitor bundle size

### Debug Mode

PostHog automatically enables debug mode in development. Check browser console for logs.

### Environment Variables

Make sure all required environment variables are set:

- `VITE_POSTHOG_KEY` (required)
- `VITE_POSTHOG_HOST` (optional, defaults to PostHog cloud)

## Next Steps

1. **Set up PostHog account** and get your API key
2. **Add environment variables** to your `.env.local`
3. **Test the integration** using the demo component
4. **Review PostHog dashboard** to see incoming events
5. **Plan your analytics strategy** (dual vs migration)

The integration is now complete and ready for testing!
