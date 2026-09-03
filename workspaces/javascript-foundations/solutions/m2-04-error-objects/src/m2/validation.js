// m2-04-error-objects (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function validateUser(user) {
  if (typeof user.name !== "string" || user.name === "") {
    throw new ValidationError("name must be a non-empty string", "name");
  }
  if (typeof user.age !== "number" || Number.isNaN(user.age) || user.age < 0 || user.age > 150) {
    throw new ValidationError("age must be a number between 0 and 150", "age");
  }
  return user;
}
