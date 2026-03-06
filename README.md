# 💧 Water Jug Problem - Depth First Search

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Algorithm](https://img.shields.io/badge/Algorithm-DFS-orange.svg)](https://en.wikipedia.org/wiki/Depth-first_search)
[![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-red.svg)](https://jupyter.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📋 Overview

A comprehensive implementation of the classic **Water Jug Problem** using **Depth-First Search (DFS)** algorithm. This classical AI problem demonstrates state-space search techniques and backtracking strategies.

Given two jugs with different capacities, find the optimal sequence of operations to measure a target volume of water.

---

## 🎯 Problem Definition

### Problem Statement
Given two containers (Jug 1 and Jug 2):
- **Jug 1 Capacity:** 4 liters
- **Jug 2 Capacity:** 3 liters
- **Goal:** Measure exactly **2 liters** of water in one of the jugs

### State Space Representation
Each state is represented as a tuple `(x, y)` where:
- `x` ∈ [0, 4] - Amount of water in Jug 1
- `y` ∈ [0, 3] - Amount of water in Jug 2

### Initial State
`(0, 0)` - Both jugs empty

### Goal State 
`(2, y)` or `(x, 2)` where either jug contains exactly 2 liters

---

## ⚙️ Allowed Operations

| Operation | Description | State Transition |
|-----------|-------------|------------------|
| **Fill Jug 1** | Fill Jug 1 completely | `(x, y) → (4, y)` |
| **Fill Jug 2** | Fill Jug 2 completely | `(x, y) → (x, 3)` |
| **Empty Jug 1** | Empty Jug 1 completely | `(x, y) → (0, y)` |
| **Empty Jug 2** | Empty Jug 2 completely | `(x, y) → (x, 0)` |
| **Pour 1→2** | Pour Jug 1 into Jug 2 | `(x, y) → (x-a, y+a)` |
| **Pour 2→1** | Pour Jug 2 into Jug 1 | `(x, y) → (x+a, y-a)` |

---

## 🔄 Algorithm Details

### Search Strategy: Depth-First Search (DFS)

**Time Complexity:** O(4×3) = O(12) states maximum
**Space Complexity:** O(h) where h is the maximum depth

### Implementation Features

```python
class WaterJugProblem:
    ├── __init__(jug1, jug2, goal)      # Initialize with capacities
    ├── check_goal(state)               # Verify if goal state reached
    ├── possible_moves(state)           # Generate all valid next states
    ├── dfs(current_state)              # Main DFS search algorithm
    ├── solve()                         # Solve the problem
    └── print_solution()                # Display the solution path
```

### Solution Output
- **Search Path:** All visited states
- **Operations List:** Detailed operations at each step
- **Total Moves:** Minimum number of steps to reach goal

---

## 📁 Project Structure

```
Task 03/
├── README.md              # This file
├── Waterjug.ipynb         # Complete solution notebook
└── [output files]         # Generated solution outputs
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- Jupyter Notebook / JupyterLab
- Required libraries: None (uses only Python standard library)

### Installation

```bash
# Clone the repository
git clone https://github.com/ShumailaMaryam062/S26-Programming-for-AI-Lab.git

# Navigate to Task 03
cd "Task 03"

# Launch Jupyter
jupyter notebook Waterjug.ipynb
```

### Usage

1. Open `Waterjug.ipynb` in Jupyter Notebook
2. Modify jug capacities and goal (optional):
   ```python
   jug1_capacity = 4  # Jug 1 capacity
   jug2_capacity = 3  # Jug 2 capacity
   goal_liters = 2    # Target amount
   ```
3. Run all cells sequentially
4. View the complete solution path and operations

---

## 📊 Example Execution

```
Enter capacity of Jug 1 (liters): 4
Enter capacity of Jug 2 (liters): 3
Enter the goal amount to measure (liters): 2

Found solution!
Jug 1: 4L, Jug 2: 3L, Target: 2L

Path:
0: (0, 0)
1: (4, 0)
2: (1, 3)
3: (1, 0)
4: (0, 1)
5: (4, 1)
6: (2, 3)

Operations:
1: Fill jug 1: (0, 0) => (4, 0)
2: Pour jug 1 to 2: (4, 0) => (1, 3)
3: Empty jug 2: (1, 3) => (1, 0)
4: Pour jug 1 to 2: (1, 0) => (0, 1)
5: Fill jug 1: (0, 1) => (4, 1)
6: Pour jug 1 to 2: (4, 1) => (2, 3)

Total moves: 6
```

---

## 💡 Key Concepts

- **State Space Search:** Exploring all possible states to find the goal
- **Backtracking:** Retracing steps when a dead-end is encountered
- **Graph Theory:** Treating states as nodes and operations as edges
- **Artificial Intelligence:** Classic problem in search algorithms

---

## 🎓 Learning Outcomes

✓ Understanding of state-space representation
✓ Implementation of DFS algorithm
✓ Backtracking strategies
✓ Problem-solving approach in AI
✓ Path-finding techniques

---

## 📝 Notes

- Not all capacity combinations have a solution
- The solution finds a valid path, not necessarily the shortest path (for BFS use instead)
- Multiple solutions may exist for the same problem

---

## 📚 References

- [Depth-First Search - Wikipedia](https://en.wikipedia.org/wiki/Depth-first_search)
- [State Space Search - AI Course](https://en.wikipedia.org/wiki/State_space_search)
- [Classic AI Problems](https://en.wikipedia.org/wiki/Category:AI_problems)

---

## ✉️ Contact & Support

For questions or suggestions, please contact:
- **Email:** shumailamaryam039@gmail.com
- **GitHub:** [ShumailaMaryam062](https://github.com/ShumailaMaryam062)

---

**Last Updated:** February 2026
**Version:** 1.0

