// m2-01-if-switch
// letterGrade(score): 90..100 -> "A", 80..89 -> "B", 70..79 -> "C", below -> "F".
// dayKind(day): "sat"/"sun" -> "weekend", "mon".."fri" -> "weekday", anything else -> "unknown".
// One boundary in letterGrade is wrong and one break in dayKind is missing.

export function letterGrade(score) {
  if (score >= 90) {
    return "A";
  } else if (score > 80) {
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
