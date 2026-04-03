import type {
  BuildProgressEvent,
  BuildResult,
  BuildTrigger,
} from "@bunpress/core";

interface ProgressRendererOptions {
  stream?: NodeJS.WriteStream;
  isTTY?: boolean;
}

const ANSI_RESET = "\x1b[0m";
const ANSI_GREEN_BG = "\x1b[42m";
const ANSI_EMPTY_BG = "\x1b[47m";
const ANSI_EMPTY_FG = "\x1b[90m";
const BAR_WIDTH = 24;

function renderBar(completed: number, total: number): string {
  const ratio = total === 0 ? 0 : completed / total;
  const filled = Math.round(BAR_WIDTH * ratio);
  const filledCells = Array.from({ length: filled }, () => `${ANSI_GREEN_BG}  ${ANSI_RESET}`).join("");
  const emptyCells = Array.from(
    { length: Math.max(0, BAR_WIDTH - filled) },
    () => `${ANSI_EMPTY_BG}${ANSI_EMPTY_FG}  ${ANSI_RESET}`,
  ).join("");
  return `${filledCells}${emptyCells}`;
}

function formatPhaseLine(prefix: string, event: BuildProgressEvent): string {
  const detail = event.detail ? ` ${event.detail}` : "";
  return `${prefix} ${event.phaseIndex}/${event.phaseCount} ${event.phaseLabel}${detail}`;
}

export class BuildProgressRenderer {
  private readonly stream: NodeJS.WriteStream;
  private readonly interactive: boolean;
  private lastLoggedPhaseId?: string;
  private active = false;

  constructor(
    private readonly prefix: string,
    options: ProgressRendererOptions = {},
  ) {
    this.stream = options.stream ?? process.stdout;
    this.interactive = options.isTTY ?? Boolean(this.stream.isTTY);
  }

  update(event: BuildProgressEvent) {
    this.active = true;

    if (!this.interactive) {
      if (this.lastLoggedPhaseId === event.phaseId) {
        return;
      }
      this.lastLoggedPhaseId = event.phaseId;
      console.log(formatPhaseLine(this.prefix, event));
      return;
    }

    const completed = Math.max(0, event.phaseIndex - 1);
    const percent = event.phaseCount === 0
      ? 0
      : Math.round((completed / event.phaseCount) * 100);
    const detail = event.detail ? ` ${event.detail}` : "";
    const line =
      `\r${this.prefix} [${renderBar(completed, event.phaseCount)}] ${String(percent).padStart(3, " ")}% ` +
      `${event.phaseLabel}${detail}`;
    this.stream.write(line);
  }

  complete(message: string) {
    if (!this.active) {
      console.log(message);
      return;
    }

    if (this.interactive) {
      this.stream.write("\r\x1b[2K");
    }

    console.log(message);
    this.active = false;
    this.lastLoggedPhaseId = undefined;
  }

  fail(message: string) {
    if (this.interactive) {
      this.stream.write("\r\x1b[2K");
    }

    console.error(message);
    this.active = false;
    this.lastLoggedPhaseId = undefined;
  }

  abort() {
    if (this.interactive && this.active) {
      this.stream.write("\r\x1b[2K");
    }

    this.active = false;
    this.lastLoggedPhaseId = undefined;
  }
}

export class BuildProgressManager {
  private initialRenderer = new BuildProgressRenderer("[bunpress:build]");
  private rebuildRenderer?: BuildProgressRenderer;

  onProgress(event: BuildProgressEvent & { trigger: BuildTrigger }) {
    if (event.trigger === "initial") {
      this.initialRenderer.update(event);
      return;
    }

    if (!this.rebuildRenderer || event.phaseIndex === 1) {
      this.rebuildRenderer = new BuildProgressRenderer("[bunpress:rebuild]");
    }
    this.rebuildRenderer.update(event);
  }

  onComplete(result: BuildResult, trigger: BuildTrigger) {
    const warningText =
      result.warnings.length > 0 ? `, ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}` : "";
    const message =
      trigger === "initial"
        ? `Initial build completed (${result.routes.length} routes${warningText})`
        : `Rebuild completed (${result.routes.length} routes${warningText})`;

    if (trigger === "initial") {
      this.initialRenderer.complete(message);
      return;
    }

    this.rebuildRenderer?.complete(message);
    this.rebuildRenderer = undefined;
  }

  onError(error: unknown, trigger: BuildTrigger) {
    const detail = error instanceof Error ? error.message : String(error);
    if (trigger === "initial") {
      this.initialRenderer.abort();
      return;
    }

    if (!this.rebuildRenderer) {
      this.rebuildRenderer = new BuildProgressRenderer("[bunpress:rebuild]");
    }
    this.rebuildRenderer.fail(`Rebuild failed: ${detail}`);
    this.rebuildRenderer = undefined;
  }
}
