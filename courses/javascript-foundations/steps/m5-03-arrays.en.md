---
id: m5-03-arrays
title: Arrays, length and who owns the data
bloom: apply
objectives: [javascript-web-javascript-guide-indexed-collections]
requires: [m5-02-optional-chaining]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m5-01-objects, m3-02-off-by-one]
links:
  - { step: m5-02-optional-chaining }
  - { step: m5-04-transformations }
  - { file: "src/m5/collection.js", line: 10 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections", title: "MDN: Indexed collections" }
sources: [src/m5/collection.js, test/m5-03-arrays.test.js, src/m3/window.js]
tasks:
  - id: collection
    title: All three collection tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m5-03 addTask appends without touching the input", "m5-03 removeAt drops one element without touching the input", "m5-03 trimTo shortens without touching the input"], minPass: 3 }
  - id: mutate-or-copy
    title: Mutating and non-mutating methods
    check: { type: question, prompt: { en: "Sort the methods you used or replaced into two groups: those that change the array they are called on, and those that return a new one. Then say when a mutating API is the better design, and what a caller has to know when you ship one.", de: "Ordne die Methoden, die du benutzt oder ersetzt hast, in zwei Gruppen: die, die das Array verändern, auf dem sie aufgerufen werden, und die, die ein neues zurückgeben. Sag dann, wann eine verändernde Schnittstelle der bessere Entwurf ist und was ein Aufrufer wissen muss, wenn du eine solche ausliefert." }, rubric: "Groups correctly: push, pop, shift, unshift, splice, sort, reverse and assigning to length mutate; slice, concat, map, filter and spreading produce new arrays. Argues that mutation is defensible for a large array or a private accumulator inside one function, and that a mutating API must document it, because a caller who keeps a reference will see the change everywhere.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:collection:failed", question: { en: "Is the returned array wrong, or is the caller's array no longer what it was?", de: "Ist das zurückgegebene Array falsch, oder ist das Array des Aufrufers nicht mehr das, was es war?" }, hints: [ { en: "push, splice and assigning to length all change the array in place.", de: "push, splice und die Zuweisung an length verändern das Array alle an Ort und Stelle." }, { en: "slice(start, end) returns a new array and never touches the original.", de: "slice(start, end) liefert ein neues Array und fasst das Original nie an." }, { en: "removeAt has to leave an out-of-range index alone - and still return a new array.", de: "removeAt muss einen Index außerhalb des Bereichs unangetastet lassen - und trotzdem ein neues Array zurückgeben." } ] }
misconceptions:
  - pattern: "deep-equal|'a',\\s*'b'"
    question: { en: "The input array changed. Which of the methods you called writes into the array it is called on?", de: "Das Eingabe-Array hat sich geändert. Welche der aufgerufenen Methoden schreibt in das Array, auf dem sie aufgerufen wird?" }
    hints: [ { en: "push, splice, sort and reverse mutate; slice, concat and map do not.", de: "push, splice, sort und reverse verändern; slice, concat und map nicht." }, { en: "list.length = size truncates the original array as well.", de: "list.length = size kürzt ebenfalls das Original-Array." }, { en: "Build the answer from copies: [...list, task] and list.slice(0, size).", de: "Bau die Antwort aus Kopien: [...list, task] und list.slice(0, size)." } ]
---
## Learning goal

Choose array operations by what they do to the caller's data, and read `length` as a property that can be written as well as read.

## length is not a count you observe

MDN's [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) chapter makes a point beginners rarely expect: `length` is a writable property, and assigning to it changes the array.

```js
const a = [1, 2, 3];
a.length = 2;    // a is now [1, 2]
a.length = 5;    // a is now [1, 2, <3 empty items>]
```

Assigning a smaller length truncates in place - which is why using it to "return the first n elements" quietly destroys the caller's data. Assigning a larger one creates a **sparse** array: `a[3]` is `undefined`, but the slot does not exist, `3 in a` is `false`, and `map` skips it while keeping the hole. Sparse arrays are a corner of the language worth recognising and avoiding.

## Two families of methods

| Mutate in place | Return a new array |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `slice`, `concat`, spread `[...a]` |
| `splice`, `sort`, `reverse` | `map`, `filter`, `flat` |
| `a.length = n` | `Array.from(a)` |

Neither family is better in the abstract. The rule that matters is about **ownership**: a function given an array by a caller does not own it. Changing it is a side effect the caller did not ask for, and because [an array is a reference](step:m5-01-objects), that change is visible everywhere the array is held.

Mutation is a fine choice for an accumulator you created inside your own function, or for a very large array where copying would be wasteful - but then say so in the name and the documentation.

## The exercise

Open [`src/m5/collection.js`](file:src/m5/collection.js). All three functions do their job and destroy the input while doing it:

- `addTask(list, task)` uses `push`.
- `removeAt(list, index)` uses `splice`, and also has to ignore an index outside the array.
- `trimTo(list, size)` assigns to `length`.

Rewrite all three to return new arrays. Each test asserts the result **and** that the input is untouched.

## How you know it worked

```bash
node --test test/m5-03-arrays.test.js
```

Three green. The question task asks you to sort the methods into the two families and to defend when mutation is right. Next: [turning arrays into answers](step:m5-04-transformations).
