---
layout: post
title: "Flattening Typescript Union Types"
date: 2019-10-12 15:34:10 +0100
categories: programming
#programming
---

### Union Types

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

Coming to Typescript from a background of using Swift, I found myself rarely using union types. I preferred writing things that either used concrete types generics. However, I recently discovered the `typeof` operator in Typescript and have been loving using it. 

### Typeof

The `typeof` operator allows you to create a type alias for the _type of_ any typescript variable. When I first read about this operator I was thinking _“Why would you want to do that?“_. It wasn‘t till I was converting a large amount of Javascript code to Typescript that I saw the usefulness of it. Typescript is great at inferring the types of variables you’ve written. `typeof` allows you to pass around inferred types and in some cases mean that you never have to write types and interfaces at all.

Now, that’s a lot of abstract information, how does that look in practice?

My favourite use of `typeof` has been in a codebase I use at work where we build several ‘apps’ from one codebase. Each of these apps have different `constants.ts` files. `typeof` and `import()` have been incredibly valuable in automatically generating types for these files that can be passed around the codebase.

``` 
// app-one/constants.ts

export const COOKIE_KEYS = {
	AUTH_TOKEN: ‘X-Auth-Token’
} 

export const CURRENCY = ‘USD’
```

```
// app-two/constants.ts

export const COOKIE_KEYS = {
	AUTH_TOKEN: ‘AUTHENTICATION_TOKEN’,
	LOGIN_TOKEN: ‘X-Login-Token’
}

export const CURRENCY = ‘GBP’
```

```
// shared/constants.ts

type AppOneConstants = typeof import(“../app-one/constants”)
type AppTwoConstants = typeof import(“../app-two/constants”)

type AppConstants = AppOneConstants | AppTwoConstants

```

```
// src/api/middleware/authenticationMiddleware.ts

const authenticationMiddleware = (request: Request, constants: AppConstants) => {
	request.addHeader(constants.COOKIE_KEYS.AUTH_TOKEN, ‘some-token’)
}
```

Without `typeof` usages, we’d have to write and maintain an `AppConstants` interface that aligns to the constants files of each app. In addition to this, Typescript’s inference system can often type things better than you as a developer can. For example, in the above code snippets, if you had written the type of `AppConstants` yourself, you might have said `COOKIE_NAMES` has a property of `AUTH_TOKEN` that is a `string`. However, the inferred type will actually tell you that `AUTH_TOKEN` is `’X-Auth-Token’ | ‘AUTHENTICATION_TOKEN’`. This extra bit of context can be really useful.

Type inference has uses in other contexts too. You could infer the type of an API response from a mock JSON file; or you could have varied `Storage` objects for a Web app versus a ReactNative app; any time that you’re having to write a lot of types with Typescript, it’s worth thinking if there’s a way you can have that type inferred for you.

### Merging Union Types

Now, inferred types are great, but when you are saying something is the union of some inferred types, there will be cases where the two types don’t share properties. 