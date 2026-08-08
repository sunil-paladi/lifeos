# LifeOS Workout Module — Architecture & Development Guide

## Purpose

This document explains the Workout Module from Pack 1A through Pack 1F. It is designed so another developer can understand the folder structure, every important file, what each file does, what changed in each pack, the user actions, and the data flow.

**Current status:** Packs 1A–1E are complete. Pack 1F is the next development phase.

---

# 1. High-Level Architecture

The Workout Module has three important layers.

### Master Exercise Database

`app/data/exercises.ts`

Contains the exercises available in LifeOS.

```text
Chest
 ├── Bench Press
 ├── Incline Dumbbell Press
 └── Cable Fly
```

This is the **master catalog**, not the user's personal workout.

### User Program State

`app/context/ProgramContext.tsx`

Stores what the user selected for their program.

```text
Monday
└── Chest
    ├── Bench Press
    │   ├── Sets: 4
    │   ├── Reps: 10
    │   └── Rest: 90
    └── Incline Dumbbell Press
        ├── Sets: 3
        ├── Reps: 12
        └── Rest: 60
```

### Workout Execution

Pack 1F turns the saved program into the workout the user performs.

```text
Exercise Database
       ↓
Program Builder
       ↓
Saved Program
       ↓
Today's Workout
       ↓
Completed Sets
       ↓
Workout History
```

---

# 2. Current Folder Structure

```text
app/
│
├── context/
│   ├── ProgramContext.tsx
│   └── WorkoutContext.tsx
│
├── data/
│   ├── exercises.ts
│   ├── exerciseLibrary.ts
│   ├── testExercises.ts
│   └── validateExercises.ts
│
├── components/
│   └── planner/
│       ├── ProgramBuilder.tsx
│       ├── WeekPlanner.tsx
│       ├── DayCard.tsx
│       ├── MuscleDrawer.tsx
│       ├── MuscleBadge.tsx
│       ├── MuscleGroupList.tsx
│       ├── ExerciseLibrary.tsx
│       ├── ExerciseSelector.tsx
│       └── ExerciseCard.tsx
│
└── ...other LifeOS files
```

---

# 3. Important Data Files

## `app/data/exercises.ts`

### Responsibility

Main exercise database organized by:

```text
Chest
Back
Legs
Shoulders
Biceps
Triceps
Forearms
Abs
Cardio
```

Each exercise contains:

```text
id
bodyPart
name
image
primaryMuscle
secondaryMuscles
equipment
difficulty
sets
reps
completed
instructions
```

### Current database

```text
Chest       8
Back        8
Legs        8
Shoulders   8
Biceps      6
Triceps     6
Forearms    5
Abs         8
Cardio      8
----------------
Total      65
```

**Architecture rule:** this is the master list of available exercises, not the user's personal program.

---

# 4. Validation Files

## `app/data/validateExercises.ts`

Checks:

- missing fields
- duplicate IDs
- invalid sets
- invalid reps
- missing instructions
- invalid secondary-muscle data
- empty categories

## `app/data/testExercises.ts`

Development-only validation runner.

Expected result:

```text
Chest: 8 exercises
Back: 8 exercises
Legs: 8 exercises
Shoulders: 8 exercises
Biceps: 6 exercises
Triceps: 6 exercises
Forearms: 5 exercises
Abs: 8 exercises
Cardio: 8 exercises

✅ Exercise database is valid
```

---

# 5. Pack 1A — Exercise Library Foundation

## Goal

Create the basic exercise library.

### Main files

```text
app/components/planner/
├── ExerciseLibrary.tsx
└── ExerciseCard.tsx

app/data/
├── exercises.ts
└── exerciseLibrary.ts
```

### `ExerciseLibrary.tsx`

Displays exercises for the selected category.

### `ExerciseCard.tsx`

Displays one exercise and its basic completion UI.

### User flow

```text
Open Exercise Library
      ↓
Choose muscle group
      ↓
See exercises
      ↓
Select/complete exercise
```

---

# 6. Pack 1B — Program Builder Foundation

## Goal

Create the weekly program-building structure.

### Main files

```text
ProgramBuilder.tsx
WeekPlanner.tsx
DayCard.tsx
```

### `ProgramBuilder.tsx`

Responsible for:

- Program Builder heading
- Week 1–Week 12
- selected-week state
- displaying the selected week
- Save Program button

### `WeekPlanner.tsx`

Displays the days of the selected week.

### `DayCard.tsx`

Represents one day:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

### User flow

```text
Program Builder
      ↓
Select Week
      ↓
Select Day
      ↓
Add Muscle Group
```

---

# 7. Pack 1C — Muscle Group Builder

## Goal

Assign muscle groups to each day.

### Main files

```text
MuscleDrawer.tsx
MuscleBadge.tsx
MuscleGroupList.tsx
```

### `MuscleDrawer.tsx`

Muscle selection drawer.

Current categories:

```text
Chest
Back
Legs
Shoulders
Biceps
Triceps
Forearms
Abs
Cardio
```

User:

1. opens Add Muscle Group
2. selects one or more groups
3. clicks Save Muscle Groups
4. drawer closes
5. selected groups appear on the day

Example:

```text
Monday

Chest
Triceps
```

### `MuscleBadge.tsx`

Displays a selected muscle group and later became the connection point for exercises.

### `MuscleGroupList.tsx`

Displays muscle-group choices.

---

# 8. Pack 1D — Exercise Database

## Goal

Build the master exercise catalog before connecting it to the Program Builder.

### Sub-packs

```text
1D-1  Chest
1D-2  Back
1D-3  Legs
1D-4  Shoulders
1D-5  Biceps
1D-6  Triceps
1D-7  Forearms
1D-8  Abs
1D-9  Cardio
1D-10 Database Validation
```

## 1D-1 Chest

8 exercises:

```text
Barbell Bench Press
Incline Dumbbell Press
Machine Chest Press
Pec Deck
Cable Fly
Chest Dips
Push-Up
Decline Bench Press
```

## 1D-2 Back

8 exercises:

```text
Lat Pulldown
Seated Cable Row
Hammer Strength Row
Single Arm Dumbbell Row
Assisted Pull-Up
Face Pull
Straight Arm Pulldown
Back Extension
```

## 1D-3 Legs

8 exercises:

```text
Leg Press
Goblet Squat
Leg Extension
Seated Leg Curl
Lying Leg Curl
Bulgarian Split Squat
Romanian Deadlift
Standing Calf Raise
```

## 1D-4 Shoulders

8 exercises:

```text
Seated Dumbbell Shoulder Press
Machine Shoulder Press
Dumbbell Lateral Raise
Cable Lateral Raise
Rear Delt Fly
Reverse Pec Deck
Dumbbell Front Raise
Face Pull
```

## 1D-5 Biceps

6 exercises:

```text
Barbell Curl
Dumbbell Bicep Curl
Hammer Curl
Incline Dumbbell Curl
Preacher Curl
Cable Bicep Curl
```

## 1D-6 Triceps

6 exercises:

```text
Rope Tricep Pushdown
Overhead Dumbbell Tricep Extension
Skull Crusher
Close Grip Bench Press
Tricep Dips
Single Arm Cable Pushdown
```

## 1D-7 Forearms

5 exercises:

```text
Wrist Curl
Reverse Wrist Curl
Farmer's Carry
Reverse Barbell Curl
Dead Hang
```

## 1D-8 Abs

8 exercises:

```text
Crunch
Plank
Dead Bug
Hanging Knee Raise
Reverse Crunch
Bicycle Crunch
Russian Twist
Bird Dog
```

## 1D-9 Cardio

8 exercises:

```text
Treadmill Walking
Treadmill Jogging
Stationary Cycling
Elliptical
Rowing Machine
Stair Climber
Jumping Jacks
Outdoor Jogging
```

## 1D-10 Validation

Confirmed:

```text
65 total exercises
No duplicate IDs
Required fields present
Valid sets/reps
Instructions present
```

Result:

```text
✅ Exercise database is valid
```

---

# 9. Pack 1E — Program Builder Engine

## Goal

Connect the master exercise database to the user's program.

Overall flow:

```text
Day
 ↓
Muscle Group
 ↓
Add Exercise
 ↓
Exercise Selector
 ↓
Select Exercises
 ↓
Save
 ↓
ProgramContext
```

---

# 10. 1E-1 — Exercise Selector

## File

`app/components/planner/ExerciseSelector.tsx`

### Responsibility

Shows exercises belonging to the selected muscle.

Example:

```text
Chest

☐ Bench Press
☐ Incline Dumbbell Press
☐ Machine Chest Press
☐ Pec Deck
...
```

User can select multiple exercises.

---

# 11. 1E-2 — Muscle → Exercise Connection

## File

`MuscleBadge.tsx`

Each muscle group has:

```text
+ Add Exercise
```

Flow:

```text
Chest
 ↓
Add Exercise
 ↓
Exercise Selector
 ↓
Select exercises
 ↓
Save Exercises
```

---

# 12. 1E-3 — ProgramContext

## File

`app/context/ProgramContext.tsx`

### Responsibility

Central state for the Program Builder.

It stores:

```text
Day
 └── Muscle Group
      └── Program Exercise
```

A program exercise stores:

```text
id
sets
reps
rest
```

Important distinction:

```text
exercises.ts
= What exercises exist?

ProgramContext
= What exercises did the user choose?
```

---

# 13. 1E-4 — Display Selected Exercises

`MuscleBadge.tsx` displays actual selected exercise names.

Example:

```text
Chest

✓ Bench Press
  4 sets × 10 reps • Barbell

✓ Incline Dumbbell Press
  3 sets × 12 reps • Dumbbells
```

---

# 14. 1E-5 — Edit / Remove Exercises

User can:

```text
Edit Exercises
Remove exercise
```

Edit opens the selector with existing selections checked.

Remove removes the exercise from the program.

---

# 15. 1E-6 — Sets / Reps / Rest

Each selected exercise can be customized.

Example:

```text
Bench Press

Sets: 4
Reps: 10
Rest: 90 sec
```

The database provides defaults, but the program can override them.

Architecture:

```text
Exercise Database
→ Default values

User Program
→ Actual planned values
```

---

# 16. 1E-7 — Exercise Ordering

User can move exercises with:

```text
↑ Move Up
↓ Move Down
```

Example:

Before:

```text
1. Bench Press
2. Incline Press
3. Cable Fly
```

After moving Cable Fly up:

```text
1. Bench Press
2. Cable Fly
3. Incline Press
```

The order is stored in `ProgramContext`.

The first exercise cannot move up and the last exercise cannot move down.

---

# 17. 1E-8 — Save Program & Persistence

## Files

```text
ProgramContext.tsx
ProgramBuilder.tsx
```

### `ProgramContext.tsx`

Uses browser `localStorage`.

Storage key:

```text
lifeos-workout-program
```

The workout program is automatically saved when state changes.

### `ProgramBuilder.tsx`

Contains the Save Program button.

Flow:

```text
Save Program
     ↓
saveProgram()
     ↓
localStorage
     ↓
✓ Program Saved
```

The UI displays:

```text
✓ Program Saved
```

for approximately 3 seconds.

### Refresh behavior

```text
Browser Refresh
 ↓
ProgramContext loads localStorage
 ↓
Program restored
```

---

# 18. Pack 1F — Today's Workout

## Goal

Turn the saved Program Builder data into the workout the user actually performs.

### Planned sub-packs

```text
1F-1  Today's Workout screen
1F-2  Load today's program
1F-3  Display exercises
1F-4  Set completion
1F-5  Weight tracking
1F-6  Workout progress
1F-7  Finish Workout
1F-8  Save workout history
```

---

# 19. 1F-1 — Today's Workout Screen

### Goal

Create the basic workout screen.

Example:

```text
Today's Workout

Monday
Chest

┌──────────────────────────┐
│ Bench Press              │
│ 4 sets × 10 reps         │
│ Rest: 90 sec             │
│                          │
│ Start Exercise           │
└──────────────────────────┘

┌──────────────────────────┐
│ Incline Dumbbell Press   │
│ 3 sets × 12 reps         │
│ Rest: 60 sec             │
│                          │
│ Start Exercise           │
└──────────────────────────┘

Progress
0 / 2 exercises completed
```

First create the screen; connection to the saved program happens in 1F-2.

---

# 20. 1F-2 — Load Today's Program

Today's Workout will:

1. determine today's day
2. read the saved program
3. find today's muscle groups
4. find today's exercises

Flow:

```text
Today's date
     ↓
Determine today's day
     ↓
Saved program
     ↓
Today's muscle groups
     ↓
Today's exercises
```

Example:

```text
Monday
 ↓
Chest
 ↓
Bench Press
Incline Press
Cable Fly
```

---

# 21. 1F-3 — Display Exercises

Each selected exercise displays:

```text
Exercise name
Sets
Reps
Rest
Equipment
```

Today's Workout should show only exercises planned for that day.

The complete Exercise Library does not need to appear here.

---

# 22. 1F-4 — Set Completion

User can mark individual sets complete.

Example:

```text
Bench Press

Set 1   10 reps   ✓
Set 2   10 reps   ✓
Set 3   10 reps   ○
Set 4   10 reps   ○
```

Important difference:

```text
Program Builder
= What should I do?

Today's Workout
= What am I doing now?
```

---

# 23. 1F-5 — Weight Tracking

User records actual weight.

Example:

```text
Bench Press

Set 1
Weight: 40 kg
Reps: 10
✓

Set 2
Weight: 40 kg
Reps: 10
✓
```

This data will later support progress tracking.

---

# 24. 1F-6 — Workout Progress

Display progress such as:

```text
Workout Progress

6 / 12 sets completed

50%
```

Future metrics:

```text
Exercises completed
Sets completed
Total volume
Workout duration
Calories
```

---

# 25. 1F-7 — Finish Workout

When the user selects:

```text
Finish Workout
```

the system should:

1. verify completion
2. calculate summary
3. mark the session complete
4. prepare the history record

Example:

```text
Workout Complete 🎉

Exercises: 5
Sets: 18
Duration: 52 min
```

---

# 26. 1F-8 — Save Workout History

Workout execution data must eventually be stored separately from the program.

Important distinction:

```text
Program
=
What the user planned to do
```

versus:

```text
Workout History
=
What the user actually did
```

Example:

```text
Program:
Bench Press
4 × 10
```

Actual history:

```text
Bench Press

Set 1 → 40 kg × 10
Set 2 → 40 kg × 10
Set 3 → 42.5 kg × 8
Set 4 → 42.5 kg × 8
```

This separation enables future progress charts and analytics.

---

# 27. File Responsibility Summary

| File | Responsibility |
|---|---|
| `app/data/exercises.ts` | Master exercise catalog |
| `app/data/exerciseLibrary.ts` | Earlier/simple library data |
| `app/data/validateExercises.ts` | Database validation |
| `app/data/testExercises.ts` | Development validation runner |
| `app/context/ProgramContext.tsx` | Current workout program state |
| `app/context/WorkoutContext.tsx` | Existing workout-related state |
| `ProgramBuilder.tsx` | Program creation UI |
| `WeekPlanner.tsx` | Weekly day layout |
| `DayCard.tsx` | One day of the program |
| `MuscleDrawer.tsx` | Add/edit muscle groups |
| `MuscleBadge.tsx` | Muscle group + selected exercises |
| `MuscleGroupList.tsx` | Muscle group choices |
| `ExerciseSelector.tsx` | Select exercises |
| `ExerciseLibrary.tsx` | Browse exercise library |
| `ExerciseCard.tsx` | Individual exercise card |

---

# 28. Complete User Flow

## A. Create Program

```text
Program Builder
      ↓
Select Week
      ↓
Select Day
      ↓
Add Muscle Group
      ↓
Select Chest
      ↓
Save Muscle Groups
```

Result:

```text
Monday
└── Chest
```

## B. Add Exercises

```text
Chest
 ↓
Add Exercise
 ↓
Exercise Selector
 ↓
Select Bench Press
Select Incline Press
Select Cable Fly
 ↓
Save Exercises
```

Result:

```text
Monday
└── Chest
    ├── Bench Press
    ├── Incline Press
    └── Cable Fly
```

## C. Customize

```text
Bench Press
 ↓
Settings
 ↓
Sets = 4
Reps = 10
Rest = 90
 ↓
Save Settings
```

## D. Reorder

```text
↑ / ↓
```

Changes the exercise order.

## E. Save

```text
Save Program
 ↓
localStorage
 ↓
✓ Program Saved
```

## F. Refresh

```text
Browser Refresh
 ↓
ProgramContext loads localStorage
 ↓
Program restored
```

## G. Today's Workout — Pack 1F

```text
Saved Program
 ↓
Today's Workout
 ↓
Today's exercises
 ↓
Complete sets
 ↓
Record weights
 ↓
Finish Workout
 ↓
Workout History
```

---

# 29. Program Data vs Exercise Data vs History

This separation is a key architectural decision.

### Exercise Database

```text
"What exercises are available?"
```

### Program

```text
"What does this user plan to do?"
```

### Workout Session

```text
"What is the user doing today?"
```

### Workout History

```text
"What did the user actually complete?"
```

Eventually:

```text
Exercise Database
       ↓
Program
       ↓
Workout Session
       ↓
Workout History
       ↓
Progress Analytics
```

---

# 30. Current Completion Status

```text
Pack 1A  Exercise Library              ✅
Pack 1B  Program Builder Foundation   ✅
Pack 1C  Muscle Groups                ✅

Pack 1D  Exercise Database            ✅
  1D-1   Chest                         ✅
  1D-2   Back                          ✅
  1D-3   Legs                          ✅
  1D-4   Shoulders                     ✅
  1D-5   Biceps                        ✅
  1D-6   Triceps                       ✅
  1D-7   Forearms                      ✅
  1D-8   Abs                           ✅
  1D-9   Cardio                        ✅
  1D-10  Validation                    ✅

Pack 1E  Program Builder Engine       ✅
  1E-1   Exercise Selector             ✅
  1E-2   Muscle → Exercise             ✅
  1E-3   ProgramContext                ✅
  1E-4   Display Exercises             ✅
  1E-5   Edit / Remove                 ✅
  1E-6   Sets / Reps / Rest            ✅
  1E-7   Exercise Ordering             ✅
  1E-8   Save & Persistence             ✅

Pack 1F  Today's Workout               ⏳
  1F-1   Screen                        ⏳
  1F-2   Load Today's Program          ⏳
  1F-3   Display Exercises             ⏳
  1F-4   Set Completion                ⏳
  1F-5   Weight Tracking               ⏳
  1F-6   Workout Progress              ⏳
  1F-7   Finish Workout                ⏳
  1F-8   Workout History               ⏳
```

---

# 31. Development Rule Going Forward

For every feature:

```text
Pack
 ↓
Small numbered step
 ↓
Identify exact files
 ↓
Create/replace only required files
 ↓
Run npm run dev
 ↓
Test
 ↓
Confirm working
 ↓
Move to next step
```

Do not mix unrelated changes between packs.

This keeps the project easy to debug and understandable to another developer.

---

# 32. Future Architecture

After Pack 1F, the Workout Module can grow toward:

```text
Program Builder
      ↓
Today's Workout
      ↓
Workout History
      ↓
Progress Tracking
      ↓
Exercise Progress
      ↓
Personal Records
      ↓
Analytics
      ↓
AI Workout Recommendations
```

Possible future additions:

- user-specific programs
- coach/client programs
- multiple programs
- program templates
- progressive overload
- weight progression
- exercise substitutions
- rest timer
- exercise video demonstrations
- workout streaks
- progress charts
- personal records
- deload weeks
- AI-generated workout recommendations
