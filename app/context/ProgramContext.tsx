"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ProgramExercise {
  id: number;
  sets: number;
  reps: number;
  rest: number;
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

interface ProgramContextType {
  workout: DayWorkout;

  addMuscleGroup: (
    day: keyof DayWorkout,
    muscle: MuscleGroup
  ) => void;

  addExercisesToMuscle: (
    day: keyof DayWorkout,
    muscleName: string,
    exerciseIds: number[]
  ) => void;

  updateExerciseSettings: (
    day: keyof DayWorkout,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets: number;
      reps: number;
      rest: number;
    }
  ) => void;

  reorderExercise: (
    day: keyof DayWorkout,
    muscleName: string,
    exerciseId: number,
    direction: "up" | "down"
  ) => void;

  saveProgram: () => void;
}

const initialWorkout: DayWorkout = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

const STORAGE_KEY = "lifeos-workout-program";

const ProgramContext =
  createContext<ProgramContextType | null>(null);

export function ProgramProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [workout, setWorkout] =
    useState<DayWorkout>(initialWorkout);

  const [loaded, setLoaded] = useState(false);

  // Load saved program
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        setWorkout(parsed);
      }
    } catch (error) {
      console.error(
        "Failed to load workout program:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save program whenever workout changes
  useEffect(() => {
    if (!loaded) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(workout)
      );
    } catch (error) {
      console.error(
        "Failed to save workout program:",
        error
      );
    }
  }, [workout, loaded]);

  function saveProgram() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(workout)
      );

      console.log(
        "✅ Workout program saved"
      );
    } catch (error) {
      console.error(
        "❌ Failed to save workout program:",
        error
      );
    }
  }

  function addMuscleGroup(
    day: keyof DayWorkout,
    muscle: MuscleGroup
  ) {
    setWorkout((prev) => ({
      ...prev,

      [day]: [
        ...(prev[day] || []),
        muscle,
      ],
    }));
  }

  function addExercisesToMuscle(
    day: keyof DayWorkout,
    muscleName: string,
    exerciseIds: number[]
  ) {
    setWorkout((prev) => ({
      ...prev,

      [day]: (prev[day] || []).map((muscle) => {
        if (muscle.name !== muscleName) {
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

            if (existing) {
              return existing;
            }

            return {
              id,
              sets: 3,
              reps: 10,
              rest: 60,
            };
          });

        return {
          ...muscle,
          exercises: updatedExercises,
        };
      }),
    }));
  }

  function updateExerciseSettings(
    day: keyof DayWorkout,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets: number;
      reps: number;
      rest: number;
    }
  ) {
    setWorkout((prev) => ({
      ...prev,

      [day]: (prev[day] || []).map((muscle) => {
        if (muscle.name !== muscleName) {
          return muscle;
        }

        return {
          ...muscle,

          exercises: muscle.exercises.map(
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
    }));
  }

  function reorderExercise(
    day: keyof DayWorkout,
    muscleName: string,
    exerciseId: number,
    direction: "up" | "down"
  ) {
    setWorkout((prev) => ({
      ...prev,

      [day]: (prev[day] || []).map((muscle) => {
        if (muscle.name !== muscleName) {
          return muscle;
        }

        const currentIndex =
          muscle.exercises.findIndex(
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
          newIndex >= muscle.exercises.length
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
          exercises: updatedExercises,
        };
      }),
    }));
  }

  return (
    <ProgramContext.Provider
      value={{
        workout,
        addMuscleGroup,
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

export function useProgram() {
  const context = useContext(
    ProgramContext
  );

  if (!context) {
    throw new Error(
      "useProgram must be used inside ProgramProvider"
    );
  }

  return context;
}