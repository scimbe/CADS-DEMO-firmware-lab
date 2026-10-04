/**
 * Bridge between this extension (web-worker extension host, no DOM) and the page
 * script image/logout/cads-logout.js (workbench document, owns `window.location`).
 *
 * A worker cannot navigate the browser tab. The page script can, so the extension
 * asks it over a same-origin BroadcastChannel and waits for the acknowledgement.
 * The channel name and the message shapes are a contract with cads-logout.js.
 */

export const CHANNEL_NAME = 'cads-logout';

export type PageMessage = { type: 'ack'; url: string };
export type ExtensionMessage = { type: 'logout' };

/** The part of BroadcastChannel this module uses (lets the tests pass a fake). */
export interface ChannelLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: Event) => void): void;
  removeEventListener(type: 'message', listener: (event: Event) => void): void;
}

function isAck(data: unknown): data is PageMessage {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'ack';
}

/**
 * Ask the page to navigate to the logout URL. Resolves with the URL the page is
 * going to, or `null` when no page script answered within `timeoutMs` (image
 * without the injected script, or an extension host on a different origin).
 */
export function requestNavigation(channel: ChannelLike, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const done = (url: string | null): void => {
      clearTimeout(timer);
      channel.removeEventListener('message', onMessage);
      resolve(url);
    };
    const onMessage = (event: Event): void => {
      const data = (event as Event & { data?: unknown }).data;
      if (isAck(data)) done(String(data.url));
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    channel.addEventListener('message', onMessage);
    const request: ExtensionMessage = { type: 'logout' };
    channel.postMessage(request);
  });
}
