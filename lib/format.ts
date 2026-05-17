const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatSlotDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(value));
}

export function formatSlotTime(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return `${timeFormatter.format(start)}-${timeFormatter.format(end)}`;
}

export function formatTimeRanges(timeSlots: string[]): string {
  const sortedHours = Array.from(
    new Set(
      timeSlots
        .map((timeSlot) => Number(timeSlot.split(":")[0]))
        .filter((hour) => Number.isFinite(hour)),
    ),
  ).sort((a, b) => a - b);

  if (sortedHours.length === 0) return "";

  const ranges: string[] = [];
  let rangeStart = sortedHours[0];
  let previous = sortedHours[0];

  for (let index = 1; index < sortedHours.length; index += 1) {
    const hour = sortedHours[index];
    if (hour === previous + 1) {
      previous = hour;
      continue;
    }

    ranges.push(formatHourRange(rangeStart, previous));
    rangeStart = hour;
    previous = hour;
  }

  ranges.push(formatHourRange(rangeStart, previous));
  return ranges.join("、");
}

export function formatAvailabilityRanges(timeRanges: string[]): string {
  const ranges = timeRanges
    .map(parseTimeRange)
    .filter((range): range is { start: number; end: number } => Boolean(range))
    .sort((a, b) => a.start - b.start);

  if (ranges.length === 0) return "";

  const merged: Array<{ start: number; end: number }> = [];
  ranges.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.end === range.start) {
      previous.end = range.end;
      return;
    }
    merged.push({ ...range });
  });

  return merged.map((range) => `${formatMinutes(range.start)}-${formatMinutes(range.end)}`).join("、");
}

function parseTimeRange(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined;
  return { start, end };
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatHourRange(startHour: number, endHour: number): string {
  const start = `${String(startHour).padStart(2, "0")}:00`;
  if (startHour === endHour) return start;
  const end = `${String(endHour).padStart(2, "0")}:00`;
  return `${start}-${end}`;
}
