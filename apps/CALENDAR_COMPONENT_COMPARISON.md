# Calendar Component Alternatives for Svelte 5

## **Current Implementation (Recommended)**

### **Custom Calendar Component** (`src/lib/components/Calendar.svelte`)

- ✅ **Zero dependencies** - No external libraries
- ✅ **Svelte 5 native** - Uses `$state()`, `$derived()`, `$props()`
- ✅ **Lightweight** - ~5KB bundle size
- ✅ **Fully customizable** - Matches your design system
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Accessible** - ARIA labels, keyboard navigation
- ✅ **Responsive** - Mobile-first design

**Features:**

- Month view with navigation
- Event display and selection
- Date selection callbacks
- Compact mode option
- Dark mode support
- Indonesian localization

## **Alternative Options**

### **1. date-fns + Custom Calendar** ✅ **INSTALLED**

```bash
npm install date-fns --legacy-peer-deps
```

**Pros:**

- ✅ Excellent date utilities
- ✅ Tree-shakeable (only import what you need)
- ✅ Small footprint (~13KB)
- ✅ Well-maintained and stable
- ✅ Great TypeScript support
- ✅ Built-in localization support

**Cons:**

- ❌ Requires building calendar UI from scratch
- ❌ Additional dependency

**Bundle Size:** ~18KB (date-fns + your custom code)

**Available as:** `src/lib/components/LightweightCalendar.svelte`

### **2. @fullcalendar/core (Minimal)**

```bash
npm install @fullcalendar/core @fullcalendar/daygrid --legacy-peer-deps
```

**Pros:**

- ✅ Very mature and stable
- ✅ Excellent documentation
- ✅ Good TypeScript support
- ✅ Rich feature set

**Cons:**

- ❌ Larger bundle size (~50KB)
- ❌ Requires manual Svelte integration
- ❌ Overkill for simple calendar needs

**Bundle Size:** ~50KB

### **3. @melt-ui/svelte Calendar**

```bash
npm install @melt-ui/svelte --legacy-peer-deps
```

**Pros:**

- ✅ Headless UI components
- ✅ Svelte 5 compatible
- ✅ Very lightweight
- ✅ Modern architecture

**Cons:**

- ❌ Still in development
- ❌ Limited calendar features
- ❌ Requires more setup

**Bundle Size:** ~15KB

### **4. Vanilla JavaScript (Current)**

**Pros:**

- ✅ Zero dependencies
- ✅ Complete control
- ✅ Smallest bundle size
- ✅ No external API changes
- ✅ Perfect integration with existing code

**Cons:**

- ❌ More maintenance required
- ❌ Need to handle edge cases manually

**Bundle Size:** ~5KB

## **Recommendation**

### **Stick with Current Implementation**

Your current custom calendar component is the **best choice** because:

1. **Performance**: Smallest bundle size
2. **Integration**: Perfect fit with existing Event data structure
3. **Maintainability**: No external dependencies to worry about
4. **Customization**: Matches your amber color scheme and design patterns
5. **Svelte 5**: Uses modern reactivity patterns

### **When to Consider Alternatives**

- **date-fns**: If you need complex date calculations across your app
- **FullCalendar**: If you need advanced features like drag-and-drop, multiple views
- **Melt UI**: If you want a headless component library for other UI elements

## **Usage Examples**

### **Current Calendar Component**

```svelte
<script>
	import { Calendar } from '$lib';

	let events = [
		/* your ChurchEvent array */
	];
	let selectedEventId = $state(null);

	function handleEventSelect(eventId: string) {
		selectedEventId = eventId;
	}

	function handleDateSelect(date: Date) {
		console.log('Selected date:', date);
	}
</script>

<Calendar
	{events}
	{selectedEventId}
	onEventSelect={handleEventSelect}
	onDateSelect={handleDateSelect}
	compact={false}
	showToday={true}
	showNavigation={true}
/>
```

### **date-fns Calendar Component**

```svelte
<script>
	import { LightweightCalendar } from '$lib';

	let events = [
		/* your ChurchEvent array */
	];
	let selectedEventId = $state(null);

	function handleEventSelect(eventId: string) {
		selectedEventId = eventId;
	}
</script>

<LightweightCalendar {events} {selectedEventId} onEventSelect={handleEventSelect} compact={false} />
```

### **Compact Mode**

```svelte
<Calendar {events} compact={true} showNavigation={false} />
```

## **Performance Comparison**

| Component         | Bundle Size | Dependencies | Svelte 5 Compatible     |
| ----------------- | ----------- | ------------ | ----------------------- |
| Current Custom    | ~5KB        | 0            | ✅                      |
| date-fns + Custom | ~18KB       | 1            | ✅                      |
| FullCalendar      | ~50KB       | 2+           | ⚠️ (Manual integration) |
| Melt UI           | ~15KB       | 1            | ✅                      |

## **Live Demo**

Visit `/calendar-example` to see both calendar components in action with:

- Side-by-side comparison
- Interactive examples
- Compact mode demonstration
- Performance metrics

## **Conclusion**

**Recommendation: Keep your current implementation**

Your custom calendar component provides the best balance of:

- Performance (smallest bundle)
- Integration (perfect fit)
- Maintainability (no external deps)
- Customization (matches your design)

The current implementation is production-ready and doesn't need replacement.

**Both calendar components are now available:**

- `Calendar` - Zero dependencies, ~5KB
- `LightweightCalendar` - Uses date-fns, ~18KB
