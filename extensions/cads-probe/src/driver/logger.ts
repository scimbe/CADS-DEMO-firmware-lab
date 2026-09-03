/* logger.ts – injectable logger so the driver never touches console/DOM directly. */

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const nullLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function consoleLogger(prefix = '[probe]', verbose = false): Logger {
  return {
    debug: (m) => {
      if (verbose) console.debug(`${prefix} ${m}`);
    },
    info: (m) => console.info(`${prefix} ${m}`),
    warn: (m) => console.warn(`${prefix} ${m}`),
    error: (m) => console.error(`${prefix} ${m}`),
  };
}
