/**
 * The "CaDS Tutor" WebviewPanel (ViewColumn.Beside, retainContextWhenHidden). Rendering is
 * delegated to webview.ts; this class only owns the panel lifecycle and message plumbing.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { renderStepHtml, type FromWebview, type StepView, type ToWebview } from "./webview";

export const PANEL_VIEW_TYPE = "cadsTutor.step";

export class StepPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly messageEmitter = new vscode.EventEmitter<FromWebview>();
  readonly onMessage = this.messageEmitter.event;
  private readonly visibilityEmitter = new vscode.EventEmitter<boolean>();
  readonly onDidChangeVisibility = this.visibilityEmitter.event;
  private current: { view: StepView; courseDir: string } | undefined;

  constructor(private readonly extensionUri: vscode.Uri, private readonly courseRoots: () => vscode.Uri[]) {}

  get visible(): boolean {
    return this.panel?.visible ?? false;
  }

  get isOpen(): boolean {
    return this.panel !== undefined;
  }

  /** Renders `view`; creates the panel on first use. `preserveFocus` keeps the editor focused. */
  show(view: StepView, courseDir: string, preserveFocus = false): void {
    this.current = { view, courseDir };
    const existed = this.panel !== undefined;
    this.ensurePanel(preserveFocus);
    if (existed) this.panel!.reveal(undefined, preserveFocus);
    this.panel!.title = `CaDS Tutor: ${view.title}`;
    this.panel!.webview.html = renderStepHtml(view, this.panel!.webview.cspSource);
  }

  reveal(preserveFocus = false): void {
    if (this.panel) this.panel.reveal(undefined, preserveFocus);
  }

  /** Converts a pack-relative asset path into a webview URI (used by the markdown renderer). */
  assetUri(courseDir: string, stepFileDir: string, rel: string): string {
    if (!this.panel) return rel;
    const candidates = [path.resolve(stepFileDir, rel), path.resolve(courseDir, "assets", rel), path.resolve(courseDir, rel)];
    const found = candidates.find((c) => fs.existsSync(c)) ?? candidates[1];
    return this.panel.webview.asWebviewUri(vscode.Uri.file(found)).toString();
  }

  /** Adopts a panel VS Code restored after a reload (WebviewPanelSerializer). */
  adopt(panel: vscode.WebviewPanel): void {
    if (this.panel && this.panel !== panel) this.panel.dispose();
    this.panel = panel;
    panel.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri, ...this.courseRoots()] };
    this.wire();
  }

  /** Needs a panel to compute asWebviewUri – create it lazily before rendering. */
  ensurePanel(preserveFocus: boolean): void {
    if (this.panel) return;
    this.panel = vscode.window.createWebviewPanel(PANEL_VIEW_TYPE, "CaDS Tutor", { viewColumn: vscode.ViewColumn.Beside, preserveFocus }, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableFindWidget: true,
      localResourceRoots: [this.extensionUri, ...this.courseRoots()],
    });
    this.wire();
  }

  private wire(): void {
    if (!this.panel) return;
    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, "media", "tutor.svg");
    this.panel.webview.onDidReceiveMessage((m: FromWebview) => this.messageEmitter.fire(m));
    this.panel.onDidChangeViewState(() => this.visibilityEmitter.fire(this.panel?.visible ?? false));
    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.visibilityEmitter.fire(false);
    });
  }

  post(message: ToWebview): void {
    void this.panel?.webview.postMessage(message);
  }

  get currentView(): StepView | undefined {
    return this.current?.view;
  }

  dispose(): void {
    this.panel?.dispose();
    this.messageEmitter.dispose();
    this.visibilityEmitter.dispose();
  }
}
