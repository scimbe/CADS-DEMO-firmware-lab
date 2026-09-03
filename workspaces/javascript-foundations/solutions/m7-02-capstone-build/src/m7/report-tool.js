// m7-02-capstone-build (reference solution)
export class ReportError extends Error {
  constructor(message, line, options) {
    super(message, options);
    this.name = "ReportError";
    if (line !== undefined) this.line = line;
  }
}

export function parseLine(line) {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf(";");
  if (separator === -1) {
    throw new ReportError("record needs a ';' between label and amount", line);
  }
  const label = trimmed.slice(0, separator).trim();
  const rawAmount = trimmed.slice(separator + 1).trim();
  if (label === "") {
    throw new ReportError("record has an empty label", line);
  }
  if (rawAmount === "") {
    throw new ReportError("record has an empty amount", line);
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) {
    throw new ReportError(`amount '${rawAmount}' is not a number`, line);
  }
  return { label, amount };
}

export function parseReport(text) {
  const records = [];
  for (const line of text.split("\n")) {
    const record = parseLine(line);
    if (record !== null) records.push(record);
  }
  return records;
}

export function summarize(records) {
  const byLabel = {};
  let sum = 0;
  for (const { label, amount } of records) {
    byLabel[label] = (byLabel[label] ?? 0) + amount;
    sum += amount;
  }
  return { count: records.length, sum, byLabel };
}

export function formatReport(summary) {
  const lines = Object.entries(summary.byLabel)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, total]) => `${label}: ${total.toFixed(2)}`);
  lines.push(`TOTAL: ${summary.sum.toFixed(2)}`);
  return lines.join("\n");
}

export async function loadReport(readText) {
  let text;
  try {
    text = await readText();
  } catch (error) {
    throw new ReportError("cannot read report", undefined, { cause: error });
  }
  return formatReport(summarize(parseReport(text)));
}
