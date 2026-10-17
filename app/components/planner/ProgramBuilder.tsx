"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Copy,
  Library,
  Loader2,
} from "lucide-react";

import { useProgram } from "@/app/context/ProgramContext";
import {
  formatWorkoutWeekRange,
  getWorkoutWeekIndex,
  getWorkoutWeekRange,
} from "@/app/lib/workout-progress";
import {
  isWorkoutWeekEmpty,
} from "@/app/lib/program-builder-state";
import AIWorkoutGenerator from "./AIWorkoutGenerator";
import ExerciseLibrary from "./ExerciseLibrary";
import WeeklyWorkoutProgress from "./WeeklyWorkoutProgress";
import WeekPlanner from "./WeekPlanner";

interface GymMembershipOption {
  gymId: string;
  gymName: string;
}

interface Props {
  selectedWeek: number;
  setSelectedWeek: Dispatch<SetStateAction<number>>;
  disclosureExpanded: boolean;
  onDisclosureToggle: () => void;
}

const durationOptions = [
  4,
  6,
  8,
  12,
  16,
  24,
  32,
];

function getWeekContainingToday(
  programStartDate: string | null,
  durationWeeks: number,
) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekIndex = getWorkoutWeekIndex(
    programStartDate,
    today,
  );

  if (weekIndex === null) {
    return 0;
  }

  return Math.min(
    Math.max(weekIndex, 0),
    durationWeeks - 1,
  );
}

export default function ProgramBuilder({
  selectedWeek,
  setSelectedWeek,
  disclosureExpanded,
  onDisclosureToggle,
}: Props) {
  const initialWeekSelected = useRef(false);
  const [showDurationMenu, setShowDurationMenu] =
    useState(false);
  const [showExerciseLibrary, setShowExerciseLibrary] =
    useState(false);
  const collapsed = !disclosureExpanded;
  const [showCopyWeek, setShowCopyWeek] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState(0);
  const [copyDestinationWeek, setCopyDestinationWeek] = useState(1);
  const [copyError, setCopyError] = useState("");
  const [copyingWeek, setCopyingWeek] = useState(false);
  const [durationError, setDurationError] = useState("");
  const [gymMemberships, setGymMemberships] = useState<GymMembershipOption[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");
  const [programCreationError, setProgramCreationError] = useState("");
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [membershipRetry, setMembershipRetry] = useState(0);

  const {
    saveStatus,
    durationWeeks,
    programStartDate,
    trainingPlanId,
    programLoaded,
    weeks,
    getWorkoutForWeek,
    updateProgramDuration,
    copyWeek,
    refreshProgram,
  } = useProgram();

  useEffect(() => {
    if (!programLoaded || trainingPlanId) {
      return;
    }

    const controller = new AbortController();

    async function loadMemberships() {
      setMembershipsLoading(true);
      setMembershipError("");
      try {
        const response = await fetch("/api/gyms", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null) as
          | {
              error?: string;
              memberships?: Array<{ gymId?: unknown; gymName?: unknown }>;
            }
          | null;
        if (!response.ok || !Array.isArray(data?.memberships)) {
          throw new Error(data?.error || "Unable to load your active gym memberships.");
        }

        const memberships = data.memberships.filter(
          (membership): membership is GymMembershipOption =>
            typeof membership.gymId === "string" &&
            typeof membership.gymName === "string",
        );
        setGymMemberships(memberships);
        setSelectedGymId((current) =>
          memberships.some(({ gymId }) => gymId === current)
            ? current
            : memberships.length === 1
              ? memberships[0].gymId
              : "",
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMembershipError(
          error instanceof Error
            ? error.message
            : "Unable to load your active gym memberships.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setMembershipsLoading(false);
        }
      }
    }

    void loadMemberships();
    return () => controller.abort();
  }, [membershipRetry, programLoaded, trainingPlanId]);

  useEffect(() => {
    if (!programLoaded || initialWeekSelected.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedWeek(
        getWeekContainingToday(programStartDate, durationWeeks),
      );
      initialWeekSelected.current = true;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    durationWeeks,
    programLoaded,
    programStartDate,
  ]);

  const currentWeekNumber = selectedWeek + 1;
  const weekRange = getWorkoutWeekRange(
    programStartDate,
    selectedWeek,
  );

  function goToPreviousWeek() {
    setSelectedWeek((current) => Math.max(current - 1, 0));
  }

  function goToNextWeek() {
    setSelectedWeek((current) =>
      Math.min(current + 1, durationWeeks - 1),
    );
  }

  async function handleDurationChange(nextDurationWeeks: number) {
    setDurationError("");
    try {
      await updateProgramDuration(nextDurationWeeks);
      setSelectedWeek((current) =>
        Math.min(current, nextDurationWeeks - 1),
      );
      setShowDurationMenu(false);
    } catch (error) {
      setDurationError(
        error instanceof Error
          ? error.message
          : "Unable to save program duration.",
      );
    }
  }

  function toggleCopyWeek() {
    if (!showCopyWeek) {
      setCopySourceWeek(selectedWeek);
      setCopyDestinationWeek(
        selectedWeek === durationWeeks - 1 ? 0 : selectedWeek + 1,
      );
    }
    setCopyError("");
    setShowCopyWeek((current) => !current);
  }

  async function handleCopyWeek() {
    if (
      copySourceWeek < 0 ||
      copyDestinationWeek < 0 ||
      copySourceWeek >= durationWeeks ||
      copyDestinationWeek >= durationWeeks ||
      copySourceWeek === copyDestinationWeek
    ) {
      setCopyError("Choose two different weeks within the program duration.");
      return;
    }

    if (!weeks[copySourceWeek] || !weeks[copyDestinationWeek]) {
      setCopyError("The selected week is not available.");
      return;
    }

    if (!isWorkoutWeekEmpty(weeks[copyDestinationWeek])) {
      const confirmed = window.confirm(
        `Week ${copyDestinationWeek + 1} already has workouts. Replace them with Week ${copySourceWeek + 1}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setCopyingWeek(true);
    setCopyError("");
    try {
      await copyWeek(copySourceWeek, copyDestinationWeek);
      setSelectedWeek(copyDestinationWeek);
      setShowCopyWeek(false);
    } catch (error) {
      setCopyError(
        error instanceof Error
          ? error.message
          : "Unable to copy the selected week.",
      );
    } finally {
      setCopyingWeek(false);
    }
  }

  async function createProgram() {
    if (!selectedGymId || creatingProgram) {
      return;
    }

    setCreatingProgram(true);
    setProgramCreationError("");
    try {
      const response = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymId: selectedGymId,
          name: "My Workout Program",
          totalWeeks: durationWeeks,
          isActive: true,
        }),
      });
      const data = await response.json().catch(() => null) as
        | {
            error?: string;
            success?: boolean;
            plan?: { id?: string; totalWeeks?: number };
          }
        | null;
      if (
        !response.ok ||
        !data?.success ||
        typeof data.plan?.id !== "string" ||
        data.plan.totalWeeks !== durationWeeks
      ) {
        throw new Error(data?.error || "Unable to create your workout program.");
      }

      await refreshProgram(data.plan.id, { days: [] }, durationWeeks);
    } catch (error) {
      setProgramCreationError(
        error instanceof Error
          ? error.message
          : "Unable to create your workout program.",
      );
    } finally {
      setCreatingProgram(false);
    }
  }

  return (
    <section id="program-builder" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

      {/* Header */}
      <button
        type="button"
        aria-expanded={disclosureExpanded}
        aria-controls="program-builder-content"
        aria-label={
          collapsed
            ? "Expand Program Builder"
            : "Collapse Program Builder"
        }
        onClick={onDisclosureToggle}
        className="flex w-full min-w-0 flex-col gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-50"
      >

        <div className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <span className="text-base">📅</span>
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">
                Program Builder
              </h2>

              <p className="text-[11px] font-medium text-slate-500">
                Build your workout program
              </p>
            </div>
          </div>

          <ChevronDown
            size={20}
            className={`shrink-0 text-slate-400 transition-transform ${
              disclosureExpanded ? "rotate-180" : ""
            }`}
          />
        </div>

        <p className="w-full pl-[42px] text-xs font-medium text-slate-600">
          {durationWeeks}-week program · Week {currentWeekNumber}
          {weekRange && (
            <> · {formatWorkoutWeekRange(weekRange.start, weekRange.end)}</>
          )}
        </p>
      </button>

      <div id="program-builder-content" hidden={collapsed}>
      {programLoaded && !trainingPlanId && saveStatus === "saved" && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Create a workout program
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Create a program to save weekly workouts to your account so they are available across devices.
          </p>
          {gymMemberships.length > 1 && (
            <label className="mt-3 block max-w-sm text-xs font-medium text-slate-600">
              Gym
              <select
                value={selectedGymId}
                onChange={(event) => setSelectedGymId(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                <option value="">Choose a gym</option>
                {gymMemberships.map(({ gymId, gymName }) => (
                  <option key={gymId} value={gymId}>{gymName}</option>
                ))}
              </select>
            </label>
          )}
          {membershipsLoading && (
            <p role="status" className="mt-2 text-xs text-slate-500">
              Checking your gym memberships...
            </p>
          )}
          {membershipError && (
            <div className="mt-2 text-xs text-red-600">
              <p role="alert">{membershipError}</p>
              <button
                type="button"
                onClick={() => setMembershipRetry((retry) => retry + 1)}
                className="mt-1 min-h-11 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}
          {!membershipsLoading && !membershipError && gymMemberships.length === 0 && (
            <p className="mt-2 text-xs text-slate-600">
              No active gym membership was found. Ask a gym owner to add you before creating a saved program.
            </p>
          )}
          {programCreationError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {programCreationError}
            </p>
          )}
          {gymMemberships.length > 0 && !membershipError && (
            <button
              type="button"
              onClick={() => void createProgram()}
              disabled={
                membershipsLoading ||
                !selectedGymId ||
                creatingProgram
              }
              className="mt-3 min-h-11 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {creatingProgram ? "Creating program..." : "Create program"}
            </button>
          )}
        </div>
      )}

      {/* Duration */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Program Duration
          </p>

          <p className="text-[11px] font-medium text-slate-600">
            Choose program length
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Save Status */}
          <div className="flex items-center gap-1 text-[11px]">
            {saveStatus === "loading" && (
              <>
                <Loader2 size={12} className="animate-spin text-slate-500" />
                <span className="font-medium text-slate-500">Loading...</span>
              </>
            )}

            {saveStatus === "saving" && (
              <>
                <Cloud size={12} className="text-slate-500" />
                <span className="font-medium text-slate-500">Saving...</span>
              </>
            )}

            {saveStatus === "saved" && (
              <>
                <Check size={12} className="text-primary" />
                <span className="font-semibold text-primary">Saved</span>
              </>
            )}

            {saveStatus === "error" && (
              <span className="font-semibold text-red-600">Save failed</span>
            )}
          </div>

          {/* Duration Dropdown */}
          <div className="relative">

          <button
            type="button"
            onClick={() =>
              setShowDurationMenu(
                (current) => !current
              )
            }
            className="flex min-h-11 min-w-[125px] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <span>{durationWeeks} Weeks</span>

            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${
                showDurationMenu
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {showDurationMenu && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-[130px] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">

              {durationOptions.map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  disabled={saveStatus === "saving"}
                  onClick={() =>
                    void handleDurationChange(weeks)
                  }
                  className={`flex min-h-11 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${
                    durationWeeks === weeks
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{weeks} Weeks</span>

                  {durationWeeks === weeks && (
                    <Check
                      size={13}
                      className="text-primary"
                    />
                  )}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() =>
                  setShowDurationMenu(false)
                }
                className="min-h-11 w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Custom...
              </button>

            </div>
          )}

          </div>
        </div>
      </div>
      {durationError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {durationError}
        </p>
      )}

      {/* Compact Week Navigation */}
      <div className="mt-3 min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">

        <div className="flex items-center justify-between">

          {/* Previous */}
          <button
            type="button"
            onClick={goToPreviousWeek}
            disabled={selectedWeek === 0}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Current Week */}
          <div className="text-center leading-tight">

            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Current Week
            </span>

            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm font-bold text-slate-900">
                Week {currentWeekNumber}
              </span>

              <span className="text-[10px] font-medium text-slate-500">
                / {durationWeeks}
              </span>
            </div>

          </div>

          {/* Next */}
          <button
            type="button"
            onClick={goToNextWeek}
            disabled={
              selectedWeek === durationWeeks - 1
            }
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={15} />
          </button>

        </div>

        {/* Week Progress */}
        <div className="mt-1 grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({
            length: durationWeeks,
          }).map((_, index) => {

            const isActive =
              index === selectedWeek;

            const isCompleted =
              index < selectedWeek;

            return (
              <button
                key={index}
                type="button"
                aria-label={`Go to Week ${
                  index + 1
                }`}
                onClick={() =>
                  setSelectedWeek(index)
                }
                className="group relative flex min-h-11 min-w-0 items-center"
              >
                <span className={`h-1 w-full rounded-full transition ${
                  isActive
                    ? "bg-primary"
                    : isCompleted
                    ? "bg-primary/10"
                    : "bg-slate-200"
                }`} />
              </button>
            );
          })}
        </div>

      </div>

      {/* Current Week */}
      <div id="add-exercises" className="mt-3 scroll-mt-20">

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Week {currentWeekNumber}
              {weekRange && (
                <span className="font-medium text-slate-500">
                  {" · "}
                  {formatWorkoutWeekRange(weekRange.start, weekRange.end)}
                </span>
              )}
            </h3>

            <p className="text-[10px] font-medium text-slate-500">
              Plan your workouts for this week
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
              {durationWeeks}-week program
            </span>
            <button
              type="button"
              onClick={toggleCopyWeek}
              disabled={durationWeeks < 2 || copyingWeek}
              className="flex min-h-11 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={13} />
              Copy Week
            </button>
          </div>

        </div>

        {showCopyWeek && (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Source week
                <select
                  value={copySourceWeek}
                  onChange={(event) => setCopySourceWeek(Number(event.target.value))}
                  className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  {Array.from({ length: durationWeeks }, (_, index) => (
                    <option key={index} value={index}>Week {index + 1}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Destination week
                <select
                  value={copyDestinationWeek}
                  onChange={(event) => setCopyDestinationWeek(Number(event.target.value))}
                  className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  {Array.from({ length: durationWeeks }, (_, index) => (
                    <option key={index} value={index}>Week {index + 1}</option>
                  ))}
                </select>
              </label>
            </div>
            {copyError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {copyError}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCopyWeek(false)}
                className="min-h-11 rounded-md px-3 text-xs font-semibold text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCopyWeek()}
                disabled={
                  copyingWeek ||
                  copySourceWeek === copyDestinationWeek ||
                  durationWeeks < 2
                }
                className="flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copyingWeek && <Loader2 size={13} className="animate-spin" />}
                {copyingWeek ? "Copying..." : "Copy workouts"}
              </button>
            </div>
          </div>
        )}

        <WeeklyWorkoutProgress
          week={getWorkoutForWeek(selectedWeek)}
          weekIndex={selectedWeek}
          programStartDate={programStartDate}
        />

        <AIWorkoutGenerator planId={trainingPlanId} />

        {/* Existing Week Planner */}
        <WeekPlanner weekIndex={selectedWeek} />

        <div className="mt-3">
          <button
            type="button"
            onClick={() =>
              setShowExerciseLibrary((current) => !current)
            }
            aria-expanded={showExerciseLibrary}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:w-auto"
          >
            <Library size={14} />
            {showExerciseLibrary
              ? "Close exercise catalog"
              : "Add Exercise from Library"}
          </button>
        </div>

        {showExerciseLibrary && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
            <ExerciseLibrary initialWeekIndex={selectedWeek} />
          </div>
        )}

      </div>
      </div>

    </section>
  );
}