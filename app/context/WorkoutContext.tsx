"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type WorkoutContextType = {
  currentWorkoutId: number | null;
  setCurrentWorkoutId: (id: number) => void;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(
  undefined
);

export function WorkoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(1);

  return (
    <WorkoutContext.Provider
      value={{
        currentWorkoutId,
        setCurrentWorkoutId,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);

  if (!context) {
    throw new Error(
      "useWorkout must be used inside WorkoutProvider"
    );
  }

  return context;
}