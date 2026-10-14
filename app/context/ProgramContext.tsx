"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { exercises } from "@/app/data/exercises";
import {
  isCurrentProgramLoad,
  mapTrainingPlanStructureToWeeks,
  verifySavedWorkoutStructure,
} from "@/app/lib/program-workout-structure";
import type { GeneratedWorkout } from "@/app/lib/ai-workout-types";

/* =========================================================
   TYPES
   ========================================================= */

export interface ProgramExercise {
  id: number;
  type?: "strength" | "cardio";
  sets?: number;
  reps?: number;
  rest?: number;
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

const DEFAULT_PROGRAM_WEEKS = 12;

/* =========================================================
   DATABASE DAY INFORMATION
   ========================================================= */

interface DbDayInfo {
  phaseId: string;
  weekId: string;
  dayId: string;
}

type DbDayMap = Record<string, DbDayInfo>;

function dayMapKey(
  weekIndex: number,
  day: DayName
) {
  return `${weekIndex}:${day}`;
}

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

function readStoredProgramWeeks(): DayWorkout[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  const parsed = JSON.parse(saved) as Partial<StoredProgram> | null;
  if (!parsed || !Array.isArray(parsed.weeks)) {
    return [];
  }

  return parsed.weeks.map((week) => ({
    Monday: week?.Monday || [],
    Tuesday: week?.Tuesday || [],
    Wednesday: week?.Wednesday || [],
    Thursday: week?.Thursday || [],
    Friday: week?.Friday || [],
    Saturday: week?.Saturday || [],
    Sunday: week?.Sunday || [],
  }));
}

/* =========================================================
   CONTEXT TYPE
   ========================================================= */

interface ProgramContextType {
  workout: DayWorkout;

  weeks: DayWorkout[];

  programStartDate: string | null;

  trainingPlanId: string | null;

  programLoaded: boolean;

  saveStatus: SaveStatus;

  getWorkoutForWeek: (
    weekIndex: number
  ) => DayWorkout;

  addMuscleGroup: (
    day: DayName,
    muscle: MuscleGroup,
    weekIndex?: number
  ) => void;

  removeMuscleGroup: (
    day: DayName,
    muscleName: string,
    weekIndex: number
  ) => void;

  addExercisesToMuscle: (
    day: DayName,
    muscleName: string,
    exerciseIds: number[],
    weekIndex?: number
  ) => void;

  updateExerciseSettings: (
    day: DayName,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets?: number;
      reps?: number;
      rest?: number;
      duration?: number;
    },
    weekIndex?: number
  ) => void;

  reorderExercise: (
    day: DayName,
    muscleName: string,
    exerciseId: number,
    direction: "up" | "down",
    weekIndex?: number
  ) => void;

  saveProgram: () => void;

  refreshProgram: (
    planId: string,
    workout: GeneratedWorkout,
    expectedWeeks: number,
  ) => Promise<void>;
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

  const [trainingPlanId, setTrainingPlanId] =
    useState<string | null>(null);

  const [programStartDate, setProgramStartDate] =
    useState<string | null>(null);

  const [dbDayMap, setDbDayMap] =
    useState<DbDayMap>({});

  const [loaded, setLoaded] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("loading");

  const databaseWritesInFlight = useRef(0);
  const databaseWriteFailed = useRef(false);
  const loadProgramRef = useRef<
    ((planId?: string, expectedWorkout?: GeneratedWorkout, expectedWeeks?: number) => Promise<boolean>) | null
  >(null);
  const loadRequestVersion = useRef(0);

  /* =======================================================
     LOAD PROGRAM
     ======================================================= */

  async function loadProgram(
    requestedPlanId?: string,
    expectedWorkout?: GeneratedWorkout,
    expectedWeeks?: number,
  ): Promise<boolean> {
    const requestVersion = ++loadRequestVersion.current;
    setSaveStatus("loading");
    try {
      /* -----------------------------------------------
           LOAD TRAINING PLAN
        ----------------------------------------------- */

        let planId = requestedPlanId;
        let startDate: string | null = null;
        if (!planId) {
          const planResponse = await fetch("/api/training-plans");
          if (!isCurrentProgramLoad(requestVersion, loadRequestVersion.current)) {
            return false;
          }
          if (planResponse.status === 401) {
            setSaveStatus("saved");
            return true;
          }
          if (!planResponse.ok) {
            throw new Error("Failed to load training plans");
          }

          const planData = await planResponse.json() as {
            plans?: Array<{
              id: string;
              startDate?: string | null;
              createdAt?: string | null;
            }>;
          };
          if (!isCurrentProgramLoad(requestVersion, loadRequestVersion.current)) {
            return false;
          }
          if (!Array.isArray(planData.plans)) {
            throw new Error("Training plans response is invalid");
          }
          const plan = planData.plans?.[0];
          if (!plan) {
            setTrainingPlanId(null);
            setProgramStartDate(null);
            setDbDayMap({});
            const storedWeeks = readStoredProgramWeeks();
            setWeeks(
              storedWeeks.length > 0
                ? storedWeeks
                : createInitialWeeks(),
            );
            setSaveStatus("saved");
            return true;
          }
          planId = plan.id;
          startDate = plan.startDate ?? plan.createdAt ?? null;
        }
        if (!planId) {
          throw new Error("No training plan found");
        }

        /* -----------------------------------------------
           LOAD DATABASE STRUCTURE
        ----------------------------------------------- */

        const structureResponse = await fetch(
          `/api/training-plans/${planId}/structure`,
          { cache: "no-store" },
        );
        if (!isCurrentProgramLoad(requestVersion, loadRequestVersion.current)) {
          return false;
        }
        if (!structureResponse.ok) {
          throw new Error("Failed to load training plan structure");
        }
        const structure = await structureResponse.json();
        if (!isCurrentProgramLoad(requestVersion, loadRequestVersion.current)) {
          return false;
        }
        const verifiedStructure = requestedPlanId && expectedWorkout && expectedWeeks !== undefined
          ? verifySavedWorkoutStructure(
              structure,
              requestedPlanId,
              expectedWorkout,
              expectedWeeks,
            )
          : structure;
        if (verifiedStructure.plan.id !== planId) {
          throw new Error("Loaded workout structure belongs to a different plan");
        }

        setTrainingPlanId(planId);
        const structureStartDate =
          "startDate" in verifiedStructure.plan &&
          typeof verifiedStructure.plan.startDate === "string"
            ? verifiedStructure.plan.startDate
            : null;
        const effectiveStartDate = startDate ?? structureStartDate;
        if (effectiveStartDate !== null) {
          setProgramStartDate(effectiveStartDate);
        }

        const newDbDayMap: DbDayMap = {};

        for (
          const phase of
            structure.phases || []
        ) {
          for (
            const week of
              phase.weeks || []
          ) {
            const weekIndex =
              Number(week.weekNumber) - 1;

            if (
              weekIndex < 0
            ) {
              continue;
            }

            for (
              const workoutDay of
                week.workoutDays || []
            ) {
              const dayName =
                workoutDay.name as DayName;

              const validDayNames = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ];

              if (
                validDayNames.includes(
                  dayName
                )
              ) {
                newDbDayMap[
                  dayMapKey(
                    weekIndex,
                    dayName
                  )
                ] = {
                  phaseId:
                    phase.id,
                  weekId:
                    week.id,
                  dayId:
                    workoutDay.id,
                };
              }
            }
          }
        }

        setDbDayMap(
          newDbDayMap
        );

        console.log(
          "✅ Database workout days loaded:",
          newDbDayMap
        );

        /* -----------------------------------------------
           LOAD PROGRAM FROM DATABASE
        ----------------------------------------------- */

        const { weeks: dbWeeks, hasExercises: hasDbExercises } =
          mapTrainingPlanStructureToWeeks(
            structure.phases,
            structure.plan.totalWeeks,
          );
        if (!isCurrentProgramLoad(requestVersion, loadRequestVersion.current)) {
          return false;
        }

        const localWeeks = readStoredProgramWeeks();

        if (hasDbExercises) {
          for (const [weekIndex, dbWeek] of dbWeeks.entries()) {
            const localWeek = localWeeks[weekIndex];

            if (!localWeek) {
              continue;
            }

            for (const dayName of [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ] as const) {
              if (!newDbDayMap[dayMapKey(weekIndex, dayName)]) {
                dbWeek[dayName] = localWeek[dayName];
              }
            }
          }

          setWeeks(dbWeeks);

          console.log(
            "✅ Workout program loaded from database"
          );
        } else if (localWeeks.length > 0) {
          /* ---------------------------------------------
             LOCAL STORAGE FALLBACK
          --------------------------------------------- */

          setWeeks(localWeeks);
        } else {
          setWeeks(dbWeeks);
        }

        setSaveStatus(
          "saved"
        );
      return true;
    } catch (error) {
      console.error(
        "Failed to load workout program:",
        error
      );

      setSaveStatus(
        "error"
      );
      return false;
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadProgramRef.current = loadProgram;
    void Promise.resolve().then(() => loadProgram());
    return () => {
      loadProgramRef.current = null;
    };
  }, []);

  async function refreshProgram(
    planId: string,
    workout: GeneratedWorkout,
    expectedWeeks: number,
  ) {
    const load = loadProgramRef.current;
    if (!load || !(await load(planId, workout, expectedWeeks))) {
      throw new Error("Failed to refresh the saved workout structure");
    }
  }

  async function persistDatabaseWrite(
    action: string,
    request: () => Promise<Response>,
  ) {
    databaseWritesInFlight.current += 1;
    setSaveStatus("saving");

    try {
      const response = await request();

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Request failed with status ${response.status}`,
        );
      }
    } catch (error) {
      databaseWriteFailed.current = true;
      console.error(`Failed to ${action}:`, error);
    } finally {
      databaseWritesInFlight.current -= 1;

      if (databaseWritesInFlight.current === 0) {
        setSaveStatus(databaseWriteFailed.current ? "error" : "saved");
      }
    }
  }

  /* =======================================================
     SAVE EXERCISE TO DATABASE
     ======================================================= */

  async function saveExerciseToDatabase(
    day: DayName,
    weekIndex: number,
    exercise: ProgramExercise
  ) {
    if (!trainingPlanId) {
      console.warn(
        "No training plan ID available"
      );
      return;
    }

    const dbDay =
      dbDayMap[
        dayMapKey(
          weekIndex,
          day
        )
      ];

    if (!dbDay) {
      console.warn(
        "No database WorkoutDay mapping found:",
        {
          weekIndex,
          day,
        }
      );
      return;
    }

    await persistDatabaseWrite(
      "save exercise to database",
      () => fetch(
        `/api/training-plans/${trainingPlanId}/phases/${dbDay.phaseId}/weeks/${dbDay.weekId}/days/${dbDay.dayId}/exercises`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            exerciseId:
              String(exercise.id),
            sets:
              exercise.sets ?? 3,
            reps:
              exercise.reps ?? 10,
            restSeconds:
              exercise.rest ?? 60,
          }),
        }
      ),
    );
  }

  /* =======================================================
     DATABASE EXERCISE HELPERS
     ======================================================= */

  async function updateExerciseInDatabase(
    day: DayName,
    weekIndex: number,
    exerciseId: number,
    settings: {
      sets?: number;
      reps?: number;
      rest?: number;
      duration?: number;
    }
  ) {
    if (!trainingPlanId) {
      return;
    }

    const dbDay =
      dbDayMap[
        dayMapKey(weekIndex, day)
      ];

    if (!dbDay) {
      return;
    }

    await persistDatabaseWrite(
      "update exercise in database",
      () => fetch(
        `/api/training-plans/${trainingPlanId}/phases/${dbDay.phaseId}/weeks/${dbDay.weekId}/days/${dbDay.dayId}/exercises`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exerciseId,
            sets: settings.sets,
            reps: settings.reps,
            restSeconds: settings.rest,
          }),
        },
      ),
    );
  }

  async function deleteExerciseFromDatabase(
    day: DayName,
    weekIndex: number,
    exerciseId: number
  ) {
    if (!trainingPlanId) {
      return;
    }

    const dbDay =
      dbDayMap[
        dayMapKey(weekIndex, day)
      ];

    if (!dbDay) {
      return;
    }

    await persistDatabaseWrite(
      "delete exercise from database",
      () => fetch(
        `/api/training-plans/${trainingPlanId}/phases/${dbDay.phaseId}/weeks/${dbDay.weekId}/days/${dbDay.dayId}/exercises`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exerciseId,
          }),
        },
      ),
    );
  }

  async function reorderExerciseInDatabase(
    day: DayName,
    weekIndex: number,
    exerciseId: number,
    direction: "up" | "down"
  ) {
    if (!trainingPlanId) {
      return;
    }

    const dbDay =
      dbDayMap[
        dayMapKey(weekIndex, day)
      ];

    if (!dbDay) {
      return;
    }

    await persistDatabaseWrite(
      "reorder exercises in database",
      () => fetch(
        `/api/training-plans/${trainingPlanId}/phases/${dbDay.phaseId}/weeks/${dbDay.weekId}/days/${dbDay.dayId}/exercises`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exerciseId,
            direction,
          }),
        },
      ),
    );
  }

  /* =======================================================
     AUTO SAVE LOCAL PROGRAM
     ======================================================= */


  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (
      databaseWritesInFlight.current === 0 &&
      !databaseWriteFailed.current
    ) {
      setSaveStatus("saving");
    }

    const timeout =
      setTimeout(() => {
        try {
          const dataToSave:
            StoredProgram = {
            weeks,
          };

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              dataToSave
            )
          );

          console.log(
            "✅ Workout program auto-saved"
          );

          if (
            databaseWritesInFlight.current === 0 &&
            !databaseWriteFailed.current
          ) {
            setSaveStatus("saved");
          }
        } catch (error) {
          console.error(
            "Failed to save workout program:",
            error
          );

          setSaveStatus(
            "error"
          );
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
      weekIndex >=
        weeks.length
    ) {
      return createEmptyWeek();
    }

    return weeks[
      weekIndex
    ];
  }

  /* =======================================================
     MANUAL SAVE
     ======================================================= */

  function saveProgram() {
    try {
      const dataToSave:
        StoredProgram = {
        weeks,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          dataToSave
        )
      );

      setSaveStatus(
        "saved"
      );

      console.log(
        "✅ Workout program saved"
      );
    } catch (error) {
      console.error(
        "Failed to save workout program:",
        error
      );

      setSaveStatus(
        "error"
      );
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
      const updatedWeeks =
        [...prev];

      while (
        updatedWeeks.length <=
        weekIndex
      ) {
        updatedWeeks.push(
          createEmptyWeek()
        );
      }

      const currentWeek =
        updatedWeeks[
          weekIndex
        ];

      updatedWeeks[
        weekIndex
      ] = {
        ...currentWeek,

        [day]: [
          ...(currentWeek[
            day
          ] || []),
          muscle,
        ],
      };

      return updatedWeeks;
    });

    for (
      const exercise of
        muscle.exercises || []
    ) {
      void saveExerciseToDatabase(
        day,
        weekIndex,
        exercise
      );
    }
  }

  /* =======================================================
     REMOVE MUSCLE GROUP
     ======================================================= */

  function removeMuscleGroup(
    day: DayName,
    muscleName: string,
    weekIndex: number
  ) {
    const currentWeek =
      weeks[weekIndex];

    if (!currentWeek) {
      return;
    }

    const muscle =
      (currentWeek[day] || []).find(
        (item) =>
          item.name === muscleName
      );

    if (!muscle) {
      return;
    }

    /*
     * Remove the muscle group from
     * the local program immediately.
     */
    setWeeks((prev) => {
      const updatedWeeks =
        [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >=
          updatedWeeks.length
      ) {
        return prev;
      }

      const week =
        updatedWeeks[weekIndex];

      updatedWeeks[weekIndex] = {
        ...week,
        [day]: (
          week[day] || []
        ).filter(
          (item) =>
            item.name !== muscleName
        ),
      };

      return updatedWeeks;
    });

    /*
     * Remove all exercises belonging
     * to this muscle group from DB.
     */
    for (
      const exercise of
        muscle.exercises || []
    ) {
      void deleteExerciseFromDatabase(
        day,
        weekIndex,
        exercise.id
      );
    }
  }

  /* =======================================================
     FIND EXERCISE
     ======================================================= */

  function findExerciseById(
    exerciseId: number
  ) {
    for (
      const muscleExercises of
        Object.values(
          exercises
        )
    ) {
      const found =
        muscleExercises.find(
          (exercise) =>
            exercise.id ===
            exerciseId
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
    const currentMuscle =
      weeks[weekIndex]?.[day]?.find(
        (muscle) =>
          muscle.name === muscleName
      );

    if (!currentMuscle) {
      return;
    }

    const existingExercises =
      currentMuscle.exercises || [];

    /*
     * Determine which exercises are being removed.
     */
    const exercisesToDelete =
      existingExercises
        .filter(
          (exercise) =>
            !exerciseIds.includes(
              exercise.id
            )
        )
        .map(
          (exercise) =>
            exercise.id
        );

    /*
     * Build the new exercise list outside
     * the React state updater.
     */
    const exercisesToSave:
      ProgramExercise[] = [];

    const updatedExercises =
      Array.from(new Set(exerciseIds)).map((id) => {
        const existing =
          existingExercises.find(
            (exercise) =>
              exercise.id === id
          );

        if (existing) {
          return existing;
        }

        const libraryExercise =
          findExerciseById(id);

        if (
          libraryExercise?.type ===
          "cardio"
        ) {
          const newExercise:
            ProgramExercise = {
            id,
            type: "cardio",
            duration:
              libraryExercise.duration ??
              20,
            rest: 0,
          };

          exercisesToSave.push(
            newExercise
          );

          return newExercise;
        }

        const newExercise:
          ProgramExercise = {
          id,
          type: "strength",
          sets: libraryExercise?.sets ?? 3,
          reps: libraryExercise?.reps ?? 10,
          rest: 60,
        };

        exercisesToSave.push(
          newExercise
        );

        return newExercise;
      });

    /*
     * Update the UI.
     */
    setWeeks((prev) => {
      const updatedWeeks =
        [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >=
          updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[weekIndex];

      updatedWeeks[
        weekIndex
      ] = {
        ...currentWeek,

        [day]: (
          currentWeek[
            day
          ] || []
        ).map((muscle) =>
          muscle.name === muscleName
            ? {
                ...muscle,
                exercises:
                  updatedExercises,
              }
            : muscle
        ),
      };

      return updatedWeeks;
    });

    /*
     * Persist newly added exercises.
     */
    for (
      const exercise of
        exercisesToSave
    ) {
      void saveExerciseToDatabase(
        day,
        weekIndex,
        exercise
      );
    }

    /*
     * Persist removed exercises.
     */
    for (
      const exerciseId of
        exercisesToDelete
    ) {
      void deleteExerciseFromDatabase(
        day,
        weekIndex,
        exerciseId
      );
    }
  }

  /* =======================================================
     UPDATE EXERCISE SETTINGS
     ======================================================= */

  function updateExerciseSettings(
    day: DayName,
    muscleName: string,
    exerciseId: number,
    settings: {
      sets?: number;
      reps?: number;
      rest?: number;
      duration?: number;
    },
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks =
        [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >=
          updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[
          weekIndex
        ];

      updatedWeeks[
        weekIndex
      ] = {
        ...currentWeek,

        [day]: (
          currentWeek[
            day
          ] || []
        ).map((muscle) => {
          if (
            muscle.name !==
            muscleName
          ) {
            return muscle;
          }

          return {
            ...muscle,

            exercises:
              (
                muscle.exercises ||
                []
              ).map(
                (exercise) =>
                  exercise.id ===
                  exerciseId
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

    void updateExerciseInDatabase(
      day,
      weekIndex,
      exerciseId,
      settings
    );
  }

  /* =======================================================
     REORDER EXERCISE
     ======================================================= */

  function reorderExercise(
    day: DayName,
    muscleName: string,
    exerciseId: number,
    direction:
      | "up"
      | "down",
    weekIndex: number = 0
  ) {
    setWeeks((prev) => {
      const updatedWeeks =
        [...prev];

      if (
        weekIndex < 0 ||
        weekIndex >=
          updatedWeeks.length
      ) {
        return prev;
      }

      const currentWeek =
        updatedWeeks[
          weekIndex
        ];

      updatedWeeks[
        weekIndex
      ] = {
        ...currentWeek,

        [day]: (
          currentWeek[
            day
          ] || []
        ).map((muscle) => {
          if (
            muscle.name !==
            muscleName
          ) {
            return muscle;
          }

          const currentIndex =
            (
              muscle.exercises ||
              []
            ).findIndex(
              (exercise) =>
                exercise.id ===
                exerciseId
            );

          if (
            currentIndex ===
            -1
          ) {
            return muscle;
          }

          const newIndex =
            direction ===
            "up"
              ? currentIndex - 1
              : currentIndex + 1;

          if (
            newIndex < 0 ||
            newIndex >=
              muscle.exercises.length
          ) {
            return muscle;
          }

          const updatedExercises =
            [
              ...muscle.exercises,
            ];

          const [
            movedExercise,
          ] =
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

    void reorderExerciseInDatabase(
      day,
      weekIndex,
      exerciseId,
      direction
    );
  }

  /* =======================================================
     WEEK 1 COMPATIBILITY
     ======================================================= */

  const workout =
    weeks[0] ||
    createEmptyWeek();

  /* =======================================================
     PROVIDER
     ======================================================= */

  return (
    <ProgramContext.Provider
      value={{
        workout,
        weeks,

        programStartDate,
        trainingPlanId,
        programLoaded: loaded,
        saveStatus,

        getWorkoutForWeek,

        addMuscleGroup,
        removeMuscleGroup,
        addExercisesToMuscle,
        updateExerciseSettings,
        reorderExercise,

        saveProgram,
        refreshProgram,
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
    useContext(
      ProgramContext
    );

  if (!context) {
    throw new Error(
      "useProgram must be used inside ProgramProvider"
    );
  }

  return context;
}
