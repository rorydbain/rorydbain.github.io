---
layout: post
title:  "Animating UICollectionView or UITableView Cell Touches"
date:   2018-03-24 22:00:00 +0000
categories: programming swift
---

Following on from my previous post about the animation of UIButtons, I wanted to look at animating UITableView or UICollectionView cell touches. This effect is used in the AppStore on the Today page alongside a great transition delegate for opening and closing articles. 

I'm fairly happy with how this implementation works but will need to some more testing on a device to finalise the 'feel'. Also, I would not be surprised if there is a simpler way of doing this. This here has been my first stab at it, and if I come up with something better I will be sure to post an update.

<iframe src="https://giphy.com/embed/5n25DR1Y7e9Xtdk9iY" width="100%" height="500" frameBorder="0" class="giphy-embed" allowFullScreen style="pointer-events: none;"></iframe>

To create this effect I used a UILongPressGestureRecognizer. 

{% highlight swift %}
let longPressRecognizer = UILongPressGestureRecognizer(target: self, action: #selector(didTapLongPress))
longPressRecognizer.minimumPressDuration = 0.05
longPressRecognizer.cancelsTouchesInView = false
longPressRecognizer.delegate = self
collectionView.addGestureRecognizer(longPressRecognizer)
{% endhighlight %}

We then need to conform to UIGestureRecognizerDelegate and implement the following method. If you have other gesture recognizers for this delegate then you will likely need more logic here, but for this simple example we are just going to return true all the time.

{% highlight swift %}
func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
    return true
}
{% endhighlight %}

Now for handling that gesture recognizer. 

{% highlight swift %}
@objc func didTapLongPress(sender: UILongPressGestureRecognizer) {
    let point = sender.location(in: collectionView)
    let indexPath = collectionView.indexPathForItem(at: point)
        
    if sender.state == .began, let indexPath = indexPath, let cell = collectionView.cellForItem(at: indexPath) {
        // Initial press down, animate inward, keep track of the currently pressed index path
            
        animate(cell, to: pressedDownTransform)
        self.currentIndexPath = indexPath
    } else if sender.state == .changed {
        // Touch moved
        // If the touch moved outwidth the current cell, then animate the current cell back up
        // Otherwise, animate down again
        
        if indexPath != self.currentIndexPath, let currentIndexPath = self.currentIndexPath, let cell = collectionView.cellForItem(at: currentIndexPath) {
            if cell.transform != .identity {
                animate(cell, to: .identity)
            }
        } else if indexPath == self.currentIndexPath, let indexPath = indexPath, let cell = collectionView.cellForItem(at: indexPath) {
            if cell.transform != pressedDownTransform {
                animate(cell, to: pressedDownTransform)
            }
        }
    } else if let currentIndexPath = currentIndexPath, let cell = collectionView.cellForItem(at: currentIndexPath) {
        // Touch ended/cancelled, revert the cell to identity
        
        animate(cell, to: .identity)
        self.currentIndexPath = nil
    }
}
{% endhighlight %}

Here, I am handling three different 'states' for the gesture recognizer. If we a touch began, then so long as that touch was on a cell, we animate the cell. If a touch moved outside a cell, we animate it back to normal, if it move back inside the cell, we animate to pressed again. Finally, if the touch ends or is cancelled, then we animate back to normal.

You might notice as well a couple of new variables here being used.
{% highlight swift %}
var currentIndexPath: IndexPath?
let pressedDownTransform =  CGAffineTransform.identity.scaledBy(x: 0.98, y: 0.98)
{% endhighlight %}
'currentIndexPath' is just a reference to the index path of the cell that was pressed down. The transform is being stored as an instance variable simply to avoid redoing the scale everytime the gesture recognizer is called.

Now the only missing piece is the animation function. This is very simple and acts much like the one I used in my animating UIButton post.

{% highlight swift %}
private func animate(_ cell: UICollectionViewCell, to transform: CGAffineTransform) {
    UIView.animate(withDuration: 0.4,
                    delay: 0,
                    usingSpringWithDamping: 0.4,
                    initialSpringVelocity: 3,
                    options: [.curveEaseInOut],
                    animations: {
                    cell.transform = transform
        }, completion: nil)
}
{% endhighlight %}
