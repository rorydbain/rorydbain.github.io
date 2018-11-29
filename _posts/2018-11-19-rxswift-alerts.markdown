---
layout: post
title:  "Presenting a series of UIAlertControllers with RxSwift"
date:   2018-11-19 22:00:00 +0000
categories: programming
#programming
---
I was recently writing a helper application for work that would store a bunch of URL paths that we support as Deeplinks. The user can pick from one of these paths and will be prompted to input a value for any parameters (any part of the path that matched a specific regex). However, the app got pretty complex when having to deal with multiple capture groups in that regular expression.

The problem was this - given an array of strings (capture groups from my regular expression), show an alert one after the other requesting a value that the user wishes to input for that ‘key’.

<iframe src="https://giphy.com/embed/9x2WYbCdexFTdWWjxB" width="100%" height="500" frameBorder="0" class="giphy-embed" allowFullScreen style="pointer-events: none;"></iframe>

Traditionally, I would have probably made some `UIAlertController`-controller that might look something like this.

```swift
protocol AlertPresenting: class {
    func present(alert: UIViewController)
}

protocol MultipleAlertControllerOutput: class {
    func didFinishDisplayingAlerts(withChoices choices: [(String, AlertViewModel)])
}

class MultipleAlertController {
    
    private var iterations = 0
    private var viewModels = [AlertViewModel]()
    private var results = [(String, AlertViewModel)]()
    private weak var alertPresenter: AlertPresenting?
    weak var output: MultipleAlertControllerOutput?
    
    func display(alerts alertViewModels: [AlertViewModel]) {
        self.iterations = 0
        self.results = []
        self.viewModels = alertViewModels
        self.showNextAlert()
    }
    
    private func showNextAlert() {
        guard viewModels.indices.contains(self.iterations) else {
            self.output?.didFinishDisplayingAlerts(withChoices: self.results)
            return
        }
        self.display(alert: viewModels[self.iterations])
    }
    
    private func display(alert: AlertViewModel) {
        // some stuff here showing alert, invoking show next alert after completion
        iterations += 1
    }
    
}
```

Now this isn’t necessarily bad, but having to keep track of or reset state can always lead to bugs - particularly in asynchronous situations. Instead I had an idea for doing this using RxSwift.

```swift
import RxSwift

func populateParameters(for alertViewModels: [AlertViewModel], presentingAlertFrom viewController: ViewControllerPresenting?) -> Observable<[RegexReplacement]> {
    
    return Observable
        .from(alertViewModels)
        .concatMap { alertViewModel -> Observable<(String, AlertViewModel)> in
            guard let vc = viewController else { return Observable.empty() }
            
            let textFieldResponse: Observable<String> = vc.show(textFieldAlertViewModel: alertViewModel)
            return textFieldResponse
                .map { textInputValue in (textInputValue, alertViewModel) }
        }
        .toArray()
}
```

```swift
// Helper method for Rx UIAlertControllers
protocol ViewControllerPresenting: class {
    func present(viewController: UIViewController)
}

extension ViewControllerPresenting {
    
    func show(textFieldAlertViewModel: AlertViewModel) -> Observable<String> {
        return Observable.create { [weak self] observer in
            let alert = UIAlertController(title: textFieldAlertViewModel.title,
                                          message: textFieldAlertViewModel.message,
                                          preferredStyle: .alert)
            
            alert.addAction(.init(title: "Cancel",
                                  style: .cancel,
                                  handler: { _ in
                                    observer.onCompleted() }))
            
            alert.addAction(.init(title: "Submit",
                                  style: .default,
                                  handler: { _ in
                                    observer.onNext(alert.textFields?.first?.text ?? "")
                                    observer.onCompleted() }))
            
            alert.addTextField(configurationHandler: { _ in })
            
            self?.present(viewController: alert)
            
            return Disposables.create {
                alert.dismiss(animated: true, completion: nil)
            }
        }
    }
    
}
```

Now, this looks like a lot of code, but the lower part is simply a wrapping on UIAlertController with Rx. Something that can be re-used for any UIAlertController with a text field.

Let’s break down the main bits. 

```swift
Observable.from(alertViewModels)
```
This little snippet takes an array an gives you an observable that emits each element of the array. In this example that will be an event for event match in the regular expression.

```swift
.concatMap { alertViewModel -> Observable<(String, AlertViewModel)> in
            guard let vc = viewController else { return Observable.empty() }
            
            let textFieldResponse: Observable<String> = vc.show(textFieldAlertViewModel: alertViewModel)
            return textFieldResponse
                .map { textInputValue in (textInputValue, alertViewModel) }
        }

```

Here we take the stream of matches for the regular expression and we `compactMap` an observable of the String that the user typed into a UIAlertController alongside the original AlertViewModel instance. The RxSwift method doing the heavy lifting is the `compactMap`. It waits for a completed event to be sent by the observable text field responses before invoking the next alert. 

The result of the `compactMap` is an Observable tuple of `(String, AlertViewModel)`, which can be used by the consumer to populate the matches of the regex with the String values.

We pipe this tuple Observable into a `toArray` which waits for a completed event - which happens automatically for us once every item in the array has had an alert shown.

I’ve cut a bunch of corners in these examples in order to simplify flow and make these two approaches more comparable. You can see the full example in my deeplinking helper app [here](https://github.com/rorydbain/hyrulelink).