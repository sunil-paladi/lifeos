"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { exercises } from "@/app/data/exercises";

/* =========================================================
   TYPES
   ========================================================= */

export interface ProgramExercise {
  id: number;

  // Exercise type
  type?: "strength" | "cardio";

  // Strength exercises
  sets?: number;
  reps?: number;
  rest?: number;

  // Cardio exercises
  duration?: number;
}

export interface MuscleGroup {
  id: number;
  name: string;
  exercises: ProgramExercise[];
}

export interface DayWorkout {
  Monday: MuscleGroup[];
  Tuesday: MuscleGroup[];
  Wednesday: MuscleGroup[];
  Thursday: MuscleGroup[];
  Friday: MuscleGroup[];
  Saturday: MuscleGroup[];
  Sunday: MuscleGroup[];
}

export type DayName = keyof DayWorkout;

type SaveStatus =
  | "loading"
  | "saved"
  | "saving"
  | "error";

/*
 * Temporary default.
 *
 * The actual program duration is controlled
 * by ProgramBuilder.
 */
const DEFAULT_PROGRAM_WEEKS = 12;

/* =========================================================
   INITIAL DATA
   ========================================================= */

function createEmptyWeek(): DayWorkout {
  return {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };
}

function createInitialWeeks(
  count: number = DEFAULT_PROGRAM_WEEKS
): DayWorkout[] {
  return Array.from(
    { length: count },
    () => createEmptyWeek()
  );
}

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY =
  "lifeos-workout-program";

interface StoredProgram {
  weeks: DayWorkout[];
}

/* =========================================================
   CONTEXT TYPE
   ========================================================= */

interface ProgramContextType {
  /*
   * Compatibility with existing components.
   * Points to Week 1.
   */
  workout: DayWorkout;

  /*
   * Complete week-based program.
   */
  weeks: DayWorkout[];

  saveStatus: SaveStatus;

  /*
   * Get a specific week's workout.
   */
  getWorkoutForWeek: (
    weekIndex: number
  ) => DayWorkout;

  /*
   * Add muscle group.
   */
  addMuscleGroup: (
    day: DayName,
    muscle: MuscleGroup,
    weekIndex?: number
  ) => void;

  /*
   * Remove muscle group.
   */
  removeMuscleGroup: (
    day: DayName,
    muscleName: string,
    weekIndex: number
  ) => void;

  /*
   * Add exercises inside a muscle group.
   */
  addExercisesToMuscle: (
    day: DayName,
    muscleName: string,
    exerciseIds: number[],
    weekIndex?: number
  ) => void;

  /*
   * Update strength exercise settings.
   */
  updateExerciseSettings: (
    day: DayName,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets: number;
      reps: number;
      rest: number;
    },
    weekIndex?: number
  ) => void;

  /*
   * Move exercise up/down.
   */
  reorderExercise: (
    day: DayName,
    muscleName: string,
    exerciseId: number,
    direction: "up" | "down",
    weekIndex?: number
  ) => void;

  /*
   * Manual save.
   */
  saveProgram: () => void;
}

/* =========================================================
   CONTEXT
   ========================================================= */

const ProgramContext =
  createContext<ProgramContextType | null>(
    null
  );

/* =========================================================
   PROVIDER
   ========================================================= */

export function ProgramProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [weeks, setWeeks] = useState<
    DayWorkout[]
  >(() => createInitialWeeks());

  const [loaded, setLoaded] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("loading");

  /* =======================================================
     LOAD PROGRAM
     ======================================================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        /*
         * ---------------------------------------------------
         * NEW FORMAT
         * ---------------------------------------------------
         */

        if (
          parsed &&
          Array.isArray(parsed.weeks)
        ) {
          const loadedWeeks =
            parsed.weeks.map(
              (week: DayWorkout) => ({
                Monday:
                  week?.Monday || [],
                Tuesday:
                  week?.Tuesday || [],
                Wednesday:
                  week?.Wednesday || [],
                Thursday:
                  week?.Thursday || [],
                Friday:
                  week?.Friday || [],
                Saturday:
                  week?.Saturday || [],
                Sunday:
                  week?.Sunday || [],
              })
            );

          if (loadedWeeks.length > 0) {
            setWeeks(loadedWeeks);
          }
        }

        /*
         * ---------------------------------------------------
         * OLD FORMAT
         * ---------------------------------------------------
         *
         * Previous version stored:
         *
         * {
         *   Monday: [],
         *   Tuesday: [],
         *   ...
         * }
         *
         * Preserve that data in Week 1.
         */

        else if (
          parsed &&
          (
            Array.isArray(parsed.Monday) ||
            Array.isArray(parsed.Tuesday) ||
            Array.isArray(parsed.Wednesday) ||
            Array.isArray(parsed.Thursday) ||
            Array.isArray(parsed.Friday) ||
            Array.isArray(parsed.Saturday) ||
            Array.isArray(parsed.Sunday)
          )
        ) {
          const migratedWeek: DayWorkout = {
            Monday:
              parsed.Monday || [],
            Tuesday:
              parsed.Tuesday || [],
            Wednesday:
              parsed.Wednesday || [],
            Thursday:
              parsed.Thursday || [],
            Friday:
              parsed.Friday || [],
            Saturday:
              parsed.Saturday || [],
            Sunday:
              parsed.Sunday || [],
          };

          const migratedWeeks =
            createInitialWeeks();

          migratedWeeks[0] =
            migratedWeek;

          setWeeks(migratedWeeks);

          console.log(
            "✅ Existing workout program migrated to Week 1"
          );
        }
      }

      setSaveStatus("saved");
    } catch (error) {
      console.error(
        "Failed to load workout program:",
        error
      );

      setSaveStatus("error");
    } finally {
      setLoaded(true);
    }
  }, []);

  /* =======================================================
     AUTO SAVE
     ======================================================= */

  useEffect(() => {
    if (!loaded) {
      return;
    }

    setSaveStatus("saving");

    const timeout = setTimeout(() => {
      try {
        const dataToSave: StoredProgram = {
          weeks,
        };

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(dataToSave)
        );

        console.log(
          "✅ Workout program auto-saved"
        );

        setSaveStatus("saved");
      } catch (error) {
        console.error(
          "Failed to save workout program:",
          error
        );

        setSaveStatus("error");
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [weeks, loaded]);

  /* =======================================================
     GET WEEK
     ======================================================= */

  function getWorkoutForWeek(
    weekIndex: number
  ): DayWorkout {
    if (
      weekIndex < 0 ||
      weekIndex >= weeks.length
    ) {
      return createEmptyWeek();
    }

    return weeks[weekIndex];
  }

  /* =======================================================
     MANUAL SAVE
     ======================================================= */

  function saveProgram() {
    try {
      const dataToSave: StoredProgram = {
        weeks,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dataToSave)
      );

      setSaveStatus("saved");

      console.log(
        "✅ Workout program saved"
      );
    } catch (error) {
      console.error(
        "Failed to save workout program:",
        error
      );

      setSaveStatus("error");
    }
  }

  /* =======================================================
     ADD MUSCLE GROUP
     ======================================================= */

  function addMuscleGroup(
    day: DayName,
    muscle: MuscleGroup,
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks = [...prev];

      while (
        updatedWeeks.length <= weekIndex
      ) {
        updatedWeeks.push(
          createEmptyWeek()
        );
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...currentWeek,

        [day]: [
          ...(currentWeek[day] || []),
          muscle,
        ],
      };

      return updatedWeeks;
    });
  }

  /* =======================================================
     REMOVE MUSCLE GROUP
     ======================================================= */

  function removeMuscleGroup(
    day: DayName,
    muscleName: string,
    weekIndex: number
  ) {
    setWeeks((prev) => {
      const updatedWeeks = [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >= updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...currentWeek,

        [day]: (
          currentWeek[day] || []
        ).filter(
          (muscle) =>
            muscle.name !== muscleName
        ),
      };

      return updatedWeeks;
    });
  }

  /* =======================================================
     FIND EXERCISE FROM LIBRARY
     ======================================================= */

  function findExerciseById(
    exerciseId: number
  ) {
    for (const muscleExercises of Object.values(
      exercises
    )) {
      const found =
        muscleExercises.find(
          (exercise) =>
            exercise.id === exerciseId
        );

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /* =======================================================
     ADD EXERCISES TO MUSCLE
     ======================================================= */

  function addExercisesToMuscle(
    day: DayName,
    muscleName: string,
    exerciseIds: number[],
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks = [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >= updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...currentWeek,

        [day]: (
          currentWeek[day] || []
        ).map((muscle) => {
          if (
            muscle.name !== muscleName
          ) {
            return muscle;
          }

          const existingExercises =
            muscle.exercises || [];

          const updatedExercises =
            exerciseIds.map((id) => {
              const existing =
                existingExercises.find(
                  (exercise) =>
                    exercise.id === id
                );

              /*
               * Keep existing settings when
               * the exercise is already present.
               */
              if (existing) {
                return existing;
              }

              /*
               * Find the original exercise
               * from the exercise library.
               */
              const libraryExercise =
                findExerciseById(id);

              /*
               * CARDIO
               *
               * Cardio gets duration instead
               * of fake sets/reps.
               */
              if (
                libraryExercise?.type ===
                "cardio"
              ) {
                return {
                  id,
                  type: "cardio" as const,
                  duration:
                    libraryExercise.duration ??
                    20,
                  rest: 0,
                };
              }

              /*
               * STRENGTH
               *
               * Normal default settings.
               */
              return {
                id,
                type: "strength" as const,
                sets: 3,
                reps: 10,
                rest: 60,
              };
            });

          return {
            ...muscle,
            exercises:
              updatedExercises,
          };
        }),
      };

      return updatedWeeks;
    });
  }

  /* =======================================================
     UPDATE EXERCISE SETTINGS
     ======================================================= */

  function updateExerciseSettings(
    day: DayName,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets: number;
      reps: number;
      rest: number;
    },
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks = [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >= updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...currentWeek,

        [day]: (
          currentWeek[day] || []
        ).map((muscle) => {
          if (
            muscle.name !== muscleName
          ) {
            return muscle;
          }

          return {
            ...muscle,

            exercises:
              (muscle.exercises || []).map(
                (exercise) =>
                  exercise.id === exerciseId
                    ? {
                        ...exercise,
                        ...settings,
                      }
                    : exercise
              ),
          };
        }),
      };

      return updatedWeeks;
    });
  }

  /* =======================================================
     REORDER EXERCISE
     ======================================================= */

  function reorderExercise(
    day: DayName,
    muscleName: string,
    exerciseId: number,
    direction: "up" | "down",
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks = [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >= updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...currentWeek,

        [day]: (
          currentWeek[day] || []
        ).map((muscle) => {
          if (
            muscle.name !== muscleName
          ) {
            return muscle;
          }

          const currentIndex =
            (muscle.exercises || []).findIndex(
              (exercise) =>
                exercise.id === exerciseId
            );

          if (currentIndex === -1) {
            return muscle;
          }

          const newIndex =
            direction === "up"
              ? currentIndex - 1
              : currentIndex + 1;

          if (
            newIndex < 0 ||
            newIndex >=
              muscle.exercises.length
          ) {
            return muscle;
          }

          const updatedExercises = [
            ...muscle.exercises,
          ];

          const [movedExercise] =
            updatedExercises.splice(
              currentIndex,
              1
            );

          updatedExercises.splice(
            newIndex,
            0,
            movedExercise
          );

          return {
            ...muscle,
            exercises:
              updatedExercises,
          };
        }),
      };

      return updatedWeeks;
    });
  }

  /* =======================================================
     WEEK 1 COMPATIBILITY
     ======================================================= */

  const workout =
    weeks[0] || createEmptyWeek();

  /* =======================================================
     PROVIDER
     ======================================================= */

  return (
    <ProgramContext.Provider
      value={{
        workout,
        weeks,
        saveStatus,

        getWorkoutForWeek,

        addMuscleGroup,
        removeMuscleGroup,
        addExercisesToMuscle,
        updateExerciseSettings,
        reorderExercise,

        saveProgram,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
}

/* =========================================================
   HOOK
   ========================================================= */

export function useProgram() {
  const context =
    useContext(ProgramContext);

  if (!context) {
    throw new Error(
      "useProgram must be used inside ProgramProvider"
    );
  }

  return context;
}