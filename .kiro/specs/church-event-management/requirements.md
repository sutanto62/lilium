# Requirements Document

## Introduction

The Church Event Management System is a comprehensive digital platform designed to streamline Catholic church administration, focusing on usher assignment, event scheduling, and multi-church coordination. The system enables efficient management of church events, automated usher scheduling with position allocation, and provides role-based access control for different user types including administrators, church staff, and community members.

## Glossary

- **System**: The Church Event Management System (Lilium Inter Spinas)
- **Church**: A Catholic church organization with its own events and administrative structure
- **Event**: A scheduled church service or celebration (Mass, feast day, special ceremony)
- **Usher**: A volunteer who assists during church services in various capacities
- **Mass**: A regular church service with specific time, day, and zone assignments
- **Zone**: A designated area within the church with specific usher positions
- **Position**: A specific role an usher performs (e.g., entrance, collection, PPG)
- **Wilayah**: A regional administrative division within the church community
- **Lingkungan**: A neighborhood-level community group within a wilayah
- **PPG**: Pembawa Persembahan Gereja (Gift Bearer) - special usher role
- **Administrator**: A user with full system access and management capabilities
- **PIC**: Person In Charge - designated coordinator for specific zones or events
- **Queue_Manager**: The system component that handles usher assignment distribution

## Requirements

### Requirement 1: Event Creation and Management

**User Story:** As a church administrator, I want to create and manage church events, so that I can organize services and coordinate usher assignments effectively.

#### Acceptance Criteria

1. WHEN an administrator creates a new event, THE System SHALL validate all required fields (church, mass, date, code, description)
2. WHEN an event is created with duplicate church, mass, and date combination, THE System SHALL prevent creation and return a descriptive error
3. WHEN an event is created successfully, THE System SHALL assign a unique identifier and timestamp
4. WHEN an administrator updates an event, THE System SHALL preserve the original church and mass assignments
5. THE System SHALL automatically calculate and assign week numbers based on event dates
6. WHEN an administrator deactivates an event, THE System SHALL mark it as inactive while preserving historical data

### Requirement 2: Usher Assignment and Scheduling

**User Story:** As a lingkungan coordinator, I want to assign ushers to church events, so that our community can fulfill service obligations efficiently.

#### Acceptance Criteria

1. WHEN a coordinator assigns ushers to an event, THE System SHALL validate that the lingkungan has not already submitted assignments
2. WHEN ushers are assigned, THE System SHALL record their names, positions, and special roles (PPG, Kolekte)
3. WHEN usher assignments are submitted, THE System SHALL return a confirmation timestamp
4. WHEN duplicate assignments are attempted, THE System SHALL prevent submission and notify the coordinator
5. THE System SHALL track usher positions and ensure proper distribution across zones
6. WHEN assignments are complete, THE System SHALL mark the event as fully staffed

### Requirement 3: Multi-Church Administration

**User Story:** As a system administrator, I want to manage multiple churches within the system, so that different parishes can operate independently while sharing the platform.

#### Acceptance Criteria

1. THE System SHALL support multiple church organizations with separate data isolation
2. WHEN a user accesses the system, THE System SHALL restrict data access to their assigned church
3. WHEN church zones are configured, THE System SHALL organize them into logical groups with sequences
4. WHEN masses are scheduled, THE System SHALL associate them with specific churches and zones
5. THE System SHALL maintain separate wilayah and lingkungan structures for each church
6. WHEN positions are defined, THE System SHALL categorize them by type (usher, prodiakon, peta) and zone

### Requirement 4: Schedule Generation and Printing

**User Story:** As a church administrator, I want to generate and print usher schedules, so that volunteers know their assignments and responsibilities.

#### Acceptance Criteria

1. WHEN a schedule is requested for an event, THE System SHALL compile all usher assignments by zone
2. WHEN generating print schedules, THE System SHALL format information including church, mass, date, and briefing times
3. WHEN displaying schedules, THE System SHALL organize ushers by position sequence and zone
4. WHEN printing schedules, THE System SHALL separate regular ushers, PPG, and collection (Kolekte) assignments
5. THE System SHALL include PIC information for each zone in the schedule output
6. WHEN schedules are generated, THE System SHALL calculate proper row spans for grouped information

### Requirement 5: Authentication and Authorization

**User Story:** As a system user, I want secure access to the system based on my role, so that I can perform authorized functions while protecting sensitive church data.

#### Acceptance Criteria

1. WHEN a user signs in, THE System SHALL authenticate via Microsoft Entra or Google OAuth
2. WHEN authentication succeeds, THE System SHALL assign appropriate role-based permissions
3. WHEN users access features, THE System SHALL verify authorization based on their role and church assignment
4. THE System SHALL support admin and user role types with different permission levels
5. WHEN users are created, THE System SHALL associate them with specific churches and lingkungan
6. WHEN unauthorized access is attempted, THE System SHALL deny access and log the attempt

### Requirement 6: Event Retrieval and Filtering

**User Story:** As a church member, I want to view upcoming events and my assignments, so that I can prepare for my service responsibilities.

#### Acceptance Criteria

1. WHEN events are requested by week range, THE System SHALL return events for specified weeks
2. WHEN events are filtered by lingkungan, THE System SHALL show only relevant assignments
3. WHEN events are retrieved by date range, THE System SHALL return all events within the specified period
4. THE System SHALL support filtering events by completion status and active state
5. WHEN today's events are requested, THE System SHALL include events from current date onwards
6. WHEN event limits are specified, THE System SHALL respect pagination constraints

### Requirement 7: Queue Management and Position Distribution

**User Story:** As a system administrator, I want automated usher distribution across positions, so that workload is balanced fairly among volunteers.

#### Acceptance Criteria

1. WHEN ushers are assigned, THE Queue_Manager SHALL distribute positions according to predefined sequences
2. WHEN position conflicts occur, THE Queue_Manager SHALL resolve them based on priority rules
3. WHEN special roles (PPG, Kolekte) are assigned, THE Queue_Manager SHALL track these separately
4. THE Queue_Manager SHALL maintain position availability and prevent over-assignment
5. WHEN assignments are removed, THE Queue_Manager SHALL update position availability
6. THE Queue_Manager SHALL ensure each zone has appropriate coverage based on mass requirements

### Requirement 8: Data Persistence and Integrity

**User Story:** As a system administrator, I want reliable data storage and integrity, so that church records are accurate and preserved.

#### Acceptance Criteria

1. WHEN data is stored, THE System SHALL use SQLite with WAL mode for performance and reliability
2. WHEN foreign key relationships exist, THE System SHALL enforce referential integrity with cascade operations
3. WHEN records are created, THE System SHALL automatically assign timestamps and unique identifiers
4. THE System SHALL maintain audit trails for critical operations like usher assignments
5. WHEN data is deleted, THE System SHALL use soft deletion to preserve historical records
6. WHEN database migrations occur, THE System SHALL preserve existing data integrity

### Requirement 9: Error Handling and Validation

**User Story:** As a system user, I want clear error messages and validation feedback, so that I can correct issues and complete tasks successfully.

#### Acceptance Criteria

1. WHEN validation errors occur, THE System SHALL return descriptive error messages with field-specific details
2. WHEN duplicate data is submitted, THE System SHALL prevent creation and explain the conflict
3. WHEN database operations fail, THE System SHALL log errors and return user-friendly messages
4. WHEN service errors occur, THE System SHALL categorize them (validation, duplicate, database, unknown)
5. THE System SHALL validate required fields before processing any create or update operations
6. WHEN system errors occur, THE System SHALL maintain service availability and log issues for debugging