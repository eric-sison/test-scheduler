"use client";

import { FunctionComponent, useState } from "react";
import { useMeterReadingSchedule } from "./useMeterReadingSchedule";
import { holidays } from "./holidays";
import { format } from "date-fns";

export const MeterReadingSchedule: FunctionComponent = () => {
  const scheduler = useMeterReadingSchedule(holidays);
  const [schedule, setSchedule] = useState(scheduler.calculateSchedule());

  return (
    <main className="h-full overflow-x-hidden">
      <button
        className="border"
        onClick={() => {
          setSchedule(scheduler.addSundayReadings(schedule));
        }}
      >
        Add Sundays
      </button>

      <button
        className="border"
        onClick={() => {
          setSchedule(scheduler.removeSundayReadings(schedule));
        }}
      >
        Remove Sundays
      </button>
      <section className="grid grid-cols-7 border-y h-full grid-rows-6">
        {schedule.map((date, index) => (
          <div key={index} className="h-full border">
            <div>{format(date.readingDate, "dd")}</div>
            <div>{scheduler.formatDate(date.dueDate as Date, "MMM dd")}</div>
            <div>{scheduler.formatDate(date.disconnectionDate as Date, "MMM dd")}</div>
          </div>
        ))}
      </section>
    </main>
  );
};
