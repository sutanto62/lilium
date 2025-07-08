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
2. **Position uniqueness (in Sequential Mode)**: Each position can be assigned to at most one usher per event
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

**Complexity:** O(|E| × |U| × |P|) where E is events, U is ushers per event, P is positions per event.

This is essentially a **constrained bipartite matching problem** with additional role-based constraints and fair distribution requirements.
