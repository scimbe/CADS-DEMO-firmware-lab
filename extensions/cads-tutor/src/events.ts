/**
 * Learning-event log: `~/.cads-tutor/events.sqlite` via tutor-platform's LearningEventStore
 * (node:sqlite) with feature detection; when node:sqlite is unavailable in the extension host
 * (see shims/node-sqlite.cjs) a JSON file `events.json` next to it takes over. Same interface
 * either way, so mastery computation never has to care.
 */
import { LearningEventStore, computeMastery, type LearningEvent, type LearningEventFilter, type LearningEventInput } from "@cads/tutor-platform";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface EventStoreLike {
  record(input: LearningEventInput, now?: number): LearningEvent;
  query(filter?: LearningEventFilter): LearningEvent[];
  close(): void;
}

class JsonEventStore implements EventStoreLike {
  private events: LearningEvent[] = [];

  constructor(private readonly file: string) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(raw)) this.events = raw as LearningEvent[];
    } catch {
      this.events = [];
    }
  }

  record(input: LearningEventInput, now: number = Date.now()): LearningEvent {
    const event: LearningEvent = { ...input, id: randomUUID(), timestamp: now };
    this.events.push(event);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.events) + "\n", "utf8");
    return event;
  }

  query(filter: LearningEventFilter = {}): LearningEvent[] {
    return this.events
      .filter((e) => (!filter.entityId || e.entityId === filter.entityId) && (!filter.track || e.track === filter.track) && (!filter.objectiveId || e.objectiveId === filter.objectiveId) && (filter.since === undefined || e.timestamp >= filter.since))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  close(): void {
    /* nothing to release */
  }
}

export interface OpenedEventStore {
  store: EventStoreLike;
  backend: "sqlite" | "json";
  file: string;
}

export function defaultEventsDir(homeDir: string): string {
  return path.join(homeDir, ".cads-tutor");
}

/** Opens the SQLite store if node:sqlite works, otherwise the JSON fallback. Never throws. */
export function openEventStore(dir: string, log: (msg: string) => void = () => undefined): OpenedEventStore {
  fs.mkdirSync(dir, { recursive: true });
  const sqliteFile = path.join(dir, "events.sqlite");
  try {
    const store = new LearningEventStore(sqliteFile);
    return { store, backend: "sqlite", file: sqliteFile };
  } catch (err) {
    log(`node:sqlite unavailable (${err instanceof Error ? err.message : String(err)}); using JSON event log`);
    const jsonFile = path.join(dir, "events.json");
    return { store: new JsonEventStore(jsonFile), backend: "json", file: jsonFile };
  }
}

export function masteryFor(store: EventStoreLike, studentId: string, objectiveId: string, now = Date.now()): { mastery: number; events: number } {
  const events = store.query({ entityId: studentId, objectiveId });
  return { mastery: computeMastery(events, { now }), events: events.length };
}
