/**
 * Course-pack discovery and loading (SPEC §3.3). Pure Node – the `vscode` specific bits (which
 * extensions contribute `cadsTutorCourses`, the workspace path, the output channel) are handed
 * in by the caller so this module stays unit-testable.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseFrontMatter } from "./frontmatter";
import { validateCourseManifest, validateStepFrontMatter } from "./schema";
import type { Course, Lang, LoadDiagnostic, Step, StepContent, StepFrontMatter } from "./types";

export interface ExtensionCourseContribution {
  extensionId: string;
  extensionPath: string;
  /** `contributes.cadsTutorCourses[].path`, relative to the extension root. */
  paths: string[];
}

export interface CourseSource {
  /** Absolute directory that either IS a pack (has course.json) or contains packs. */
  dir: string;
  origin: string;
}

export interface LoaderOptions {
  /** Absolute workspace root (first folder), if any. */
  workspaceRoot?: string;
  /** Home directory override (tests). */
  homeDir?: string;
  /** Image-wide course directory (default /opt/cads-tutor/courses). */
  imageDir?: string;
  extensionContributions?: ExtensionCourseContribution[];
  extraDirs?: string[];
}

export interface LoadResult {
  courses: Course[];
  diagnostics: LoadDiagnostic[];
  /** Every directory that was scanned – used to set up file watchers. */
  watchedDirs: string[];
}

export const IMAGE_COURSE_DIR = "/opt/cads-tutor/courses";

/** Builds the ordered list of sources; earlier entries win on id collisions (SPEC: "erste gewinnt"). */
export function collectSources(opts: LoaderOptions): CourseSource[] {
  const sources: CourseSource[] = [];
  for (const c of opts.extensionContributions ?? []) {
    for (const p of c.paths) {
      sources.push({ dir: path.resolve(c.extensionPath, p), origin: `extension:${c.extensionId}` });
    }
  }
  const image = opts.imageDir ?? IMAGE_COURSE_DIR;
  sources.push({ dir: image, origin: "image" });
  const home = opts.homeDir ?? os.homedir();
  sources.push({ dir: path.join(home, ".cads-tutor", "courses"), origin: "user" });
  if (opts.workspaceRoot) {
    sources.push({ dir: path.join(opts.workspaceRoot, ".cads-tutor", "courses"), origin: "workspace" });
  }
  for (const d of opts.extraDirs ?? []) {
    sources.push({ dir: path.resolve(d), origin: "setting" });
  }
  return sources;
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** A source dir may itself be a pack (course.json present) or a folder of packs. */
function packDirsIn(source: CourseSource): string[] {
  if (!isDir(source.dir)) return [];
  if (isFile(path.join(source.dir, "course.json"))) return [source.dir];
  return fs
    .readdirSync(source.dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") )
    .map((e) => path.join(source.dir, e.name))
    .filter((d) => isFile(path.join(d, "course.json")))
    .sort();
}

const STEP_FILE_RE = /^(.+)\.(de|en)\.md$/;

/** Loads one pack directory. Errors in individual steps do not discard the whole course. */
/**
 * A stand-in for a step that course.json promises but the pack does not (yet)
 * provide. It carries just enough front matter to render a title and to be
 * skipped everywhere a real step would be evaluated.
 */
function placeholderStep(stepId: string, moduleId: string, courseId: string, file: string): Step {
  const meta: StepFrontMatter = {
    id: stepId,
    title: stepId,
    bloom: "remember",
    objectives: [],
    requires: [],
    estimatedMinutes: undefined,
    links: [],
    tasks: [],
    socratic: [],
    creates: [],
    sources: [],
    scaffold: "independent",
    recallFrom: [],
    misconceptions: [],
  };
  return {
    id: stepId,
    moduleId,
    courseId,
    placeholder: true,
    variants: { en: { meta, body: "", file } },
  };
}

export function loadCoursePack(dir: string, origin: string): { course?: Course; diagnostics: LoadDiagnostic[] } {
  const diagnostics: LoadDiagnostic[] = [];
  const manifestFile = path.join(dir, "course.json");
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch (err) {
    diagnostics.push({ level: "error", file: manifestFile, message: `cannot read course.json: ${err instanceof Error ? err.message : String(err)}` });
    return { diagnostics };
  }
  const validated = validateCourseManifest(raw);
  for (const w of validated.warnings) diagnostics.push({ level: "warning", file: manifestFile, message: w });
  if (!validated.value) {
    for (const e of validated.errors) diagnostics.push({ level: "error", file: manifestFile, message: e });
    return { diagnostics };
  }
  const manifest = validated.value;

  const stepsDir = path.join(dir, "steps");
  const files = isDir(stepsDir) ? fs.readdirSync(stepsDir).filter((f) => STEP_FILE_RE.test(f)).sort() : [];
  if (files.length === 0) {
    diagnostics.push({ level: "error", file: stepsDir, message: `course "${manifest.id}": no step files found (expected steps/<id>.en.md)` });
  }

  const stepToModule = new Map<string, string>();
  for (const m of manifest.modules) for (const s of m.steps) stepToModule.set(s, m.id);

  const steps = new Map<string, Step>();
  for (const f of files) {
    const m = STEP_FILE_RE.exec(f)!;
    const stepId = m[1];
    const lang = m[2] as Lang;
    const file = path.join(stepsDir, f);
    let text: string;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (err) {
      diagnostics.push({ level: "error", file, message: `cannot read: ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }
    let fm;
    try {
      fm = parseFrontMatter(text);
    } catch (err) {
      diagnostics.push({ level: "error", file, message: `invalid YAML front matter: ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }
    if (!fm.hasFrontMatter) {
      diagnostics.push({ level: "error", file, message: "missing YAML front matter (--- block at top of file)" });
      continue;
    }
    const v = validateStepFrontMatter(fm.data, stepId);
    for (const w of v.warnings) diagnostics.push({ level: "warning", file, message: w });
    if (!v.value) {
      for (const e of v.errors) diagnostics.push({ level: "error", file, message: e });
      continue;
    }
    const moduleId = stepToModule.get(stepId);
    if (!moduleId) {
      diagnostics.push({ level: "warning", file, message: `step "${stepId}" is not listed in any module of course.json – ignored` });
      continue;
    }
    const content: StepContent = { meta: v.value, body: fm.body, file };
    const existing = steps.get(stepId) ?? { id: stepId, moduleId, courseId: manifest.id, variants: {} };
    existing.variants[lang] = content;
    steps.set(stepId, existing);
  }

  // Cross checks: every listed step must exist with an `en` variant; requires/links must resolve.
  for (const mod of manifest.modules) {
    for (const sid of mod.steps) {
      const step = steps.get(sid);
      if (!step) {
        // A course under construction lists steps whose files are not written yet.
        // Dropping them used to take the whole pack with it; now the step becomes a
        // visible placeholder and the rest of the course stays usable, so a course
        // can be delivered module by module.
        diagnostics.push({
          level: "warning",
          file: path.join(stepsDir, `${sid}.en.md`),
          message: `course "${manifest.id}": step "${sid}" is listed in module "${mod.id}" but has no usable step file – shown as "not yet available"`,
        });
        steps.set(sid, placeholderStep(sid, mod.id, manifest.id, path.join(stepsDir, `${sid}.en.md`)));
        continue;
      }
      if (!step.variants.en) {
        if (step.variants.de) {
          diagnostics.push({ level: "warning", file: step.variants.de.file, message: `step "${sid}" has no English variant (${sid}.en.md) – German is used for both languages` });
          step.variants.en = step.variants.de;
        }
      }
      // Task lists must agree between language variants (checks are language independent).
      const en = step.variants.en!;
      const de = step.variants.de;
      if (de && de !== en) {
        const enIds = en.meta.tasks.map((t) => t.id).join(",");
        const deIds = de.meta.tasks.map((t) => t.id).join(",");
        if (enIds !== deIds) diagnostics.push({ level: "warning", file: de.file, message: `task ids differ between de/en variants of "${sid}" (en: ${enIds}; de: ${deIds}); the English task list is authoritative` });
      }
      for (const req of en.meta.requires) {
        if (!steps.has(req)) diagnostics.push({ level: "error", file: en.file, message: `step "${sid}" requires unknown step "${req}"` });
      }
      for (const l of en.meta.links) {
        if ("step" in l && !steps.has(l.step)) diagnostics.push({ level: "warning", file: en.file, message: `step "${sid}" links to unknown step "${l.step}"` });
      }
      for (const r of en.meta.recallFrom) {
        const target = steps.get(r);
        if (!target) {
          diagnostics.push({ level: "error", file: en.file, message: `step "${sid}" recalls from unknown step "${r}"` });
        } else if (!(target.variants.en ?? target.variants.de)!.meta.tasks.some((t) => t.check.type === "question")) {
          diagnostics.push({ level: "warning", file: en.file, message: `step "${sid}" recalls from "${r}", which has no question task – the recall card will never show` });
        }
      }
    }
  }
  // Drop steps that ended up without any variant.
  for (const [sid, s] of [...steps]) if (!s.variants.en) steps.delete(sid);

  let curriculum: unknown[] = [];
  const curriculumFile = path.join(dir, "curriculum.json");
  if (isFile(curriculumFile)) {
    try {
      const c = JSON.parse(fs.readFileSync(curriculumFile, "utf8")) as unknown;
      // Accepted shapes: [..objectives], { objectives: [...] }, { <track>: [...] } (platform layout).
      const raw = Array.isArray(c)
        ? c
        : c && typeof c === "object" && Array.isArray((c as { objectives?: unknown }).objectives)
          ? (c as { objectives: unknown[] }).objectives
          : Object.values((c ?? {}) as Record<string, unknown>).filter(Array.isArray).flat();
      curriculum = raw.filter((o) => o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string");
    } catch (err) {
      diagnostics.push({ level: "error", file: curriculumFile, message: `cannot read curriculum.json: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  const hasFatal = diagnostics.some((d) => d.level === "error" && d.message.startsWith(`course "${manifest.id}": step`)) && steps.size === 0;
  if (hasFatal) return { diagnostics };

  return { course: { manifest, dir, origin, steps, curriculum }, diagnostics };
}

export function loadCourses(opts: LoaderOptions): LoadResult {
  const diagnostics: LoadDiagnostic[] = [];
  const courses: Course[] = [];
  const seen = new Map<string, string>();
  const sources = collectSources(opts);
  const watchedDirs: string[] = [];
  for (const source of sources) {
    if (isDir(source.dir)) watchedDirs.push(source.dir);
    for (const dir of packDirsIn(source)) {
      const { course, diagnostics: d } = loadCoursePack(dir, source.origin);
      diagnostics.push(...d);
      if (!course) continue;
      const prev = seen.get(course.manifest.id);
      if (prev) {
        diagnostics.push({ level: "warning", file: dir, message: `course id "${course.manifest.id}" already provided by ${prev}; this copy (${source.origin}: ${dir}) is ignored` });
        continue;
      }
      seen.set(course.manifest.id, `${source.origin}: ${dir}`);
      courses.push(course);
      diagnostics.push({ level: "info", file: dir, message: `loaded course "${course.manifest.id}" v${course.manifest.version} (${course.steps.size} steps, ${source.origin})` });
    }
  }
  for (const c of courses) {
    for (const pre of c.manifest.prerequisites) {
      if (!seen.has(pre)) diagnostics.push({ level: "warning", file: c.dir, message: `course "${c.manifest.id}" lists unknown prerequisite course "${pre}"` });
    }
  }
  return { courses, diagnostics, watchedDirs };
}

/** Steps in authored order (module order, then step order within the module). */
export function orderedSteps(course: Course): Step[] {
  const out: Step[] = [];
  for (const m of course.manifest.modules) {
    for (const sid of m.steps) {
      const s = course.steps.get(sid);
      if (s) out.push(s);
    }
  }
  return out;
}

/** Absolute project root for a course: `<workspace>/<project.root>` if that exists, else the workspace. */
export function resolveProjectRoot(course: Course, workspaceRoot: string | undefined): string | undefined {
  if (!workspaceRoot) return undefined;
  const root = course.manifest.project?.root;
  if (!root) return workspaceRoot;
  const candidate = path.resolve(workspaceRoot, root);
  if (isDir(candidate)) return candidate;
  // The workspace may already BE the project (folder named like project.root or containing its files).
  return workspaceRoot;
}
