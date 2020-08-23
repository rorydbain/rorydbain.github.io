---
layout: post
title: "Flattening Typescript Union Types"
date: 2019-10-12 15:34:10 +0100
categories: programming
#programming
---

In this post I describe how to flatten a union of two objects into one object - like joining two database tables. [Click here to jump straight to the type alias for that](#flattenunion)

### Union Types

[Union Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types) in Typescript are a powerful way to describe a value that could be one of two or more types. They are useful in codebases that are transitioning from Javascript to Typescript, where one function may accept an input parameter that can be one of several different types. 

Here‘s an example of that in action, taken from the Typescript docs:
```
/**
 * Takes a string and adds "padding" to the left.
 * If 'padding' is a string, then 'padding' is appended to the left side.
 * If 'padding' is a number, then that number of spaces is added to the left side.
 */
function padLeft(value: string, padding: string | number) {
    if (typeof padding === "number") {
        return Array(padding + 1).join(" ") + value;
    }
    if (typeof padding === "string") {
        return padding + value;
    }
}
```

Coming to Typescript from a background of using Swift, I found myself rarely using union types. I preferred writing things that either used concrete types or generics. However, I recently discovered the `typeof` operator in Typescript and have been loving using it. 

### Typeof

The `typeof` operator allows you to create a type alias for the _type of_ any typescript variable. When I first read about this operator I was thinking _“Why would you want to do that?“_. It wasn‘t until I was converting a large amount of Javascript code to Typescript that I saw the usefulness of it. Typescript is great at inferring the types of variables you’ve written. `typeof` allows you to pass around inferred types and in some cases that means that you can avoid writing types and interfaces yourself.

Now, that’s a lot of abstract information, how does that look in practice?

My favourite use of `typeof` has been in a codebase I work on where we build several ‘apps’ from one codebase. All these apps have different `constants.ts` files. `typeof` and `import()` have been incredibly valuable in automatically generating types for these files that can be passed around the codebase.

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

Without `typeof` usages, we’d have to write and maintain an `AppConstants` interface that aligns to the constants files of each app. In addition to this, Typescript’s inference system can type things better than you as a developer can. For example, in the above code snippets, if you had written the type of `AppConstants` yourself, you might have said `COOKIE_NAMES` has a property of `AUTH_TOKEN` that is a `string`. However, the inferred type will tell you that `AUTH_TOKEN` is `’X-Auth-Token’ | ‘AUTHENTICATION_TOKEN’`. This extra bit of context can be useful.

Type inference has uses in other contexts. You could infer the type of an API response from a mock JSON file; or you could have varied `Storage` objects for a Web app versus a ReactNative app; any time that you’re having to write a lot of types with Typescript, it’s worth thinking if there’s a way you can have that type inferred for you.

### Merging Union Types

Now, inferred types are great, but when you are saying something is the union of two inferred types, there will be cases where the two types don’t share properties. In this case, shared properties will be accessible on the union type, unless you add a type check to confirm which side of a union your instance comes from.

Take the following data structures of a Superhero and Teacher for example:

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

Now, as Teacher and Superhero both have a height property, I can access height on an instance of the union type:

```
const getHeightDetails = (person: Person) => {
	const heightInCm = person.height // OK, as both Superhero and Teacher have height
	return heightInCm
}
```

But what if we want to try and use the `subject` property on a teacher?

```
const getSubject = (person: Person) => {
	return person.subject // Compile error!
}
```

Annoyingly, although `Person` is a union of a `Superhero` and a `Teacher`, we get a compiler error on trying to access `person.subject` because `Superhero` does not contain a subject property. (I would typescript ‘flattened’ these union types for you. Such that a `Person` had a property of `subject` that was `string | undefined`.) 

To handle this use case, Typescript offers a feature called “Discriminating Union Types”. This technique involves you adding a constant property to each side of a union that acts as a unique identifier for that type in the union. You can check if a property is ‘in’ the variable that is unique to one side of the union, e.g photos on Spider-Man. However, this value might change, or the Teacher type may later get photos and you’d have to update all usages of discriminating by photo to instead discriminate by another property.

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

By checking the `type` (our discriminator) is `TEACHER`, we can access all properties that are unique to a Teacher and not in Superhero. This is useful and allows us to access properties in one side of a union. However, it can be annoying to add a discriminating value to your objects (sometimes not possible), and it adds an unnecessary runtime cost. 

### FlattenUnion ###

Now, the main point of this post. There is a way that we can generate a `Person` type that makes properties of both types in the union accessible, whilst maintaining type safety.

```
// Converts a union of two types into an intersection 
// i.e. A | B -> A & B
type UnionToIntersection<U> = (U extends any
    ? (k: U) => void
    : never) extends ((k: infer I) => void)
    ? I
    : never;

// Flattens two union types into a single type with optional values
// i.e. FlattenUnion<{ a: number, c: number } | { b: string, c: number }> = { a?: number, b?: string, c: number }
type FlattenUnion<T> = {
    [K in keyof UnionToIntersection<T>]: K extends keyof T ?
    T[K] extends any[] ? T[K]
    : T[K] extends object ? FlattenUnion<T[K]>
    : T[K]
    : UnionToIntersection<T>[K] | undefined
}

type Person = FlattenUnion<Teacher | Superhero>
```
<small>(Note: this is using recursive types, a new feature of Typescript 3.7. Without recursive types, we‘d have to write a ‘finite’ version of this calling FlattenUnion -> FlattenUnion2 -> FlattenUnion3 for each nested object in a union)</small>

By doing this, we now have a type that allows us to safely access any property on either side of a union. Going way back to the example at the top, we can now access deeply nested properties without having to check if each nested object contains a value for a key. 

```

type Person = Teacher | Superhero
type SafePerson = FlattenUnion<Person>

// Using discriminating union, we have to check a property to verify the type
const getPhotoWithId = (person: Person, id: number) => {
    if ('photos' in person) {
        return person.photos.find(p => p.id === id)
    }
    return undefined
}

// Using FlattenUnion
const getPhotoWithId = (person: SafePerson, id: number) => person.photos?.find(p => p.id === id)
```
<small>(Note: this is using the new nested optional syntax in Typescript 3.7)</small>

By using the FlattenUnion version, we don‘t have to inspect the property to verify our photos property exist. We can autocomplete all properties - something that doesn‘t work with the discriminated union version as the keys on both sides of the union are suggested by Typescript.

How is this `FlattenUnion<T>` working? 

To break it down, we take a type T and call `K in keyof UnionToIntersection<T>`. A simple `keyof T` would give us the set of keys that are in both sides of the union, whereas swapping the union for an intersection means that we get all keys, even if they are only in one side of the union.

Now, for every key we say if that key is in `keyof T` (i.e. is this key in both sides of the union) then we want to use that value as is - it is not optional and we know it exists in both sides of the union. We want to say, take this value, and if it is an object, return the FlattenUnion of that object (the recursive part). However, before we can think about using `FlattenUnion`, we have one edge case to cover first - arrays in Javascript are objects. We say if the value is an array of any type, then leave it untouched. Else if the value is an object, recursively call `FlattenUnion` on the object, otherwise leave the value as it is (it is a number, string etc).

If the key isn‘t in `keyof T`, then we know the value is in only one side of the union, leave the value as is but add an `| undefined` as we **know** that it is not in both sides of the union.

[You can play around with an example of this here](https://www.typescriptlang.org/play/?ts=3.7-Beta&ssl=58&ssc=29&pln=58&pc=38#code/MYewdgzgLgBBAOBLAJgUwE4FsCGYYF4YBvAKBnJnglQFdlwBPTALhgHIBlJNLXNgGjIUAFqkQBzYVFYBGAKwAGQRRjZkydKggRWpFSpStFSofpii1ARxrZ0UDDvYBBAG6ow4hzAASARTamMAC+yhTwwiBQII4A2kQwhjAy-DBg2JiorGwIKKgMAHQAVvDibMEp8YkALClpGVn0wAC0IMBQRSVlIcQJyEYpmpiRqACq6AA2WVJQVMwA9HMA7sv5OTw4YPmgmHOIOJ4yHailwQC6JEEkJKCQsJjoACqI4+MQAEY06AwExIEAZoh0NAAHLpTIwABETjswk+ENC5GoN2QoPqkKeL3enwY8MCogkUlkAA4TCoIDQ3oVUG1WFC7LiVGoNFpHHozL1ZAAmADMyUCZKgmlQUCc6k02hkWRkMAAwmoPl8YAAZXCoAT8ijARBQBhZYEgdB-EDjADW6vZlGiUFAaD10oA0gBROTmighQJocRC3Qa8g0MCINxA7W69gAcXG2Ag4hAi1dZnJlOp0nY3kQ0AN3xAfxg0KgARUl0uOvgqBgD1Q2GAonQPxLqGzMHuGNeCoYJHrMA4NFL6BrIDrDFLjbWGA2V07AAUHOAft3e-2YAAfcuV6sYK4LWXgINQCCqGD+xCzxtQRYD+v7xBgKKqPDX+xA5PHvAkLeIfKofK55cwABCMBNAAfD+ABk-4dkOZYjAG4APCAACSN4OM+4AADwjCBhAABQjDAqAAB72GAyD7rg7YqAA-DA2EmqwIwAJQECBLggCggSsGAqBBkxhHEaRNG0aw15-BgMAIUx+AsWxyAMYE1EIRxqTcRgADcm5zDAACyGCePuZ4Dkes6XgkN4DtgcDXuI4xlp2izasIMAgPAUAvtg4wwC47k0Fob6aR+X4wAAYpGUDETBL5ofE2CcTQmBvBgKTALF8ViUEv7xG8rDQOgVlJSlCW1kEWE9NglEFYlMBvOVcCCnlMDJakcWFcEfl+TAJp5I2EVwYhyFPm0kUPCB9kvDAniwO5HmdQw+6NhZRlgElICYPAtioMgMC3jNjYPAke6oOMOaLMIiDVk5YDjN8E37jNV54G8kSORAuRzTmUCiIesFgO1QUGvhQbfDNTk5mIH1iS9aAg1tn2Law7XkIg72fcD6amVVT2WWgb0w2WcMIwYyNll54w+TARq1h92CwKjZF4LY6DYN82HCLgyA2TDaPAFGZYAkCk1kegjOzfhRHuJtIBJm0EByVuFpwMKMPUx1eRbQOCW46oQtM6oV77hQBMUId1AJETnnebz-1UzTqto7gTlS1Aghyxa1CwPaatVWWFkhdT4XfTRmjAJ8L0eOT-1ro5ktUm0TGG+QxtlvH+g0CbDwxPapy6wk+7YdqTap7AGsWWAzVif9OVWU5tYQCtwqnR4suaQnrxluQycPJ9JNk5ghcXVdovprA14XWWkNlqesPfSkbv7Z7Gvg+bpNliP1tfS+1dfWgAJcZtKgTlBwWhf7Q0lWy5AZ+jO05j1YDwUhj5Iq56HDacrAe3x4u3V1OZ7ZRgTp0zqLfidMGAxCztRQB5wVCsCgcAr+DsY6wGor7MK7hb5oSgUBJSUClK33vv1J+p8M5ZxXP6be14NoXCuDcaAMACI-GbM8Vs2Js6oJPi-SOYkVzzgwP2bBtDYCuSgDZAA8n8ScEQogAHUHIIWQNKQgBF8jhEiNESi+Qd7IGwgwqS9D8goAIPgQgMgGIaLqKgEgQA)
