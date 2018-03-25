---
layout: post
title: "Animating UIButton Presses In Swift"
date: 2018-03-24 21:00:00 +0000
categories: programming swift
---

Animation can vastly improve user experience in an application. I love buttons that animate and give you the feeling that you are actually pressing something. These combined with the great TapticEngine APIs ([UIFeedbackGenerator](https://developer.apple.com/documentation/uikit/uifeedbackgenerator)) can completely change the way your application feels.

Here are a couple of ways of doing button animations in Swift - both of which utilise UIButton addTarget methods.
<iframe src="https://giphy.com/embed/WxTzRZHomhAvHD8kgV" width="100%" height="100" frameBorder="0" class="giphy-embed" allowFullScreen style="pointer-events: none;"></iframe>

#### Vanilla UIKit Method
{% highlight swift %}
extension UIButton {
    
    func startAnimatingPressActions() {
        addTarget(self, action: #selector(animateDown), for: [.touchDown, .touchDragEnter])
        addTarget(self, action: #selector(animateUp), for: [.touchDragExit, .touchCancel, .touchUpInside, .touchUpOutside])
    }
    
    @objc private func animateDown(sender: UIButton) {
        animate(sender, transform: CGAffineTransform.identity.scaledBy(x: 0.95, y: 0.95))
    }
    
    @objc private func animateUp(sender: UIButton) {
        animate(sender, transform: .identity)
    }
    
    private func animate(_ button: UIButton, transform: CGAffineTransform) {
        UIView.animate(withDuration: 0.4,
                       delay: 0,
                       usingSpringWithDamping: 0.5,
                       initialSpringVelocity: 3,
                       options: [.curveEaseInOut],
                       animations: {
                        button.transform = transform
            }, completion: nil)
    }
    
}
{% endhighlight %}

If you are not using RxSwift or RxCocoa, this method should work just as well. The only downside is that you once a button becomes animatable, you have no way of making it un-animatable.

#### RxSwift + RxCocoa
This is my preferred method of making generic animations. The benefit of using RxSwift is that you start and stop animating button presses - should you wish to - simply by disposing the DisposeBag that you pass in. It also avoids you having to @objc expose your control event methods.

{% highlight swift %}
import RxSwift
import RxCocoa

extension UIButton {
    
    func animateWhenPressed(disposeBag: DisposeBag) {
        let pressDownTransform = rx.controlEvent([.touchDown, .touchDragEnter])
            .map({ CGAffineTransform.identity.scaledBy(x: 0.95, y: 0.95) })
        
        let pressUpTransform = rx.controlEvent([.touchDragExit, .touchCancel, .touchUpInside, .touchUpOutside])
            .map({ CGAffineTransform.identity })
        
        Observable.merge(pressDownTransform, pressUpTransform)
            .distinctUntilChanged()
            .subscribe(onNext: animate(_:))
            .disposed(by: disposeBag)
    }
    
    private func animate(_ transform: CGAffineTransform) {
        UIView.animate(withDuration: 0.4,
                       delay: 0,
                       usingSpringWithDamping: 0.5,
                       initialSpringVelocity: 3,
                       options: [.curveEaseInOut],
                       animations: {
                        self.transform = transform
            }, completion: nil)
    }
    
}
{% endhighlight %}

This bit of Rx revolves around mapping button events to an animation state. For touch-down or touch-drag-enter events, we want to animate the press down action of the button, this 'pressed' state is represented by `CGAffineTransform.identity.scaledBy(x: 0.95, y: 0.95)`. For all other touch events we want to animate back to the `identity` (the default) transform. For more info on how transforms work, check out [this article](https://www.hackingwithswift.com/read/15/4/transform-cgaffinetransform) by HackingWithSwift. These transform mappings are both merged and subscribed to the animate transform function which simply calls the animateTransform function whenever a new event is received.
