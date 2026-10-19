// Change this one value to update the event date throughout the app and exports.
export const EVENT_DATE = "2026-11-06";

// UTC keeps this calendar date consistent on every visitor's device.
const date = new Date(`${EVENT_DATE}T12:00:00Z`);
const format = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    date,
  );

export const eventDate = {
  short: format({ day: "numeric", month: "short" }).toUpperCase(),
  dayMonth: format({ day: "numeric", month: "long" }).toUpperCase(),
  full: format({ day: "numeric", month: "long", year: "numeric" }),
  withWeekday: format({
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

export const sharingCaption = `I'm attending MUCOSA Career Day 2026 at MUST on ${eventDate.full}! Looking forward to connecting with technology communities, industry professionals, and fellow innovators. See you there! 🚀 #MUCOSACareerDay2026 #MUSTUganda`;

export const pageDescription = `Make your own MUCOSA Career Day 2026 flyer. Upload, personalize, and share. ${eventDate.full} at MUST, Mbarara.`;
