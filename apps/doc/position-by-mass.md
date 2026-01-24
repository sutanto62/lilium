# Position by Mass – Design & Implementation Plan

## Status

**Last Updated**: 2026-01-24

### Implementation Progress

- ✅ **Phase 1 – Domain & Service (TDD)** - **COMPLETED**
  - ✅ `MassPositionView` DTO defined in `core/entities/Schedule.ts`
  - ✅ `ScheduleRepository` interface extended with all required methods:
    - `listPositionByMass(churchId, massId)` → returns `ChurchPosition[]`
    - `createPosition(position)` → creates new position
    - `updatePosition(positionId, patch)` → updates position fields
    - `softDeletePosition(positionId)` → deactivates position
    - `reorderZonePositions(zoneId, items)` → updates position sequences
  - ✅ `PositionService` fully implemented with all methods:
    - `retrievePositionsByMass(massId)` → maps to `MassPositionView[]`
    - `createPositionForMass(massId, zoneId, input)` → creates position
    - `editPosition(positionId, patch)` → updates position
    - `deactivatePosition(positionId)` → soft deletes position
    - `reorderZonePositions(zoneId, items)` → reorders positions
  - ✅ SQLite adapter implementations complete:
    - `listPositionByMass()` - includes zone and zone group info
    - `createPosition()` - creates with UUID generation
    - `updatePosition()` - partial updates with zone lookup
    - `softDeletePosition()` - sets active = 0
    - `reorderZonePositions()` - transaction-based sequence updates
  - ✅ Comprehensive test coverage (13 tests, all passing):
    - Validation error tests for all methods
    - Happy path tests for all methods
    - Proper mocking and assertions

- ✅ **Phase 2 – Route API (`+page.server.ts`)** - **COMPLETED**
  - ✅ Route implementation at `/admin/misa/[id]/positions`
  - ✅ Server-side `load` function:
    - Authentication and admin role checks
    - Church ID and mass ID validation
    - Mass existence and ownership validation
    - Fetches mass details and positions concurrently
    - Analytics tracking (Statsig + PostHog)
  - ✅ Form actions implemented:
    - `create_position` - creates new position with validation
    - `edit_position` - updates position fields (partial updates)
    - `delete_position` - soft deletes position
    - `reorder_positions` - reorders positions within a zone
  - ✅ Comprehensive TDD test coverage (23 tests, all passing):
    - Load function tests (auth, validation, happy path)
    - Action tests for all 4 actions (error cases + success cases)
    - Proper mocking of `PositionService`, `hasRole`, and repository
    - All tests passing with proper type safety

- ✅ **Phase 3 – UI (`+page.svelte`)** - **COMPLETED**
  - ✅ Svelte 5 component implementation with runes
  - ✅ Grouped display (zone group → zone → position)
  - ✅ Create position modal with form
  - ✅ Edit position modal with form
  - ✅ Delete position confirmation modal
  - ✅ Reorder functionality (up/down buttons per zone)
  - ✅ Form error handling and success messages
  - ✅ Analytics tracking integration

- ⏳ **Phase 4 – Integration & Regression** - **PENDING**
  - Integration tests
  - QueueManager verification

## 1. Overview

This document describes how to manage church positions **in the context of a specific mass** using the **existing** `mass_zone` and `church_position` schema.  
No new database tables are introduced in this phase.

The feature adds an admin page `/admin/misa/[id]/positions` where church admins can:

- Create / edit / soft delete positions while working “by mass”
- See positions grouped by zone group → zone → position
- Control ordering of zones and positions as seen in schedules

## 2. Goals & Non‑Goals

### 2.1 Goals

- **G1**: Allow admins to manage positions from the perspective of a **single mass**.
- **G2**: Reuse the existing data model:
  - Mass ↔ Zone: `mass_zone`
  - Zone ↔ Position: `church_position`
- **G3**: Provide clear ordering:
  - Zones per mass ordered by `mass_zone.sequence`
  - Positions per zone ordered by `church_position.sequence`
- **G4**: Use **soft delete** for positions, preserving historical usher assignments.

### 2.2 Non‑Goals (for this phase)

- No per‑mass copy of positions (no mass‑specific position table).
- No changes to QueueManager or assignment algorithm behavior beyond what current queries already support.
- No changes to ERD structure other than documenting this flow.

## 3. Key Assumptions

- **A1**: A `church_position` always belongs to a **zone**; there is no direct position ↔ mass relation.
- **A2**: A mass uses zones through the `mass_zone` link. Positions are “by mass” when their zone is assigned to that mass.
- **A3**: **Zone group** is used only for reporting / grouping; positions are not directly tied to zone groups.
- **A4**: **Position sequence is per zone**, not per mass: reordering positions within a zone affects all masses using that zone.
- **A5**: Soft delete is implemented with `active = 0` on `church_position`.

## 4. Existing Design Summary

- `mass_zone`:
  - Links `mass` ↔ `church_zone`
  - Has `sequence` (zone order per mass) and `active`
- `church_position`:
  - Belongs to a `church_zone`
  - Has `type` (`usher | prodiakon | peta`), `isPpg`, `sequence`, `active`
- `listPositionByMass` (SQLite adapter):
  - Joins `church_position` + `church_zone` + `church_zone_group` + `mass_zone`
  - Filters by `churchId`, `massId`, `active` flags
  - Orders by `church_position.sequence` (to be confirmed / adjusted if needed)

This feature builds on top of these components without changing their structure.

## 5. Functional Requirements (Position by Mass)

### 5.1 Position Management in Mass Context

- **REQ-MASS-POS-001**  
  Admin users SHALL be able to manage positions within the context of a specific mass, scoped to zones assigned to that mass via `mass_zone`.

- **REQ-MASS-POS-002**  
  The system SHALL display positions for a given mass grouped by:
  - Zone group (for reporting/classification only)
  - Zone
  - Position (within each zone)

- **REQ-MASS-POS-003**  
  When managing positions by mass, the system SHALL only show positions (`church_position`) whose zones are:
  - assigned to that mass (`mass_zone.active = 1`), and
  - active themselves (`church_position.active = 1`).

- **REQ-MASS-POS-004**  
  Admin users SHALL be able to create new positions for a mass by:
  - selecting a zone assigned to that mass, and
  - creating a `church_position` record for that zone.

- **REQ-MASS-POS-005**  
  Admin users SHALL be able to edit existing positions (name, type, code, description, is_ppg) from the mass context; edits SHALL apply to the underlying `church_position` and therefore affect all masses that use that zone.

- **REQ-MASS-POS-006**  
  Admin users SHALL be able to deactivate (soft delete) positions from the mass context. Deactivation SHALL set `church_position.active = 0` and remove the position from all future assignments and lists while preserving historical `event_usher` records.

### 5.2 Ordering

- **REQ-MASS-POS-007**  
  The system SHALL order zones for a mass by `mass_zone.sequence` and positions within each zone by `church_position.sequence`.

- **REQ-MASS-POS-008**  
  Admin users SHALL be able to change position order within a zone from the mass context by updating `church_position.sequence`; this order SHALL apply to all masses that use the same zone.

### 5.3 Interaction with Mass Zone

- **REQ-MASS-POS-009**  
  When a zone is removed from a mass (deactivated `mass_zone`), positions for that zone SHALL no longer appear in the “positions by mass” view for that mass, but the underlying positions (`church_position`) SHALL remain unchanged.

- **REQ-MASS-POS-010**  
  When a zone is newly assigned to a mass (`mass_zone` created or reactivated), positions belonging to that zone and marked active SHALL automatically become available in the “positions by mass” view for that mass.

## 6. API & Service Design (High Level)

### 6.1 View DTO

A view model for “position by mass”:

```ts
export interface MassPositionView {
  massId: string;
  zoneId: string;
  zoneName: string;
  zoneGroupId: string | null;
  zoneGroupName: string | null;
  positionId: string;
  positionName: string;
  positionType: 'usher' | 'prodiakon' | 'peta';
  isPpg: boolean;
  positionSequence: number | null;
  positionActive: number;
}
```

### 6.2 Repository Interface (ScheduleRepository)

✅ **Implemented methods** (signatures finalized in Phase 1):

- `listPositionByMass(churchId: string, massId: string): Promise<ChurchPosition[]>`  
  Returns positions with extended zone/zone group info (accessed via type assertion in service).

- `createPosition(position: Omit<ChurchPosition, 'id' | 'church' | 'active'> & { zone: string }): Promise<ChurchPosition>`  
  Creates new position, generates UUID, returns with zone name.

- `updatePosition(positionId: string, patch: Partial<Pick<ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg'>>): Promise<ChurchPosition>`  
  Partial update, only sets provided fields, returns updated position.

- `softDeletePosition(positionId: string): Promise<void>`  
  Sets `active = 0` on position.

- `reorderZonePositions(zoneId: string, items: { id: string; sequence: number }[]): Promise<void>`  
  Updates position sequences within a zone using transaction.

### 6.3 Service: PositionService ✅ **IMPLEMENTED**

A dedicated service to encapsulate “position by mass” behavior:

- ✅ `retrievePositionsByMass(massId: string): Promise<MassPositionView[]>`  
  Validates `massId`, calls `repository.listPositionByMass()`, maps to `MassPositionView[]` with zone/zone group info.

- ✅ `createPositionForMass(massId: string, zoneId: string, input: CreatePositionInput): Promise<ChurchPosition>`  
  Validates `massId`, `zoneId`, `input.name`, `input.type`. Calls `repository.createPosition()`.  
  **Note**: Mass existence validation implemented in route layer (Phase 2). Zone assignment validation (zone must be assigned to mass) is a future enhancement.

- ✅ `editPosition(positionId: string, patch: UpdatePositionInput): Promise<ChurchPosition>`  
  Validates `positionId` and non-empty `patch`. Calls `repository.updatePosition()`.

- ✅ `deactivatePosition(positionId: string): Promise<void>`  
  Validates `positionId`. Calls `repository.softDeletePosition()`.

- ✅ `reorderZonePositions(zoneId: string, items: { id: string; sequence: number }[]): Promise<void>`  
  Validates `zoneId` and non-empty `items`. Calls `repository.reorderZonePositions()`.

**Validation status**:
- ✅ Input validation (required fields, non-empty arrays).
- ✅ Mass existence and ownership validation (implemented in Phase 2 route).
- ⏳ Zone assignment validation (zone must be assigned to mass via `mass_zone`) - TODO for future enhancement.
- ✅ Position type and required fields validation.

## 7. Route Design: `/admin/misa/[id]/positions`

### 7.1 Server (`+page.server.ts`) ✅ **IMPLEMENTED**

- ✅ **load**:
  - Authenticates and requires `admin` role (redirects if not authenticated/authorized).
  - Resolves `churchId` from session and `massId` from route params.
  - Validates mass exists and belongs to church.
  - Fetches concurrently:
    - Mass details via `repo.getMassById(massId)`.
    - `positionsByMass` via `PositionService.retrievePositionsByMass(massId)`.
  - Tracks analytics events (Statsig + PostHog).

- ✅ **actions**:
  - ✅ `create_position`: Creates new `church_position` under a zone assigned to this mass.
    - Validates authentication, admin role, churchId, massId, zoneId, name, type.
    - Calls `PositionService.createPositionForMass()`.
    - Returns success/error with appropriate error messages.
  - ✅ `edit_position`: Updates existing position fields (name, code, description, type, isPpg).
    - Validates authentication, admin role, positionId, non-empty patch.
    - Calls `PositionService.editPosition()`.
    - Supports partial updates.
  - ✅ `delete_position`: Soft deletes position by setting `active = 0`.
    - Validates authentication, admin role, positionId.
    - Calls `PositionService.deactivatePosition()`.
  - ✅ `reorder_positions`: Updates position sequences within a zone.
    - Validates authentication, admin role, zoneId, items array.
    - Parses and validates JSON items array.
    - Calls `PositionService.reorderZonePositions()`.

### 7.2 UI (`+page.svelte`)

- Mass header: name, day, time.
- Grouped list:
  - Zone group → zone → positions.
- Controls:
  - Add position (select zone + fields).
  - Edit / deactivate.
  - Change order (up/down or drag‑and‑drop per zone).

## 8. Phased Implementation & TDD Plan

### Phase 1 – Domain & Service (TDD) ✅ **COMPLETED**

- ✅ Added / refined:
  - ✅ `MassPositionView` DTO in `core/entities/Schedule.ts`.
  - ✅ `ScheduleRepository` method signatures:
    - `listPositionByMass(churchId, massId): Promise<ChurchPosition[]>`
    - `createPosition(position): Promise<ChurchPosition>`
    - `updatePosition(positionId, patch): Promise<ChurchPosition>`
    - `softDeletePosition(positionId): Promise<void>`
    - `reorderZonePositions(zoneId, items): Promise<void>`
  - ✅ `PositionService` fully implemented with all methods.
- ✅ **TDD Completed**:
  - ✅ Created `PositionService.test.ts` with 13 comprehensive tests.
  - ✅ Mocked `ScheduleRepository` for all test scenarios.
  - ✅ Tests cover:
    - ✅ `retrievePositionsByMass` → calls repo with `churchId`, `massId`, maps to `MassPositionView[]`.
    - ✅ `createPositionForMass` → validates inputs, calls `createPosition`.
    - ✅ `editPosition` → validates inputs, calls `updatePosition`.
    - ✅ `deactivatePosition` → validates input, calls `softDeletePosition`.
    - ✅ `reorderZonePositions` → validates inputs, calls `reorderZonePositions`.
  - ✅ All service methods implemented to satisfy tests.
  - ✅ All repository methods wired in SQLite adapter (`SQLiteDbFacility.ts`).
  - ✅ All tests passing (13/13).

### Phase 2 – Route API (`+page.server.ts`) ✅ **COMPLETED**

- ✅ Implemented `load` + `actions` using `PositionService`.
- ✅ **TDD Completed**:
  - ✅ Created `page.server.test.ts` with 23 comprehensive tests.
  - ✅ All tests passing:
    - ✅ Load function tests:
      - Authentication and authorization checks
      - Validation errors (missing churchId, missing massId, mass not found, mass doesn't belong to church)
      - Happy path (loads mass and positions successfully)
    - ✅ Action tests for all 4 actions:
      - `create_position`: auth checks, validation errors, success case, ServiceError handling
      - `edit_position`: auth checks, validation errors, success case
      - `delete_position`: auth checks, validation errors, success case
      - `reorder_positions`: auth checks, validation errors, success case
  - ✅ Proper mocking:
    - `PositionService` mocked with all methods
    - `hasRole` mocked for authorization checks
    - `repo.getMassById` mocked for mass lookup
    - Proper type safety with `ServerLoadEvent` and `RequestEvent` mocks
  - ✅ All tests passing (23/23).

### Phase 3 – UI (`+page.svelte`)

- Build Svelte 5 runes‑based page consuming server data.
- Basic interactions via `enhance` + form actions.

### Phase 4 – Integration & Regression

- Verify `QueueManager` and existing schedule views still behave correctly:
  - Ensure `listPositionByMass` has the expected shape and filters.
- Add targeted integration tests (Playwright) for `/admin/misa/[id]/positions`.

