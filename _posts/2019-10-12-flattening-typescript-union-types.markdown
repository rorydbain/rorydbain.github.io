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

The `typeof` operator allows you to create a type alias for the _type of_ any typescript variable. When I first read about this operator I was thinking _“Why would you want to do that?“_. It wasn‘t until I was converting a large amount of Javascript code to Typescript that I saw the usefulness of it. Typescript is great at inferring the types of variables you’ve written. `typeof` allows you to pass around inferred types and in some cases mean that you never have to write types and interfaces at all.

Now, that’s a lot of abstract information, how does that look in practice?

My favourite use of `typeof` has been in a codebase I use at work where we build several ‘apps’ from one codebase. All of these apps have different `constants.ts` files. `typeof` and `import()` have been incredibly valuable in automatically generating types for these files that can be passed around the codebase.

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

Without `typeof` usages, we’d have to write and maintain an `AppConstants` interface that aligns to the constants files of each app. In addition to this, Typescript’s inference system can often type things better than you as a developer can. For example, in the above code snippets, if you had written the type of `AppConstants` yourself, you might have said `COOKIE_NAMES` has a property of `AUTH_TOKEN` that is a `string`. However, the inferred type will tell you that `AUTH_TOKEN` is `’X-Auth-Token’ | ‘AUTHENTICATION_TOKEN’`. This extra bit of context can be really useful.

Type inference has uses in other contexts too. You could infer the type of an API response from a mock JSON file; or you could have varied `Storage` objects for a Web app versus a ReactNative app; any time that you’re having to write a lot of types with Typescript, it’s worth thinking if there’s a way you can have that type inferred for you.

### Merging Union Types

Now, inferred types are great, but when you are saying something is the union of some inferred types, there will be cases where the two types don’t share properties. In this case, only shared properties will be accessible on the type unless you add a type check to confirm which side of a union your instance comes from.

```
const spiderman = {
    pseudonym: 'Spiderman',
    height: 150,
    address: {
        id: 500,
        headquarters: 'Avengers HQ'
    },
    photos: [{ id: 1, name: 'spidey.jpg' }, { id: 4, name: 'doc-oct.jpg' }, { id: 5, remoteUrl: 'https://www.spiderman.com/image1.jpeg' }]
}

const mrTilbury = {
    firstName: "Arthur",
    secondName: "Tilbury",
    height: 180,
    subject: "Art",
    address: {
        id: 1231,
        streetAddress1: '1 Cadbury Lane',
        city: 'Norfolk',
        postcode: 'N1 KE5',
    },
    degree: {
        university: 'Glasgow',
        subject: 'History of Art'
    }
}
type Teacher = typeof mrTilbury
type Superhero = typeof spiderman

type Person = Superhero | Teacher
```

If we now go to use the `Person` type, without a ‘discriminating union type’ check, we can’t access properties that aren’t shared by both Mr Tilbury and Spiderman. 

```
const getHeightDetails = (person: Person) => {
	const heightInCm = person.height // OK, as both Superhero and Teacher have height
	return heightInCm
}
```

In this case, both types in the union have keys called `height`, but what if we want to try and use the `subject` property on a teacher?

```
const getSubject = (person: Person) => {
	return person.subject // Compile error!
}
```

Annoyingly, although `Person` is a union of a `Student` and a `Teacher`, we get a compiler error on trying to access `person.subject` (I would rather typescript ‘flattened’ these union types for you. Such that a `Person` had a property of `subject` that was `string | undefined`.) 

To handle this use case, Typescript offers a feature called “Discriminating Union Types”. This technique involves you adding a constant property to each side of a union that acts as a unique identifier for that type in the union.

```
interface Superhero {
	type: ‘PERSON’
	...(other person values)
}

interface Teacher {
	type: ‘TEACHER’
	subject: string
	...(other teacher values)
}

type Person = Teacher | Superhero

const somePerson = {
	type: ‘TEACHER’,
	subject: ‘Maths’
} as Person // Just using `as` for the example

if (somePerson.type === ‘TEACHER’) {
	console.log(somePerson.subject) // Valid! 
}
```

By checking the `type` (our discriminator) is `TEACHER`, we can then access all properties that are unique to a Teacher and not in Superhero. This is useful and allows us to access properties in only one side of a union. However, it can be annoying to add a discriminating value to your objects (sometimes not possible), and it also adds an unnecessary runtime cost. 

Now, the main point of this post. There is a way that we can generate a `Person` type that makes properties of both types in the union accessible, whilst maintaining type safety.

```
// Converts a union of two types into an intersection 
// i.e. A | B -> A & B
type UnionToIntersection<U> = (U extends any
    ? (k: U) => void
    : never) extends ((k: infer I) => void)
    ? I
    : never;

// Merges two union types into a single type with optional values
// i.e. SafeMergeUnion<{ a: number, c: number } | { b: string, c: number }> = { a?: number, b?: string, c: number }
type SafeMergeUnion<T> = {
    [K in keyof UnionToIntersection<T>]: K extends keyof T ?
    T[K] extends any[] ? T[K]
    : T[K] extends object ? SafeMergeUnion<T[K]>
    : T[K]
    : UnionToIntersection<T>[K] | undefined
}

type Person = SafeMergeUnion<Teacher | Superhero>
```
(Note: this is using recursive types, a new feature of Typescript 3.7. Without recursive types, we‘d have to write a ‘finite’ version of this calling SafeMerge -> SafeMerge2 -> SafeMerge3 for each nested object in a union)

By doing this, we now have a type that allows us to safely access any property on either side of a union. Going way back to the example at the top, we can now access deeply nested properties without having to check if each nested object contains a value for a key. 

```
const superheroPhoto = (person: Person) => person.photos?.find(x => x.id === 1)?.name
```
(Note: this is using the new nested optional syntax in Typescript 3.7)

So, how is this `SafeMergeUnion<T>` actually working? 

To break it down, we take a type T and call `K in keyof UnionToIntersection<T>`. A simple `keyof T` would only give us the set of keys that are in both sides of the union, whereas swapping the union for an intersection means that we get all keys, even if they are only in one side of the union.

Now, for every key we say if that key is in `keyof T` (i.e. is this key in both sides of the union) then we want to use that value as is, but if the value is an object, then recursively call `SafeMergeUnion`. We have one edge case to cover first - arrays in Javascript are objects. So, we say if the value is an array of any type, then leave it untouched. Else if the value is an object, recursively call `SafeMergeUnion` on the object, otherwise leave the value as it is (it is a number, string etc).

If the key isn‘t in `keyof T`, then we know the value is in only one side of the union, leave the value as is but add an `| undefined` as we **know** that it is not in both sides of the union.

[You can play around with an example of this here](https://www.typescriptlang.org/play/?ts=3.7-Beta&ssl=64&ssc=22&pln=64&pc=66#code/MYewdgzgLgBBAOBLAJgUwE4FsCGYYF4YBvAKBnJnglQFdlwBPTALhgHIBlJNLXNgGjIUAFqkQBzYVFYBGAKwAGQRRjZkydKggRWpFSpStFSofpii1ARxrZ0UDDvYBBAG6ow4hzAASARTamMAC+yhTwwiBQII4A2kQwhjAy-DBg2JiorGwIKKgMAHQAVvDibMEp8YkALClpGVn0wAC0IMBQRSVlIcQJyEYpmpiRqACq6AA2WVJQVMwA9HMA7sv5OTw4YPmgmHOIOJ4yHailwQC6JEEkJKCQsJjoACqI4+MQAEY06AwExIEAZoh0NAAHLpTIwABETjswk+ENC5GoN2QoPqkKeL3enwY8MCogkUlkAA4TCoIDQ3oVUG1WFC7LiVGoNFpHHozL1ZAAmADMyUCZKgmlQUCc6k02hkWRkMAAwmoPl8YAAZXCoAT8ijARBQBhZYEgdB-EDjADW6vZlGiUFAaD10oA0gBROTmighQJocRC3Qa8g0MCINxA7W69gAcXG2Ag4hAi1dZnJlOp0nY3kQ0AN3xAfxg0KgARUl0uOvgqBgD1Q2GAonQPxLqGzMHuGNeCoYJHrMA4NFL6BrIDrDFLjbWGA2V07AAUHOAft3e-2YAAfcuV6sYK4LWXgINQCCqGD+xCzxtQRYD+v7xBgKKqPDX+xA5PHvAkLeIfKofK55cwABCMBNAAfD+ABk-4dkOZYjAG4APCAACSN4OM+4AADwjCBhAABQjDAqAAB72GAyD7rg7YqAA-DA2EmqwIwAJQECBLggCggSsGAqBBkxhHEaRNG0aw15-BgMAIUx+AsWxyAMYE1EIRxqTcRgADcm5zDAACyGCePuZ4Dkes6XgkN4DtgcDXuI4xlp2izasIMAgPAUAvtg4wwC47k0Fob6aR+X5dtgok6egngwS+aHxNgnE0JgbwYCkwCxfFYlBL+8RvKw0DoFZSUpQltZBFhPTYJRBWJTAbzlXAgp5TAyWpHFhXBH5fkwCaeSNhFcGIchT5tJFDwgfZLwwJ4sDuR5nUMPujYWUZYBJSAmDwLYqDIDAt4zY2DwJHuqDjDmizCIg1ZOWA4zfBN+4zVeeBvJEjkQLkc05lAoiHrBYDtQAYga+FBt8M1OTmYgfWJL1oKDW2fYtrDteQiDvZ9IPpqZVVPZZaBvbDZbw4jBgo2WXnjD5MBGrWH3YLAaNkXgtjoNg3zYcIuDIDZsPo8AUZlgCQKTWR6BM7N+FEe4m0gEmbQQHJW4WnAwqwzTHV5FtA4JXjqjC8zqhXvuFCExQh3UAkxOed5fMA9TtNq+juBOdLUCCPLFrULA9rq1VZYWRwwWoKF4XfTRmjAJ8L0eBTANro5UtUm0TFG+QJtlkn+g0KbDwxPapx6wk+7YdqTYZ7AmsWWAzViQDOVWU5tYQCtwqnR4cuacnrxluQacPJ9pPk5gJcXVdYvprA14XWWUNlqecPfSk7v7V7msQxbZNluPNtfS+ddfWgAJcZtKgTlBQUhbpozfWhw0-Gy5DZxjO05j1YDwUhj5Iq56HDacrCe3xEu3S6jmPalFAhZxzmLfi9MGAxFztRcB5wVCsAQZAgBjt46wGon7M+YUL5DWzqcICSkEFKWfq-fqH8hpAQIb+f0e9rwbQuFcG40AYAER+M2Z4rZsR52wQHc+z8r4xzEiuecGB+xEJYbAVyUAbIAHk-iTgiFEAA6g5BCyBpSEAIvkcIkRoiUXyPvZA2F2FSTYfkFABB8CEBkAxQxdRUAkCAA)
