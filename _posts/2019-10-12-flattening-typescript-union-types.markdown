---
layout: post
title: "Flattening Typescript Union Types"
date: 2019-10-12 15:34:10 +0100
categories: programming
#programming
---

[Union Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types) in Typescript are a powerful way to describe a value that could one of two or more types. They are particularly useful in codebases that are transitioning from Javascript to Typescript. Where one function may accept an input parameter that can be one of several different types. 

Here‘s an example of that in action, taken from the Typescript docs:
```
/**
 * Takes a string and adds "padding" to the left.
 * If 'padding' is a string, then 'padding' is appended to the left side.
 * If 'padding' is a number, then that number of spaces is added to the left side.
 */
function padLeft(value: string, padding: any) {
    if (typeof padding === "number") {
        return Array(padding + 1).join(" ") + value;
    }
    if (typeof padding === "string") {
        return padding + value;
    }
    throw new Error(`Expected string or number, got '${padding}'.`);
}
```

