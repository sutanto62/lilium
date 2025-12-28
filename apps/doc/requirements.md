# Requirements Document

## Introduction

### Project Overview

Lilium Inter Spinas (L.I.S) is a digital service information system designed for Catholic church community management. The system facilitates event scheduling, usher management, and community coordination for church parishes.

### Purpose

The system serves as a centralized platform for managing:
- Church event scheduling and management
- Usher assignment and scheduling
- Community-based task confirmation
- Role-based access control for different user types
- Analytics and tracking of system usage

### Target Users

The system serves three primary user roles:

1. **Church Admin**: Administrative users who manage church operations, schedules, and events
   - Can create, edit, and manage events (Misa)
   - Can view and manage schedules (Jadwal)
   - Can access administrative features

2. **Church Member (User)**: Regular registered users who participate in church activities
   - Can view schedules and assignments
   - Can confirm task assignments
   - Can view their community (lingkungan) assignments

3. **Visitor**: Unregistered users with limited access
   - Can access public information pages
   - Can view guidelines and regulations
   - Cannot access protected features

### System Goals

1. **Efficiency**: Streamline church event management and usher scheduling processes
2. **Transparency**: Provide clear visibility into assignments and schedules
3. **Accessibility**: Enable easy access to schedules and task confirmations
4. **Scalability**: Support multiple churches and communities
5. **Reliability**: Ensure data integrity and system availability

## Functional Requirements

### 1. Authentication & Authorization

#### 1.1 OAuth Authentication

**REQ-AUTH-001**: The system SHALL support OAuth authentication via multiple providers:
- Microsoft Entra ID (Azure AD)
- Google OAuth

**REQ-AUTH-002**: The system SHALL allow users to sign in using their preferred OAuth provider.

**REQ-AUTH-003**: The system SHALL validate OAuth tokens and create user sessions upon successful authentication.

#### 1.2 Session Management

**REQ-AUTH-004**: The system SHALL maintain user sessions using secure JWT tokens.

**REQ-AUTH-005**: The system SHALL validate user sessions on each protected route access.

**REQ-AUTH-006**: The system SHALL redirect unauthenticated users to the sign-in page when accessing protected routes.

**REQ-AUTH-007**: The system SHALL provide a sign-out functionality that terminates user sessions.

#### 1.3 User Registration

**REQ-AUTH-008**: The system SHALL check if a user exists in the database after OAuth authentication.

**REQ-AUTH-009**: The system SHALL assign unregistered users the 'visitor' role with limited access.

**REQ-AUTH-010**: The system SHALL allow registration of new users (subject to admin approval or automatic registration flow).

#### 1.4 Role-Based Access Control

**REQ-AUTH-011**: The system SHALL support three user roles:
- **admin**: Full administrative access
- **user**: Regular user access to schedules and confirmations
- **visitor**: Limited public access

**REQ-AUTH-012**: The system SHALL enforce role-based access control on all protected routes.

**REQ-AUTH-013**: The system SHALL restrict administrative features to users with 'admin' role.

**REQ-AUTH-014**: The system SHALL allow 'user' role to access schedules, confirmations, and community features.

**REQ-AUTH-015**: The system SHALL restrict 'visitor' role to public pages only.

### 2. Event Management (Misa)

#### 2.1 Event Creation

**REQ-EVENT-001**: Admin users SHALL be able to create new church events.

**REQ-EVENT-002**: Events SHALL require the following mandatory fields:
- Church ID
- Mass ID
- Mass type (enum: sunday, weekday, solemnity, feast, special)
- Date (YYYY-MM-DD format)

**REQ-EVENT-003**: Events SHALL support optional fields:
- Event type (mass or feast)
- Code
- Description
- Week number

**REQ-EVENT-004**: The system SHALL automatically calculate week number based on event date using ISO 8601 standard.

**REQ-EVENT-005**: The system SHALL prevent creation of duplicate events (same church, mass, and date).

#### 2.2 Event Retrieval

**REQ-EVENT-006**: The system SHALL allow retrieval of events by week number(s).

**REQ-EVENT-007**: When retrieving by single week number, the system SHALL return events for the specified week and the next week (2 weeks total).

**REQ-EVENT-008**: The system SHALL handle year boundary cases when retrieving events (e.g., week 52/53 → week 1).

**REQ-EVENT-009**: The system SHALL allow retrieval of events by date range.

**REQ-EVENT-010**: The system SHALL support filtering events by event type (mass, feast).

**REQ-EVENT-011**: The system SHALL support filtering events to show only future events or events from today onwards.

#### 2.3 Event Updates

**REQ-EVENT-012**: Admin users SHALL be able to update existing events.

**REQ-EVENT-013**: The system SHALL validate event data before updating.

**REQ-EVENT-014**: The system SHALL prevent updates that would create duplicate events.

#### 2.4 Event Completion Tracking

**REQ-EVENT-015**: The system SHALL track event completion status based on usher assignment percentage.

**REQ-EVENT-016**: An event SHALL be marked as complete when 100% of required usher positions are assigned.

**REQ-EVENT-017**: The system SHALL calculate and display completion progress for each event.

### 3. Usher Scheduling (Jadwal)

#### 3.1 Schedule Viewing

**REQ-SCHED-001**: Users SHALL be able to view event schedules with usher assignments.

**REQ-SCHED-002**: The system SHALL display schedules organized by:
- Event date
- Mass type
- Zone groups
- Zones
- Individual positions

**REQ-SCHED-003**: The system SHALL show usher assignments with:
- Usher name
- Position assignment
- Zone information
- Community (lingkungan) information
- PPG status
- Kolekte status

**REQ-SCHED-004**: The system SHALL allow filtering schedules by:
- Date range
- Week number
- Mass type
- Completion status

**REQ-SCHED-005**: Admin users SHALL be able to view detailed schedule information including all ushers and their assignments.

#### 3.2 Schedule Printing

**REQ-SCHED-006**: The system SHALL provide functionality to print schedules in a formatted layout.

**REQ-SCHED-007**: Printed schedules SHALL include:
- Church name
- Mass details (name, date, time)
- Briefing time
- Organized list of ushers by zone
- Separate sections for PPG and Kolekte assignments

#### 3.3 Position Distribution

**REQ-SCHED-008**: The system SHALL support automated position assignment using configurable algorithms:
- Round-robin distribution (fair rotation)
- Sequential assignment (first-come-first-served)

**REQ-SCHED-009**: The system SHALL respect role-based constraints:
- PPG ushers can only be assigned to PPG positions
- Non-PPG ushers can be assigned to non-PPG positions
- When PPG feature is disabled, all positions must be non-PPG

**REQ-SCHED-010**: The system SHALL maximize the number of assigned ushers while respecting constraints.

**REQ-SCHED-011**: The system SHALL ensure position uniqueness per event (each position assigned to at most one usher).

### 4. Queue Management

#### 4.1 Queue Submission

**REQ-QUEUE-001**: The system SHALL support queue-based processing of usher assignments.

**REQ-QUEUE-002**: Communities (lingkungan) SHALL be able to submit confirmation queues with their usher assignments.

**REQ-QUEUE-003**: The system SHALL maintain a queue of pending assignment confirmations.

#### 4.2 Queue Processing

**REQ-QUEUE-004**: The system SHALL process confirmation queues to assign positions to unassigned ushers.

**REQ-QUEUE-005**: Queue processing SHALL:
- Retrieve all ushers and available positions for an event
- Separate assigned and unassigned ushers
- Apply position distribution algorithm
- Update database with new assignments
- Remove processed items from queue

**REQ-QUEUE-006**: The system SHALL handle past unprocessed queue events.

**REQ-QUEUE-007**: The system SHALL log warnings for ushers that cannot be assigned due to constraint violations.

### 5. Community Features (Lingkungan)

#### 5.1 Community Assignment Viewing

**REQ-COMM-001**: Users SHALL be able to view assignments filtered by their community (lingkungan).

**REQ-COMM-002**: The system SHALL display task assignments (titik tugas) organized by community.

**REQ-COMM-003**: The system SHALL show assignments with:
- Event details
- Zone information
- Position assignments
- Usher names
- Assignment status

#### 5.2 Task Confirmation

**REQ-COMM-004**: Community representatives SHALL be able to confirm task assignments for their community.

**REQ-COMM-005**: The system SHALL validate that a community has not already submitted confirmations for an event.

**REQ-COMM-006**: The system SHALL prevent duplicate confirmations from the same community.

**REQ-COMM-007**: Upon confirmation, the system SHALL add the community to the processing queue.

### 6. Public Features

#### 6.1 Public Schedule Viewing

**REQ-PUB-001**: The system SHALL provide public routes for viewing schedules without authentication.

**REQ-PUB-002**: Public routes SHALL allow viewing of:
- Event schedules
- Task assignments (tatib - tata tertib)
- Guidelines and regulations (petunjuk)

#### 6.2 Guidelines and Regulations

**REQ-PUB-003**: The system SHALL provide access to usage guidelines and regulations.

**REQ-PUB-004**: Public users SHALL be able to view important information and instructions.

### 7. Analytics & Tracking

#### 7.1 Dual Platform Tracking

**REQ-ANALYTICS-001**: The system SHALL track analytics using two platforms:
- **Statsig**: Feature flag management, A/B testing, key event tracking
- **PostHog**: Comprehensive user analytics, session replay, business metrics

**REQ-ANALYTICS-002**: The system SHALL track events with rich metadata including:
- User context (role, church, community)
- Event context (timestamps, page information)
- Business context (event types, completion status)

#### 7.2 Event Tracking

**REQ-ANALYTICS-003**: The system SHALL track page view events for all routes.

**REQ-ANALYTICS-004**: The system SHALL track user interaction events:
- Filter changes
- Event navigation
- Feature clicks
- Form submissions

**REQ-ANALYTICS-005**: The system SHALL track business events:
- Event creation
- Schedule updates
- Task confirmations
- Usher assignments

**REQ-ANALYTICS-006**: The system SHALL track error events with context for debugging.

**REQ-ANALYTICS-007**: The system SHALL track empty states for UX insights.

#### 7.3 Performance Monitoring

**REQ-ANALYTICS-008**: The system SHALL track performance metrics:
- Page load times
- Server-side operation durations
- Database query performance

**REQ-ANALYTICS-009**: The system SHALL include performance metadata in analytics events.

#### 7.4 User Journey Tracking

**REQ-ANALYTICS-010**: The system SHALL track user navigation paths through the application.

**REQ-ANALYTICS-011**: The system SHALL track session information:
- Session start and end
- Pages visited
- Time spent on pages

**REQ-ANALYTICS-012**: PostHog SHALL automatically track clicks and pageviews (autocapture).

## Non-Functional Requirements

### 1. Performance Requirements

**REQ-PERF-001**: The system SHALL respond to user requests within 2 seconds for standard page loads.

**REQ-PERF-002**: The system SHALL respond to database queries within 500ms for typical operations.

**REQ-PERF-003**: The system SHALL support concurrent access from multiple users.

**REQ-PERF-004**: The system SHALL handle peak loads during event scheduling periods.

### 2. Security Requirements

**REQ-SEC-001**: The system SHALL use HTTPS for all communications in production.

**REQ-SEC-002**: The system SHALL implement input validation on all user inputs.

**REQ-SEC-003**: The system SHALL prevent SQL injection attacks using parameterized queries.

**REQ-SEC-004**: The system SHALL prevent XSS attacks by sanitizing user inputs and escaping output.

**REQ-SEC-005**: The system SHALL implement CSRF protection for all form submissions.

**REQ-SEC-006**: The system SHALL store sensitive data (secrets, passwords) in server-only environment variables.

**REQ-SEC-007**: The system SHALL never expose secrets in client-side code.

**REQ-SEC-008**: The system SHALL implement secure session management with:
- HttpOnly cookies
- SameSite cookie attribute
- Secure cookie flag (in production)
- Appropriate session expiration

**REQ-SEC-009**: The system SHALL sanitize error messages to prevent information leakage.

**REQ-SEC-010**: The system SHALL implement HTTP security headers:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Referrer-Policy

### 3. Data Integrity Requirements

**REQ-DATA-001**: The system SHALL maintain referential integrity between related entities.

**REQ-DATA-002**: The system SHALL enforce foreign key constraints in the database.

**REQ-DATA-003**: The system SHALL validate data before database insertion or update.

**REQ-DATA-004**: The system SHALL use transactions for multi-step operations to ensure atomicity.

**REQ-DATA-005**: The system SHALL handle concurrent modifications to prevent data corruption.

**REQ-DATA-006**: The system SHALL implement soft deletes (active flag) instead of hard deletes for audit purposes.

### 4. Usability Requirements

**REQ-USER-001**: The system SHALL provide clear navigation and user interface elements.

**REQ-USER-002**: The system SHALL display user-friendly error messages in Indonesian language.

**REQ-USER-003**: The system SHALL provide feedback for user actions (success, error, loading states).

**REQ-USER-004**: The system SHALL be responsive and work on desktop and mobile devices.

**REQ-USER-005**: The system SHALL support dark mode for user preference.

### 5. Scalability Considerations

**REQ-SCALE-001**: The system SHALL support multiple churches with separate data isolation.

**REQ-SCALE-002**: The database schema SHALL be designed to support growth in:
- Number of events
- Number of ushers
- Number of communities

**REQ-SCALE-003**: The system SHALL use database indexing for frequently queried columns.

**REQ-SCALE-004**: The system SHALL implement pagination or limits for large result sets.

## User Roles & Permissions

### Admin Role

**Capabilities:**
- Create, read, update, and manage church events
- View and manage schedules (Jadwal)
- Access administrative dashboard
- Manage mass configurations
- View all usher assignments
- Print schedules
- Access all analytics and reports

**Restrictions:**
- None within the system scope

### User Role

**Capabilities:**
- View schedules and event information
- Confirm task assignments for their community
- View their community (lingkungan) assignments
- Access public information pages

**Restrictions:**
- Cannot create or modify events
- Cannot access administrative features
- Cannot view schedules for other communities (unless public)

### Visitor Role

**Capabilities:**
- View public schedules (if available)
- Access guidelines and regulations pages
- View public information

**Restrictions:**
- Cannot access protected features
- Cannot view detailed assignments
- Cannot confirm tasks
- Cannot access personal or community-specific information

## Data Requirements

### Core Entities

1. **User**: System users with authentication and role information
   - Required: id, name, email, role, church_id
   - Optional: lingkungan_id, image

2. **Church**: Church/parish information
   - Required: id, code, name
   - Optional: parish, active flag

3. **Event**: Church events (misa/feast)
   - Required: id, church_id, mass_id, date
   - Optional: week_number, type, code, description, is_complete, active

4. **EventUsher**: Usher assignments to events
   - Required: id, event_id, name, wilayah, lingkungan
   - Optional: position_id, is_ppg, is_kolekte, sequence

5. **Mass**: Mass service configurations
   - Required: id, name, church_id, day
   - Optional: code, time, briefing_time, sequence

6. **ChurchZone**: Zone organization within church
   - Required: id, church_id, name
   - Optional: code, description, sequence, zone_group_id

7. **ChurchPosition**: Positions within zones
   - Required: id, zone_id, name, type
   - Optional: code, description, is_ppg, sequence

8. **Wilayah**: Regional organization
   - Required: id, name, church_id, sequence
   - Optional: code

9. **Lingkungan**: Community within wilayah
   - Required: id, name, wilayah_id, church_id
   - Optional: sequence

### Data Validation Rules

**REQ-VAL-001**: Email addresses SHALL be validated for proper format.

**REQ-VAL-002**: Dates SHALL be in YYYY-MM-DD format (ISO 8601).

**REQ-VAL-003**: Week numbers SHALL be between 1 and 53 (ISO 8601 standard).

**REQ-VAL-004**: Required fields SHALL not be null or empty.

**REQ-VAL-005**: Foreign key references SHALL point to existing records.

**REQ-VAL-006**: User roles SHALL be one of: 'admin', 'user', 'visitor'.

**REQ-VAL-007**: Event types SHALL be one of: 'mass', 'feast'.

**REQ-VAL-008**: Position types SHALL be one of: 'usher', 'prodiakon', 'peta'.

### Data Retention Policies

**REQ-RET-001**: The system SHALL retain event data for historical reference.

**REQ-RET-002**: The system SHALL use soft deletes (active flag) to maintain audit trails.

**REQ-RET-003**: Completed events SHALL remain accessible for reporting and historical analysis.

**REQ-RET-004**: User data SHALL be retained for active users and deactivated (not deleted) for inactive users.

## Glossary

- **Misa**: Mass service/event
- **Jadwal**: Schedule
- **Lingkungan**: Community/sub-community within a church parish
- **Wilayah**: Region/area within a church parish
- **Tatib**: Tata tertib (regulations/guidelines)
- **PPG**: Special role/position type for ushers
- **Kolekte**: Collection/offering role
- **Zone**: Organizational unit within church for scheduling
- **Position**: Specific role/assignment within a zone
- **Event**: A scheduled church service (mass or feast)
- **Usher**: Church volunteer assigned to service positions
