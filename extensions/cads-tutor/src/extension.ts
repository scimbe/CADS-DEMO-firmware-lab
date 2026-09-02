import * as vscode from "vscode";
import { TutorController } from "./controller";
import type { Lang } from "./types";

let controller: TutorController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  controller = new TutorController(context);
  const c = controller;
  context.subscriptions.push(c);

  const register = (command: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async (...args: unknown[]) => {
        try {
          return await handler(...args);
        } catch (err) {
          c.log(`${command} failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
          void vscode.window.showErrorMessage(`CaDS Tutor: ${err instanceof Error ? err.message : String(err)}`);
          return undefined;
        }
      })
    );

  register("cads.tutor.open", () => c.open());
  register("cads.tutor.gotoStep", (courseId, stepId) => {
    if (typeof courseId === "string" && typeof stepId === "string") return c.gotoStep(courseId, stepId);
    return c.open();
  });
  register("cads.tutor.runChecks", async (taskId) => {
    if (typeof taskId === "string") return c.runTask(taskId);
    await c.open();
    return c.runAllTasks();
  });
  register("cads.tutor.ask", async (question) => {
    await c.open();
    return c.ask(typeof question === "string" ? question : undefined);
  });
  register("cads.tutor.reloadCourses", () => c.reloadCourses());
  register("cads.tutor.resetProgress", () => c.resetProgress());
  register("cads.tutor.setLanguage", async (lang) => {
    let chosen: Lang | undefined = lang === "de" || lang === "en" ? lang : undefined;
    if (!chosen) {
      const pick = await vscode.window.showQuickPick(
        [
          { label: "Deutsch", description: "de", value: "de" as Lang },
          { label: "English", description: "en", value: "en" as Lang },
        ],
        { placeHolder: "Sprache / Language" }
      );
      chosen = pick?.value;
    }
    if (chosen) await c.setLang(chosen);
  });
  register("cads.tutor.nextStep", () => c.nextStep());
  register("cads.tutor.prevStep", () => c.prevStep());
  register("cads.tutor.showOutput", () => c.output.show());

  await c.activate();
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
