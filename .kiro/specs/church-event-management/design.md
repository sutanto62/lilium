# Design Document: Church Event Management System

## Overview

The Church Event Management System (Lilium Inter Spinas) is a comprehensive web application built with SvelteKit and TypeScript that manages Catholic church operations, focusing on usher assignment, event scheduling, and multi-church administration. The system follows Clean Architecture principles with clear separation between domain logic, business services, and infrastructure concerns.

The application serves multiple user types including church administrators, lingkungan coordinators, and regular users, each with role-based access to different features. The core workflow involves creating church events (masses and special celebrations), assigning volunteer ushers to specific positions and zones, and generating printable schedules for service coordination.

## Architecture

### Clean Architecture Implementation

The system implements Clean Architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   SvelteKit     │  │   API Routes    │  │  Components  │ │
│  │     Pages       │  │   (+page.ts)    │  │   (.svelte)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  EventService   │  │  ChurchService  │  │ UsherService │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    Entities     │  │  Repositories   │  │    Errors    │ │
│  │   (Event.ts)    │  │  (Interfaces)   │  │ ServiceError │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  SQLiteAdapter  │  │   Drizzle ORM   │  │   Auth.js    │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: SvelteKit with TypeScript for type safety and reactive UI
- **Styling**: Tailwind CSS with Flowbite components for consistent design
- **Database**: SQLite with WAL mode for performance and ACID compliance
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Authentication**: Auth.js with Microsoft Entra ID and Google OAuth providers
- **Analytics**: Statsig for feature flags and PostHog for user analytics
- **Logging**: Custom logger with structured output for debugging and monitoring

## Components and Interfaces

### Core Services

#### EventService
The primary service for managing church events and coordinating usher assignments.

**Key Responsibilities:**
- Event creation, validation, and lifecycle management
- Integration with UsherService for assignment coordination
- Schedule generation and printing functionality
- Week-based and date-range event retrieval

**Public Interface:**
```typescript
class EventService {
  constructor(churchId: string)
  
  // Event Management
  createEvent(event: Omit<ChurchEvent, 'id' | 'createdAt'>): Promise<ChurchEvent>
  updateEvent(eventId: string, event: Partial<ChurchEvent>): Promise<ChurchEvent>
  retrieveEventById(eventId: string): Promise<ChurchEvent>
  deactivateEvent(eventId: string): Promise<boolean>
  
  // Event Retrieval
  retrieveEventsByWeekRange(options: WeekRangeOptions): Promise<ChurchEvent[]>
  listEventsByDateRange(startDate: string, endDate: string): Promise<ChurchEvent[]>
  listEventsByLingkungan(lingkunganId: string, all?: boolean): Promise<ChurchEventResponse[]>
  
  // Schedule Management
  retrieveEventSchedule(eventId: string): Promise<EventScheduleResponse>
  retrieveEventPrintSchedule(eventId: string): Promise<CetakJadwalResponse>
  assignEventPic(request: EventPicRequest): Promise<boolean>
}
```

#### ChurchService
Manages church organizational structure including zones, masses, and administrative hierarchies.

**Key Responsibilities:**
- Church configuration and zone management
- Mass scheduling and zone association
- Wilayah and lingkungan administration
- Position definition and categorization

**Public Interface:**
```typescript
class ChurchService {
  constructor(churchId: string)
  
  // Church Structure
  retrieveChurch(): Promise<Church>
  retrieveZones(): Promise<ChurchZone[]>
  retrieveZonesByEvent(eventId: string): Promise<ChurchZone[]>
  retrieveZoneGroupsByEvent(eventId: string): Promise<ChurchZoneGroup[]>
  
  // Mass Management
  retrieveMasses(): Promise<Mass[]>
  retrievePositionsByMass(massId: string): Promise<ChurchPosition[]>
  
  // Regional Structure
  retrieveWilayahs(): Promise<Wilayah[]>
  retrieveLingkungans(): Promise<Lingkungan[]>
  retrieveLingkunganById(lingkunganId: string): Promise<Lingkungan>
}
```

#### UsherService
Handles usher assignment logic, position distribution, and queue management.

**Key Responsibilities:**
- Usher assignment validation and persistence
- Position allocation and conflict resolution
- Assignment retrieval and formatting
- Integration with Queue Manager for fair distribution

**Public Interface:**
```typescript
class UsherService {
  constructor(churchId: string)
  
  // Assignment Management
  assignEventUshers(eventId: string, ushers: EventUsher[], wilayahId: string, lingkunganId: string): Promise<number>
  retrieveUsherByEvent(eventId: string): Promise<UsherResponse[]>
  retrieveUshersByEventAndLingkungan(eventId: string, lingkunganId: string): Promise<UsherResponse[]>
  
  // Position Management
  retrieveUshersPositions(eventId: string, isPpg: boolean): Promise<string[]>
  retrieveUsherAssignments(eventId: string): Promise<EventUsher[]>
}
```

### Repository Pattern

The system uses the Repository pattern to abstract data access and enable testability:

```typescript
interface ScheduleRepository {
  // Event Operations
  insertEvent(event: ChurchEvent): Promise<ChurchEvent>
  getEventById(id: string): Promise<ChurchEvent>
  updateEventById(eventId: string, event: ChurchEvent): Promise<ChurchEvent>
  listEventsByWeekNumber(churchId: string, weekNumbers: number[], isToday: boolean, limit?: number): Promise<ChurchEvent[]>
  
  // Usher Operations
  persistEventUshers(eventId: string, ushers: EventUsher[], wilayahId: string, lingkunganId: string): Promise<number>
  listUsherByEvent(eventId: string): Promise<UsherResponse[]>
  removeEventUsher(eventId: string, lingkunganId: string): Promise<boolean>
  
  // Church Structure
  getMasses(churchId: string): Promise<Mass[]>
  getZones(churchId: string): Promise<ChurchZone[]>
  listLingkunganByChurch(churchId: string): Promise<Lingkungan[]>
}
```

### Authentication and Authorization

The system implements role-based access control with three user types:

- **Admin**: Full system access, can manage all churches and events
- **User**: Church-specific access, can manage assigned lingkungan
- **Visitor**: Read-only access for unregistered users

Authentication flow:
1. OAuth sign-in via Microsoft Entra ID or Google
2. JWT token validation and user lookup in database
3. Role assignment based on user registration status
4. Session creation with church and lingkungan association

## Data Models

### Core Entities

#### ChurchEvent
Represents a scheduled church service or celebration.

```typescript
interface ChurchEvent {
  id: string                    // Unique identifier
  church: string               // Church ID (foreign key)
  churchCode?: string | null   // Church code for display
  mass: string                 // Mass ID (foreign key)
  date: string                 // Event date (YYYY-MM-DD)
  weekNumber?: number | null   // Calculated week number
  createdAt?: number | null    // Unix timestamp
  isComplete?: number | null   // 1 if fully staffed, 0 otherwise
  active?: number | null       // 1 if active, 0 if deactivated
  type?: EventType | null      // 'mass' or 'feast'
  code?: string | null         // Event code for identification
  description?: string | null  // Event description
}
```

#### EventUsher
Represents an usher assignment to a specific event.

```typescript
interface EventUsher {
  id: string           // Unique identifier
  event: string        // Event ID (foreign key)
  name: string         // Usher name
  wilayah: string      // Wilayah name
  lingkungan: string   // Lingkungan name
  isPpg: boolean       // True if PPG (Gift Bearer) role
  isKolekte: boolean   // True if collection role
  position: string | null  // Position ID (foreign key)
  createdAt: number    // Assignment timestamp
}
```

#### Mass
Defines a regular church service schedule.

```typescript
interface Mass {
  id: string                  // Unique identifier
  code: string | null         // Mass code
  name: string               // Mass name (e.g., "Misa Pagi")
  sequence: number | null    // Display order
  church: string | null      // Church ID (foreign key)
  day: string               // Day of week
  time: string | null       // Service time
  briefingTime: string | null // Pre-service briefing time
  active: number            // 1 if active, 0 if inactive
}
```

#### ChurchZone
Represents a physical area within the church with specific usher positions.

```typescript
interface ChurchZone {
  id: string                    // Unique identifier
  church: string               // Church ID (foreign key)
  group: string | null         // Zone group ID (foreign key)
  name: string                 // Zone name
  code: string | null          // Zone code
  description: string | null   // Zone description
  sequence: number | null      // Display order
  active: number              // 1 if active, 0 if inactive
}
```

#### Lingkungan
Represents a neighborhood-level community group within the church.

```typescript
interface Lingkungan {
  id: string                  // Unique identifier
  name: string               // Lingkungan name
  wilayah: string | null     // Wilayah ID (foreign key)
  wilayahName: string | null // Wilayah name for display
  sequence: number | null    // Display order
  church: string | null      // Church ID (foreign key)
  active: number            // 1 if active, 0 if inactive
}
```

### Database Schema Relationships

The system maintains referential integrity through foreign key constraints:

- **Events** belong to a **Church** and **Mass**
- **Event Ushers** are assigned to **Events** and reference **Positions**
- **Zones** are organized into **Zone Groups** within **Churches**
- **Positions** are defined within **Zones** and categorized by type
- **Lingkungans** belong to **Wilayahs** within **Churches**
- **Users** are associated with **Churches** and optionally **Lingkungans**

All tables include soft deletion support through `active` flags and audit trails via `createdAt` timestamps.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties define the correctness requirements for the Church Event Management System. Each property represents a universal rule that must hold across all valid inputs and system states.

### Property 1: Event Creation Validation
*For any* event creation attempt, all required fields (church, mass, date, code, description) must be present and valid, or the creation should be rejected with specific field errors.
**Validates: Requirements 1.1**

### Property 2: Event Uniqueness Enforcement
*For any* church, mass, and date combination, only one event can exist, and duplicate creation attempts should be prevented with descriptive errors.
**Validates: Requirements 1.2**

### Property 3: Automatic Metadata Assignment
*For any* successfully created record (events, ushers, assignments), the system should automatically assign unique identifiers and creation timestamps.
**Validates: Requirements 1.3, 8.3**

### Property 4: Event Update Immutability
*For any* event update operation, the original church and mass assignments must remain unchanged regardless of the update payload.
**Validates: Requirements 1.4**

### Property 5: Week Number Calculation
*For any* valid event date, the system should automatically calculate and assign the correct week number based on the date.
**Validates: Requirements 1.5**

### Property 6: Soft Deletion Preservation
*For any* deactivation or deletion operation, the system should mark records as inactive while preserving all historical data.
**Validates: Requirements 1.6, 8.5**

### Property 7: Assignment Uniqueness Per Lingkungan
*For any* event and lingkungan combination, only one usher assignment submission should be allowed, with subsequent attempts being rejected.
**Validates: Requirements 2.1, 2.4**

### Property 8: Usher Assignment Completeness
*For any* usher assignment submission, all required fields (names, positions, special roles) must be recorded completely.
**Validates: Requirements 2.2**

### Property 9: Assignment Confirmation Timestamping
*For any* successful usher assignment submission, the system should return a confirmation timestamp.
**Validates: Requirements 2.3**

### Property 10: Position Distribution Management
*For any* usher assignment operation, the system should track position availability and ensure proper distribution across zones without over-assignment.
**Validates: Requirements 2.5, 7.4, 7.5**

### Property 11: Event Completion Status Tracking
*For any* event with complete usher assignments across all required positions, the system should mark the event as fully staffed.
**Validates: Requirements 2.6**

### Property 12: Multi-Church Data Isolation
*For any* user operation, data access should be restricted to the user's assigned church, ensuring complete isolation between church organizations.
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 13: Organizational Structure Integrity
*For any* church configuration (zones, masses, positions), the system should maintain proper hierarchical relationships and sequencing.
**Validates: Requirements 3.3, 3.4, 3.6**

### Property 14: Schedule Compilation Completeness
*For any* event schedule generation, all usher assignments should be compiled and organized by zone with complete information (church, mass, date, briefing times, PIC data).
**Validates: Requirements 4.1, 4.2, 4.5**

### Property 15: Schedule Organization and Formatting
*For any* schedule display or print operation, ushers should be organized by position sequence and zone, with proper separation of regular ushers, PPG, and collection assignments, including correct row span calculations.
**Validates: Requirements 4.3, 4.4, 4.6**

### Property 16: Role-Based Authorization
*For any* user access attempt, the system should verify authorization based on the user's role and church assignment, assigning appropriate permissions and denying unauthorized access.
**Validates: Requirements 5.2, 5.3, 5.4, 5.6**

### Property 17: User-Church Association
*For any* user creation or authentication, the system should properly associate users with specific churches and lingkungan.
**Validates: Requirements 5.5**

### Property 18: Event Filtering Accuracy
*For any* event retrieval request (by week range, lingkungan, date range, status), the system should return only events that match the specified criteria.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 19: Pagination Constraint Compliance
*For any* event query with specified limits, the system should respect pagination constraints and return the correct number of results.
**Validates: Requirements 6.6**

### Property 20: Queue Manager Position Distribution
*For any* usher assignment through the Queue Manager, positions should be distributed according to predefined sequences with proper conflict resolution and special role tracking.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 21: Zone Coverage Validation
*For any* mass and zone combination, the Queue Manager should ensure appropriate usher coverage based on mass requirements.
**Validates: Requirements 7.6**

### Property 22: Referential Integrity Enforcement
*For any* database operation involving foreign key relationships, the system should enforce referential integrity with proper cascade operations.
**Validates: Requirements 8.2**

### Property 23: Audit Trail Maintenance
*For any* critical operation (usher assignments, event creation, role changes), the system should maintain proper audit trails with timestamps and user information.
**Validates: Requirements 8.4**

### Property 24: Error Handling and Categorization
*For any* system error (validation, duplicate, database, unknown), the system should categorize the error appropriately, provide descriptive messages, log issues for debugging, and maintain service availability.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.6**

### Property 25: Pre-Processing Validation
*For any* create or update operation, the system should validate all required fields before processing the operation.
**Validates: Requirements 9.5**

## Error Handling

The system implements a comprehensive error handling strategy using the ServiceError class to categorize and manage different types of errors:

### Error Categories

1. **Validation Errors**: Input validation failures with field-specific details
2. **Duplicate Errors**: Attempts to create duplicate records with conflict explanations
3. **Database Errors**: Database operation failures with user-friendly messages
4. **Unknown Errors**: Unexpected system errors with fallback handling

### Error Handling Patterns

- **Graceful Degradation**: System continues operating when non-critical errors occur
- **Detailed Logging**: All errors are logged with context for debugging
- **User-Friendly Messages**: Technical errors are translated to understandable messages
- **Error Propagation**: Errors are properly categorized and bubbled up through service layers

### Resilience Mechanisms

- **Transaction Management**: Database operations use transactions for consistency
- **Retry Logic**: Temporary failures are retried with exponential backoff
- **Circuit Breaker**: External service failures trigger circuit breaker patterns
- **Fallback Responses**: Default responses when primary operations fail

## Testing Strategy

The Church Event Management System employs a dual testing approach combining unit tests for specific scenarios and property-based tests for comprehensive validation.

### Unit Testing Approach

Unit tests focus on:
- **Specific Examples**: Concrete scenarios that demonstrate correct behavior
- **Edge Cases**: Boundary conditions and special input handling
- **Integration Points**: Service interactions and data flow validation
- **Error Conditions**: Specific error scenarios and recovery mechanisms

### Property-Based Testing Configuration

Property-based tests validate universal properties using **fast-check** library for TypeScript:
- **Minimum 100 iterations** per property test for thorough coverage
- **Random input generation** to discover edge cases automatically
- **Shrinking capabilities** to find minimal failing examples
- **Custom generators** for domain-specific data types (events, ushers, dates)

Each property test is tagged with the format:
**Feature: church-event-management, Property {number}: {property_text}**

### Test Organization

```
tests/
├── unit/
│   ├── services/           # Service layer unit tests
│   ├── entities/           # Entity validation tests
│   └── repositories/       # Repository implementation tests
├── properties/
│   ├── event-properties.test.ts      # Event management properties
│   ├── usher-properties.test.ts      # Usher assignment properties
│   ├── auth-properties.test.ts       # Authentication properties
│   └── schedule-properties.test.ts   # Schedule generation properties
└── integration/
    ├── api/               # API endpoint integration tests
    └── database/          # Database operation integration tests
```

### Testing Guidelines

- **Property tests** validate universal correctness across all inputs
- **Unit tests** verify specific examples and integration behavior
- **Both approaches** are complementary and necessary for comprehensive coverage
- **Test isolation** ensures tests don't interfere with each other
- **Database cleanup** maintains test independence and repeatability