// m2-01-if-switch (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function letterGrade(score) {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  } else {
    return "F";
  }
}

export function dayKind(day) {
  let kind = "unknown";
  switch (day) {
    case "sat":
    case "sun":
      kind = "weekend";
      break;
    case "mon":
    case "tue":
    case "wed":
    case "thu":
    case "fri":
      kind = "weekday";
      break;
    default:
      kind = "unknown";
  }
  return kind;
}
