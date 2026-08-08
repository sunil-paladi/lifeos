"use client";

import DayCard from "./DayCard";

interface Props {
  week: number;
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function WeekPlanner({ week }: Props) {
  return (
    <div>

      <h3 className="mb-5 text-xl font-bold text-slate-700">
        Week {week}
      </h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {days.map((day) => (
          <DayCard
            key={day}
            day={day}
          />
        ))}

      </div>

    </div>
  );
}