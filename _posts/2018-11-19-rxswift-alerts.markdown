---
layout: post
title:  "Presenting a series of UIAlertControllers with RxSwift"
date:   2018-11-19 22:00:00 +0000
categories: programming
---
I was recently writing a helper application for work that would store a bunch of URL paths that we support as Deeplinks. The user can pick from one of these paths and will be prompted to input a value for any parameters (any part of the path that matched a specific regex). However, the app got pretty complex when having to deal with multiple capture groups in that regular expression.

The given problem was this - given an array of strings (capture groups from my regular expression), show an alert one after requesting what value the user wishes to input for that ‘key’.

Traditionally, I would have probably made some `UIAlertController`-controller that might look something like this.

```swift
protocol AlertPresenting: class {
    func present(alert: UIViewController)
}

protocol MultipleAlertControllerOutput: class {
    func didFinishDisplayingAlerts(withChoices choices: [String: AlertViewModel])
}

class MultipleAlertController {
    
    private var iterations = 0
    private var viewModels = [AlertViewModel]()
    private var results = [String: AlertViewModel]()
    private weak var alertPresenter: AlertPresenting?
    weak var output: MultipleAlertControllerOutput?
    
    func display(alerts alertViewModels: [AlertViewModel]) {
        self.iterations = 0
        self.results = [:]
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
    }
    
}
```

Now this isn’t necessarily bad, but having to keep track of or reset state can always lead to bugs - particularly in asynchronous situations. Instead I had an idea for doing this using RxSwift.

```swift
import RxSwift

protocol ViewControllerPresenting: class {
    func present(viewController: UIViewController)
}
static func populateParameters(for link: Link, presentingAlertFrom viewController: ViewControllerPresenting?) -> Observable<[RegexReplacement]> {
    let paramRegex = "\\$\\{(.*?)\\}" // e.g. /pickem/${tournamentId}
    let matches = try! NSRegularExpression(pattern: paramRegex)
        .matches(in: link.path, options: [], range: NSRange(link.path.startIndex..., in: link.path))
    
    return Observable
        .from(matches)
        .concatMap { match -> Observable<(RegexReplacement)> in
            let path = link.path
            guard
                let vc = viewController,
                let swiftRange = Range(match.range, in: path) else { return Observable.empty() }
            
            let textFieldResponse: Observable<String> = vc
                .show(textFieldAlertViewModel: .init(title: "Enter value for \(String(path[swiftRange]))", message: nil))
            return textFieldResponse
                .map { textInput in RegexReplacement(checkingResult: match, replacement: textInput) }
        }
        .toArray()
}
```

```swift
// Helper method for Rx UIAlertControllers
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
Observable.from(matches)
```
This little snippet takes an array an gives you an observable that emits each element of the array. In this example that will be an event for event match in the regular expression.

```swift
concatMap { match -> Observable<(RegexReplacement)> in
            let path = link.path
            guard
                let vc = viewController,
                let swiftRange = Range(match.range, in: path) else { return Observable.empty() }
            
            let textFieldResponse: Observable<String> = vc
                .show(textFieldAlertViewModel: .init(title: "Enter value for \(String(path[swiftRange]))", message: nil))
            return textFieldResponse
                .map { textInput in RegexReplacement(checkingResult: match, replacement: textInput) }
        }
```

Here we take the stream of matches for the regular expression and we `compactMap` an observable of the String that the user typed into a UIAlertController. The RxSwift method doing the heavy lifting is the `compactMap`. It waits for a completed event to be sent by the observable text field responses before invoking the next alert. 

The result of the `compactMap` is an Observable of `RegexReplacement` which is a struct containing the String that the user entered along with the regex match info (the range etc so that we can later replace the matches with the user input).

We pipe this RegexReplacement Observable into a `toArray` which waits for a completed event - which is called automatically when every item in the array has had an alert shown.

I’ve cut a bunch of corners in these examples in order to simplify flow and make these two approaches more comparable. You can see the full example in my deeplinking helper app [here](https://github.com/rorydbain/hyrulelink).