import { addDays, format } from "date-fns";

// Function to check if a date is Sunday
const isSunday = (date) => {
  return date.getDay() === 0;
};

// Function to get the next 30 dates excluding Sundays
export const getNext30DatesExcludingSundays = (startDate) => {
  const nextDates = [];
  let i = 0;
  let currentDate = new Date(startDate);

  while (i < 30) {
    // Check if the current date is not Sunday
    if (!isSunday(currentDate)) {
      nextDates.push(currentDate);
    }
    // Move to the next day
    i += 1;
    currentDate = addDays(currentDate, 1);
  }

  return nextDates;
};
