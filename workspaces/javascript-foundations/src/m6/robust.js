// m6-03-async-errors
// failing(message) rejects with an Error carrying that message - given.
//
// tryLoad(fn)     -> { ok: true, value } when fn() resolves,
//                    { ok: false, error: <message> } when it rejects
// mustLoad(fn)    -> the resolved value; when fn() rejects, throw a new Error
//                    "load failed: <original message>" (keep the original under
//                    the standard `cause` option)
// A try/catch around a call you did not await never sees the rejection.

import "../course-hint.js"; // prints guidance if this file is run directly

export function failing(message) {
  return Promise.reject(new Error(message));
}

export async function tryLoad(fn) {
  try {
    const value = fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function mustLoad(fn) {
  throw new Error("TODO: await fn(), wrap a rejection in a new Error with cause");
}
