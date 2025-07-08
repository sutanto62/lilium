## Problem Definition: Church Usher Position Assignment with Role-Based Round-Robin Distribution

**Input:**

- A set of church events E = {e₁, e₂, ..., eₙ}
- For each event eᵢ:
  - A set of ushers Uᵢ = {u₁, u₂, ..., uₘ} where each usher uⱼ has:
    - Role type: rⱼ ∈ {PPG, non-PPG}
    - Assignment status: aⱼ ∈ {assigned, unassigned}
    - Current position: pⱼ ∈ P ∪ {null}
  - A set of available positions Pᵢ = {p₁, p₂, ..., pₖ} where each position pₗ has:
    - Zone: zₗ
    - Type: tₗ ∈ {PPG, non-PPG}
    - Availability: available(pₗ) ∈ {true, false}

**Constraints:**

1. **Role-based assignment**: PPG ushers can only be assigned to PPG positions
2. **Position uniqueness**: Each position can be assigned to at most one usher per event
3. **Feature flag constraints**:
   - If PPG feature is disabled: all positions must be non-PPG type
   - If round-robin feature is enabled: use round-robin distribution; otherwise use sequential assignment

**Objective:**
Find an assignment function A: U → P ∪ {null} that:

1. Maximizes the number of assigned ushers
2. Respects all role-based and uniqueness constraints
3. Implements fair distribution based on feature flags:
   - **Round-robin mode**: Distribute positions cyclically among available ushers
   - **Sequential mode**: Assign positions in order until exhaustion

**Algorithm:**

```
For each event e in queue:
  1. Separate ushers by role: U_ppg, U_non_ppg
  2. Separate positions by type: P_ppg, P_non_ppg
  3. Filter available positions (exclude already assigned)
  4. If PPG enabled:
     - Assign PPG ushers to available PPG positions using distribution strategy
     - Assign non-PPG ushers to available non-PPG positions using distribution strategy
  5. Else:
     - Assign all ushers to available non-PPG positions using distribution strategy
  6. Update database with new assignments
```

**Distribution Algorithm Details:**

### Round-Robin Mode (`isRoundRobinEnabled = true`)

- **Position Selection**: Uses modulo operation to cycle through all available positions
- **Position Availability**: All positions are considered available (no filtering of already assigned positions)
- **Index Calculation**: `nextIndex = currentIndex % positionsLength`
- **Behavior**: Ensures fair rotation across all positions, allowing multiple ushers to be assigned to the same position if needed

### Sequential Mode (`isRoundRobinEnabled = false`)

- **Position Selection**: Assigns positions in order until exhaustion
- **Position Availability**: Filters out already assigned positions to maintain uniqueness
- **Index Calculation**: `nextIndex = currentIndex` (only if `currentIndex < positionsLength`)
- **Behavior**: Ensures each position is assigned to at most one usher per event

### Special Notes on Distribution Strategy:

1. **Round-Robin with Position Tracking**: The system maintains separate indices (`nextIndexPpg`, `nextIndexNonPpg`) for different role types to ensure fair distribution across multiple events.

2. **Latest Position Detection**: Before assignment, the system finds the latest unique position ID to determine the starting point for the next round-robin cycle.

3. **Partial Assignment Handling**: When some ushers already have positions assigned, the algorithm:
   - Identifies the latest unique position to continue the round-robin cycle
   - Handles cases where positions are partially assigned vs. fully assigned

4. **Role-Based Separation**:
   - PPG ushers and positions are handled separately from non-PPG
   - Each role type maintains its own round-robin cycle
   - When PPG is disabled, all ushers are assigned to non-PPG positions only

5. **Error Handling**: The system logs warnings when:
   - No available positions for a specific role type
   - Ushers cannot be assigned due to position exhaustion
   - Ushers remain unassigned after processing

**Complexity:** O(|E| × |U| × |P|) where E is events, U is ushers per event, P is positions per event.

This is essentially a **constrained bipartite matching problem** with additional role-based constraints and fair distribution requirements.
