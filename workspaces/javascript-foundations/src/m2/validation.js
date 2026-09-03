// m2-04-error-objects
// 1. Define and export a class ValidationError that extends Error.
//    - new ValidationError("message", "field")
//    - err.name === "ValidationError", err.message === "message", err.field === "field"
//    - err instanceof Error must be true
// 2. validateUser(user) throws a ValidationError when
//    - user.name is not a non-empty string       (field "name")
//    - user.age is not a number between 0 and 150 (field "age")
//    and returns the user unchanged otherwise.

export function validateUser(user) {
  throw new Error("TODO: validate name and age, throw ValidationError");
}
