---
layout: post
title: "Animating Tab Bar Controller Taps"
date: 2018-03-25 21:00:00 +0000
categories: programming swift
#programming #swift
---

Following on from my previous animation posts ([here]({% post_url 2018-03-24-animating-uibutton %}) and [here]({% post_url 2018-03-24-animating-tables %})), this post is about animating the taps on an iOS tab bar - an effect used by Spotify in their app.  UITabBarController is an old piece of UIKit that draws its architecural design from AppKit. Configuring your tabs requires you to use UITabBarItem, you have no access to the internal UIBarButton class. Because of this, we have to use some less than ideal `valueForKey` method - however, in this case I feel this is OK as there is no crticial operation relying on it, just an animation.

<iframe src="https://giphy.com/embed/2t9uJuUDMZQPx8bhVl" width="100%" height="500" frameBorder="0" class="giphy-embed" allowFullScreen style="pointer-events: none;"></iframe>

For this effect, we also must subclass UITabBarController as we require access to the `didSelectItem` method, the only available method for `UITabBarControllerDelegate` is the `didSelectViewController` version. You could perhaps look at the tabBarItems of a UITabBarController and look at its subviews and try and relate the two, but I imagine that it is unlikely you can guarantee that they will be equally ordered.

The next best option I can think of is to roll your own version of UITabBarController where you control all the views and touch events and can do all the animation you want. But, if a subclass and short solution suits you, then read on.

{% highlight swift %}
class AnimatedTabBarController: UITabBarController {

    override func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard let barButtonView = item.value(forKey: "view") as? UIView else { return }
        
        let animationLength: TimeInterval = 0.3
        let propertyAnimator = UIViewPropertyAnimator(duration: animationLength, dampingRatio: 0.5) {
            barButtonView.transform = CGAffineTransform.identity.scaledBy(x: 0.9, y: 0.9)
        }
        propertyAnimator.addAnimations({ barButtonView.transform = .identity }, delayFactor: CGFloat(animationLength))
        propertyAnimator.startAnimation()
    }
    
}
{% endhighlight %}
