const DAYS_OF_WEEK = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

const formatTime12h = (timeString) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":");
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

export const getSessionLabel = (session) => {
  const dayName = DAYS_OF_WEEK[session.dayOfWeek] ?? "حصة";
  const start = formatTime12h(session.startTime);
  const end = formatTime12h(session.endTime);

  if (start && end) {
    return `${dayName} (${start} - ${end})`;
  }
  return dayName;
};