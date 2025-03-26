"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSunday,
  isWeekend,
  nextMonday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

type Holiday = {
  id: string;
  name: string;
  holidayDate: string;
  type: string;
};

type DueDate = {
  readingDate: Date;
  dueDate: Date;
};

type DisconnectionDate = {
  readingDate: Date;
  dueDate: Date;
  disconnectionDate: Date;
};

export type MeterReadingSchedule = {
  readingDate: Date;
  dueDate: Date | Date[] | undefined;
  disconnectionDate: Date | Date[] | undefined;
};

export const useMeterReadingSchedule = (holidays: Holiday[], date?: Date) => {
  const [currentDate, setCurrentDate] = useState(date ?? new Date());

  useEffect(() => {
    if (date !== undefined && date.getTime() !== currentDate.getTime()) {
      setCurrentDate(date);
    }
  }, [currentDate, date]);

  // Utility function to have a uniform format for dates
  const formatDate = (date: Date | undefined, dateFormat?: "yyyy-MM-dd" | "MMM dd") => {
    if (!date) return undefined;

    // if (!dateFormat) {
    //   dateFormat = "yyyy-MM-dd";
    // }

    return format(date, dateFormat ?? "yyyy-MM-dd");
  };

  // Memoize formatted holiday dates for efficient lookups
  const holidayDates = useMemo(
    () =>
      holidays.map((holiday) =>
        format(parse(holiday.holidayDate, "MMMM dd, yyyy", new Date()), "yyyy-MM-dd")
      ),
    [holidays]
  );

  // Check if a date is a holiday
  const isHoliday = useCallback(
    (date: Date): boolean => holidayDates.includes(formatDate(date) as string),
    [holidayDates]
  );

  // Add 1 day if the provided date is a holiday
  const adjustForHolidayOrWeekend = useCallback(
    (date: Date) => {
      while (isHoliday(date) || isWeekend(date)) {
        if (isHoliday(date)) {
          date = addDays(date, 1);
        }

        if (isWeekend(date)) {
          date = nextMonday(date);
        }
      }
      return date;
    },
    [isHoliday]
  );

  const getStartingReadingDate = useCallback(() => {
    const monthStart = startOfMonth(currentDate);

    let startOfReadingDate = monthStart;

    //* Use this instead, if starting date requires to skip holidays as well.
    // while (isHoliday(readingDate) || isSunday(readingDate)) {
    //   readingDate = adjustForHolidayOrWeekend(readingDate);
    // }

    if (isSunday(startOfReadingDate)) {
      startOfReadingDate = nextMonday(startOfReadingDate);
    }

    return { monthStart, startOfReadingDate };
  }, [currentDate]);

  const addBusinessDays = useCallback(
    (date: Date, daysToAdd: number) => {
      let daysAdded = 0;
      while (daysAdded < daysToAdd) {
        date = addDays(date, 1);

        if (!isWeekend(date) && !isHoliday(date)) {
          daysAdded++;
        }
      }

      return date;
    },
    [isHoliday]
  );

  const getCalendarDays = useCallback(() => {
    const firstDayOfMonth = startOfMonth(currentDate);
    const lastDayOfMonth = endOfMonth(currentDate);

    const firstDayOfCalendar = startOfWeek(firstDayOfMonth);
    const lastDayOfCalendar = endOfWeek(lastDayOfMonth);

    const allDays = eachDayOfInterval({
      start: firstDayOfCalendar,
      end: lastDayOfCalendar,
    });

    return allDays;
  }, [currentDate]);

  const calculateDueDates = useCallback((): DueDate[] => {
    const { monthStart, startOfReadingDate } = getStartingReadingDate();
    const dueDates: DueDate[] = [];

    let readingDate = startOfReadingDate;
    let dueDate = readingDate;
    let readingCount = 1;

    dueDate = addDays(readingDate, 15);

    while (isSameMonth(readingDate, monthStart) && readingCount < 22) {
      dueDate = adjustForHolidayOrWeekend(dueDate);

      if (isSunday(readingDate)) {
        readingDate = nextMonday(readingDate);
      }

      dueDates.push({ readingDate, dueDate });

      readingDate = addDays(readingDate, 1);
      dueDate = addDays(dueDate, 1);
      readingCount++;
    }

    return dueDates;
  }, [adjustForHolidayOrWeekend, getStartingReadingDate]);

  const calculateDisconnectionDates = useCallback(
    (dueDates: DueDate[]): DisconnectionDate[] => {
      let disconnectionDate = dueDates[0].dueDate;

      const disconnectionDates = dueDates.map((date, index) => {
        disconnectionDate =
          index === 0
            ? (disconnectionDate = addBusinessDays(disconnectionDate, 3))
            : (disconnectionDate = addDays(disconnectionDate, 1));

        disconnectionDate = adjustForHolidayOrWeekend(disconnectionDate);

        return { ...date, disconnectionDate };
      });

      return disconnectionDates;
    },
    [addBusinessDays, adjustForHolidayOrWeekend]
  );

  const addSundayReadings = useCallback((schedule: MeterReadingSchedule[]) => {
    // Create a new array to avoid mutating the original
    const updatedSchedule = [...schedule];

    for (let i = 1; i < updatedSchedule.length; i++) {
      const currentReading = updatedSchedule[i];
      const previousReading = updatedSchedule[i - 1];

      // Parse dates
      const currentDate = currentReading.readingDate;
      const previousDate = previousReading.readingDate;

      // Check if current reading is on a Sunday and is in the same month as previous reading
      if (isSunday(currentDate) && isSameMonth(currentDate, previousDate)) {
        // Copy dueDate and disconnectionDate from previous reading
        currentReading.dueDate = previousReading.dueDate;
        currentReading.disconnectionDate = previousReading.disconnectionDate;
      }
    }

    return updatedSchedule;
  }, []);

  const removeSundayReadings = (schedule: MeterReadingSchedule[]) => {
    // Create a new array to avoid mutating the original
    const updatedSchedule = [...schedule];

    for (let i = 1; i < updatedSchedule.length; i++) {
      const currentReading = updatedSchedule[i];
      const previousReading = updatedSchedule[i - 1];

      // Parse dates
      const currentDate = currentReading.readingDate;
      const previousDate = previousReading.readingDate;

      // Check if current reading is on a Sunday and is in the same month as previous reading
      if (isSunday(currentDate) && isSameMonth(currentDate, previousDate)) {
        // Reset dueDate and disconnectionDate for Sunday readings
        currentReading.dueDate = undefined;
        currentReading.disconnectionDate = undefined;
      }
    }

    return updatedSchedule;
  };

  const calculateSchedule = useCallback((): MeterReadingSchedule[] => {
    const calendarDays = getCalendarDays();
    const dueDates = calculateDueDates();
    const disconnectionDates = calculateDisconnectionDates(dueDates);

    const schedule = calendarDays.map((date) => {
      const existingEntry = disconnectionDates.find(
        (dateEntry) => formatDate(dateEntry.readingDate) === formatDate(date)
      );

      return existingEntry
        ? existingEntry
        : {
            readingDate: date,
            dueDate: undefined,
            disconnectionDate: undefined,
          };
    });

    return schedule;
  }, [calculateDisconnectionDates, calculateDueDates, getCalendarDays]);

  return {
    calculateSchedule,
    addSundayReadings,
    removeSundayReadings,
    formatDate,
    currentDate,
  };
};
