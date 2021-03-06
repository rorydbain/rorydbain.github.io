---
layout: post
title: "Encapsulation with Swift PropertyWrappers"
date: 2020-06-13 09:22:22 +0100
categories: programming swift
#programming #swift
---

Working in Swift when writing a class (or struct) it is [valuable](https://en.wikipedia.org/wiki/Encapsulation_(computer_programming)) to make things `private` where possible. However, you are looking to expose properties from that structure for use elsewhere. 

A common case I’ve found for this is when using a reactive framework like `RxSwift` or `Combine`. Using MVVM it common to have a `Subject` variable (e.g. `CurrentValueSubject`) stored as in instance variable of your ViewModel. That ViewModel can send events to its subjects, and whatever ‘owns’ the ViewModel (e.g. a View/ViewController) can subscribe to the observable stream. 

What you don’t want with this setup is for the ViewModel’s owner (or something else) to be able to send events to the ViewModel’s subjects. Propagating data from multiple places is something that makes a reactive system hard to maintain.

An easy way to avoid this, is to make your `Subject` private, and separately expose an `AnyPublisher`, which type erases your subject (this is even required if you want to conform to a protocol containing `AnyPublisher`, as you need to manually type erase the subject to a publisher). In Combine, that might look like this:


```swift
class ButtonViewModel {
    
    var isEnabled: AnyPublisher<Bool, Never> { 
        return isEnabledSubject.eraseToAnyPublisher() 
    }
    
    private let isEnabledSubject = CurrentValueSubject<Bool, Never>(false)
    
}
```

This is a reasonable approach and should work. However, I find it ‘noisy’, if you have a few publishers it can get busy.

An alternative approach, is to use Swift’s new property wrappers. I investigated using these as a syntactic sugar for the above definitions, but found the encapsulation properties of property wrappers were ideal for this scenario.

The `propertyWrapper` in question looks like the following: 

```swift
@propertyWrapper
struct CurrentValueProxy<Element, Error: Swift.Error> {
    let subject: CurrentValueSubject<Element, Error>
    
    init(_ value: Element) {
        self.subject = CurrentValueSubject(value)
    }
    
    var wrappedValue: AnyPublisher<Element, Error> {
        return subject.eraseToAnyPublisher()
    }
}
```

It takes the initial value for the `CurrentValueSubject` as an argument, and for it’s wrapped value, it returns the type erased subject. The interesting part though, is that **the `subject` property in above struct is only accessible by the class/struct containing the property wrapper**.

If we were to update the previous ViewModel example to use that, we’d have something like this:

```
class ButtonViewModel {
    
    @CurrentValueProxy<Bool, Never>(false) var isEnabled
    
}
```

Now using the above, you can access the underlying `CurrentValueSubject` from within the ViewModel by doing `_isEnabled.subject`. Outside the ViewModel, only the `AnyPublisher` is available, which gives us the same scoping functionality as the more-verbose example above.

RxSwift/Combine is the best usage of this that I’ve found, but there are likely other cases that might be useful. Perhaps if you want to expose a `UIView` in a sub-view without exposing the specific subclass and its properties? The unfortunate thing is that you need to write a propertyWrapper for each mapping of Private Type -> Internal Type that you want, Swift doesn’t support having a generic that extends a second generic unfortunately. 

