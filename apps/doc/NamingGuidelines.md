# Clean Architecture Layer Naming Conventions Guide

## 🏗️ Domain Layer

**What it does**: Core business logic, entities, and rules - the heart of your app

### Naming Patterns

| Component         | Pattern           | Good Example                             | Bad Example                       |
| ----------------- | ----------------- | ---------------------------------------- | --------------------------------- |
| **Entities**      | Simple nouns      | `Zone`, `UsherPosition`, `Member`        | `ZoneEntity`, `UsherPositionData` |
| **Value Objects** | Descriptive nouns | `Email`, `PhoneNumber`, `Address`        | `EmailVO`, `PhoneData`            |
| **Domain Errors** | Noun + Error      | `ZoneNotFoundError`, `InvalidEmailError` | `ZoneException`, `EmailErr`       |
| **Domain Events** | Noun + Past tense | `ZoneCreated`, `UsherAssigned`           | `CreateZoneEvent`, `AssignUsher`  |

**Why these names?**

- Keep it simple - these are your core business concepts
- No tech jargon or suffixes unless it's an error
- Should read like plain English

---

## 🔧 Application Layer (Services)

**What it does**: Orchestrates business logic, handles use cases

### Naming Patterns

| Component              | Pattern                    | Good Example                                   | Bad Example                   |
| ---------------------- | -------------------------- | ---------------------------------------------- | ----------------------------- |
| **Service Interfaces** | Entity + Action + Service  | `ZoneCreationService`, `UsherRetrievalService` | `ZoneService`, `ManageUsher`  |
| **Service Methods**    | action + Entity + [detail] | `createZone()`, `retrieveUshersByZone()`       | `addZone()`, `getUshers()`    |
| **Use Case Classes**   | Action + Entity + UseCase  | `CreateZoneUseCase`, `AssignUsherUseCase`      | `ZoneCreator`, `UsherManager` |

### Action Verbs to Use

| Action       | When to Use            | Example                                        |
| ------------ | ---------------------- | ---------------------------------------------- |
| **Create**   | Making new stuff       | `createZone()`, `createUsherPosition()`        |
| **Retrieve** | Getting existing data  | `retrieveZoneById()`, `retrieveActiveUshers()` |
| **Update**   | Changing existing data | `updateZoneCapacity()`, `updateUsherDetails()` |
| **Delete**   | Removing data          | `deleteZone()`, `deactivateUsherPosition()`    |
| **List**     | Getting collections    | `listAllZones()`, `listUshersByZone()`         |
| **Search**   | Finding with criteria  | `searchZonesByName()`, `searchUshersBySkill()` |

**Why these names?**

- Crystal clear what each service does
- Actions are business-focused (retrieve vs get, create vs add)
- Easy to group related functionality

---

## 🗄️ Infrastructure Layer (Repositories)

**What it does**: Abstract data access, hide database details

### Naming Patterns

| Component                | Pattern                           | Good Example                                  | Bad Example                         |
| ------------------------ | --------------------------------- | --------------------------------------------- | ----------------------------------- |
| **Repository Interface** | Entity + Repository               | `ZoneRepository`, `UsherPositionRepository`   | `ZoneRepo`, `IZoneRepository`       |
| **Repository Methods**   | Data verb + Entity + [detail]     | `persistZone()`, `findZoneById()`             | `saveZone()`, `getZone()`           |
| **Query Methods**        | find/query + Entity + ByCondition | `findActiveZones()`, `queryZonesByCapacity()` | `getActiveZones()`, `searchZones()` |

### Data Verbs to Use

| Verb        | Purpose                      | Example                                          |
| ----------- | ---------------------------- | ------------------------------------------------ |
| **persist** | Save new or updated data     | `persistZone()`, `persistUsherPosition()`        |
| **find**    | Get specific data            | `findZoneById()`, `findUshersByZone()`           |
| **query**   | Search with complex criteria | `queryZonesByFilters()`, `queryUshersBySkills()` |
| **list**    | Get all items                | `listAllZones()`, `listActiveUshers()`           |
| **update**  | Modify existing data         | `updateZone()`, `updateUsherStatus()`            |
| **remove**  | Delete data                  | `removeZone()`, `removeUsherPosition()`          |

**Why these names?**

- Data-focused verbs (persist instead of create, find instead of get)
- Clearly separated from business logic
- Same interface, different implementations

---

## 💾 Data Access Layer (Adapters)

**What it does**: Actual database operations, SQL queries, file I/O

### Naming Patterns

| Component            | Pattern                       | Good Example                             | Bad Example                    |
| -------------------- | ----------------------------- | ---------------------------------------- | ------------------------------ |
| **Adapter Classes**  | Technology + Entity + Adapter | `SQLiteZoneAdapter`, `MongoUsherAdapter` | `ZoneDAO`, `UsherRepository`   |
| **Database Methods** | Same as repository            | `persistZone()`, `findZoneById()`        | `insertZone()`, `selectZone()` |
| **Private Helpers**  | Database operation            | `mapRowToZone()`, `buildInsertQuery()`   | `convertZone()`, `makeQuery()` |

### Implementation Examples

```typescript
// ✅ Good - Technology-specific implementation
class SQLiteZoneAdapter implements ZoneRepository {
	async persistZone(zone: Zone): Promise<Zone> {
		// SQL INSERT logic
	}

	async findZoneById(id: string): Promise<Zone | null> {
		// SQL SELECT logic
	}
}

// ✅ Good - Different tech, same interface
class MongoZoneAdapter implements ZoneRepository {
	async persistZone(zone: Zone): Promise<Zone> {
		// MongoDB save logic
	}

	async findZoneById(id: string): Promise<Zone | null> {
		// MongoDB findOne logic
	}
}
```

**Why these names?**

- Technology prefix shows what database you're using
- Same method names as repository (implementation detail)
- Easy to swap databases without changing business logic

---

## 🌐 Presentation Layer (Controllers/API)

**What it does**: Handle HTTP requests, UI interactions, external communication

### Naming Patterns

| Component              | Pattern                       | Good Example                                       | Bad Example                    |
| ---------------------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| **Controller Classes** | Entity + Purpose + Controller | `ZoneManagementController`, `UsherAdminController` | `ZoneController`, `UsherAPI`   |
| **HTTP Methods**       | HTTP verb + Entity + [detail] | `postZone()`, `getZoneById()`, `putZoneDetails()`  | `createZone()`, `updateZone()` |
| **Route Handlers**     | Handle + HttpVerb + Entity    | `handlePostZone()`, `handleGetZones()`             | `processZoneCreation()`        |

### HTTP Method Mapping

| HTTP Verb  | Method Name                 | Purpose                 | Example                                   |
| ---------- | --------------------------- | ----------------------- | ----------------------------------------- |
| **POST**   | `postEntity()`              | Create new resource     | `postZone()`, `postUsherPosition()`       |
| **GET**    | `getEntity[ById/Details]()` | Retrieve resource       | `getZoneById()`, `getUshersByZone()`      |
| **PUT**    | `putEntity()`               | Replace entire resource | `putZone()`, `putUsherPosition()`         |
| **PATCH**  | `patchEntity[Field]()`      | Update part of resource | `patchZoneStatus()`, `patchUsherSkills()` |
| **DELETE** | `deleteEntity()`            | Remove resource         | `deleteZone()`, `deleteUsherPosition()`   |

**Why these names?**

- HTTP verbs make REST API clear
- Maps directly to HTTP methods
- Easy for frontend devs to understand

---

## 🎯 Quick Reference Cheat Sheet

| Layer              | What It Does       | Key Pattern               | Example                    |
| ------------------ | ------------------ | ------------------------- | -------------------------- |
| **Domain**         | Business rules     | Simple nouns              | `Zone`, `UsherPosition`    |
| **Application**    | Use cases          | Entity + Action + Service | `ZoneCreationService`      |
| **Infrastructure** | Data contracts     | Entity + Repository       | `ZoneRepository`           |
| **Data Access**    | Database ops       | Tech + Entity + Adapter   | `SQLiteZoneAdapter`        |
| **Presentation**   | External interface | Entity + Controller       | `ZoneManagementController` |

## 🚀 Pro Tips

1. **Stay Consistent**: Once you pick a pattern, stick with it across the entire project
2. **Be Descriptive**: `retrieveActiveUshersByZone()` is better than `getUshers()`
3. **Layer-Specific Verbs**: Each layer has its own vocabulary (create vs persist vs post)
4. **Avoid Abbreviations**: `UsherPositionRepository` not `UsherPosRepo`
5. **Think About Your Team**: Names should be obvious to new developers

## 🤔 Common Mistakes to Avoid

❌ **Don't mix layer concerns in names**

```typescript
// Bad - service doing repository naming
createZoneInDatabase();

// Good - each layer has its own vocabulary
Service: createZone();
Repository: persistZone();
```

❌ **Don't use generic verbs everywhere**

```typescript
// Bad - everything is "get"
getZone(), getUshers(), getActiveZones();

// Good - specific to purpose
retrieveZone(), findUshers(), listActiveZones();
```

❌ **Don't leak implementation details upward**

```typescript
// Bad - domain knowing about SQL
findZoneBySQL();

// Good - domain stays pure
findZoneById();
```
