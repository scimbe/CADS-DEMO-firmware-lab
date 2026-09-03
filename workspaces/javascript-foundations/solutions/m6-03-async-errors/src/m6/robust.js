// m6-03-async-errors (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function failing(message) {
  return Promise.reject(new Error(message));
}

export async function tryLoad(fn) {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function mustLoad(fn) {
  try {
    return await fn();
  } catch (error) {
    throw new Error(`load failed: ${error.message}`, { cause: error });
  }
}
