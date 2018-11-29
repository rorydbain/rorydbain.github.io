---
layout: post
title:  "Swift Compile Time Cheat Sheet"
date:   2018-03-21 21:31:00 +0000
categories: #programming #swift
---

If you are ever trying to get the compile time of a particular function down then hopefully the following examples will be of some use. For me, the best option from the following examples is to split long functions into smaller, composite functions.

To easily see the compile times of functions I created an empty project and added an `Other Swift Flags` (this can be found inside `$Your Project` -> `Build Settings` -> `Swift Compiler - Custom Flags`) of `-Xfronted -warn-long-function-bodies=1`. Doing this means Xcode will warn you everytime that you build if any function in your project took longer than 1 millisecond to type check.

Please note that these examples are just that - examples. Your mileage may vary and I would recommend not to take these as must-dos. In most cases, it makes more sense to write code that is clear and understandable - not code that compiles quickly but is confusing to yourself and others. 

### String

{% highlight swift %}
// Option A - 30ms
let xText = "x"
let _ = x.appending(" y") 

// Option B - 45ms
let yText = "y"
let _ = "x \(otherString)"

// Option C - <1ms
let xText: String = "x"
let _ = x.appending(" y")

// Option D - 1ms
let yText: String = "y"
let _ = "x \(yText)"
{% endhighlight %}

As you might expect, if you explicitly tell the compiler what type the values are, then you have significantly faster compile times. **Option C** was the only function body that did not prompt a warning for compile time being >= 1ms. **Option D** only took 1ms though so the difference is negligible.


### Optional Unwrapping

{% highlight swift %}
let item: String?

// Option A - <1ms
let _ = item ?? "some other string"

// Option B - <1ms
guard let _ = item else { return }

{% endhighlight %}

I had often suspected `??` to be slower to type check than a **guard** or **if let** function but in this short example there appears to be no significant difference.


### Mapping

{% highlight swift %}

let x = ["5", "101", "a", "awe"]

// Option A - 5ms
let _ = x.map {
            $0.uppercased()
        }

// Option B - <1ms
let _ = x.map { text in
            return text.uppercased()
        }

// Option C - <1ms
let _ = x.map { (text: String) -> String in
            return text.uppercased()
        }

{% endhighlight %}

Interestingly, simply naming your arguments significantly reduces compile-time - even if you don't explicitly type the named arguments.

### Custom Subscripts

A nice feature of Swift is its ability to add custom subscripts. The most common one I've seen used is the **safe** operator to safely access array values.

{% highlight swift %}

extension Collection {
    
    subscript (safe index: Indices.Iterator.Element) -> Iterator.Element? {
        guard indices.contains(index) else { return nil }
        return self[index]
    }
    
}

{% endhighlight %}


{% highlight swift %}

let x = ["5", "101", "a", "awe"]

// Option A - 50ms
let _ = x[safe: 2]

// Option B - 7ms
let value: String?
if x.indices.contains(2) {
    value = x[2]
} else {
    value = nil
}

// Option C - <1ms
guard x.indices.contains(2) else { return }
let _ = x[2]

{% endhighlight %}

The subscript option is clearly the cleanest implementation, but annoyingly it also takes the longest to compile by a good amount.

### Splitting Up Long functions

For this example, I've taken some sample UITableViewCell code and have two options. One option has all the setup in one function. The other option has three functions, one function does half the setup, another the other half and the main function calls the other two. The time I've recorded is the total time for both options.

{% highlight swift %}

// Option A - 17ms
func longFunctionAllInOne() {
    selectionStyle = .none
    layer.cornerRadius = 4
    clipsToBounds = true
    
    contentView.clipsToBounds = true
    contentView.layer.cornerRadius = 4
    contentView.backgroundColor = .gray
    contentView.addSubview(rightAccessoryImageView)
    contentView.addSubview(brandImageView)
    contentView.addSubview(labelStack)
    
    rightAccessoryImageView.image = UIImage(named: "")
    rightAccessoryImageView.transform = CGAffineTransform(rotationAngle: .pi / -2)
    rightAccessoryImageView.tintColor = .white
    
    labelStack.addArrangedSubview(enterNowLabel)
    labelStack.addArrangedSubview(nowLabel)
    labelStack.axis = .vertical
    labelStack.spacing = 2
    
    enterNowLabel.textColor = .white
    enterNowLabel.textAlignment = .right
    enterNowLabel.font = UIFont.systemFont(ofSize: 13)
    enterNowLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
    
    nowLabel.textColor = .white
    nowLabel.textAlignment = .right
    nowLabel.font = UIFont.systemFont(ofSize: 12)
    nowLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
}

// Option B (cumulative) - 2ms
func splitFunctions() {
    splitInto2_part1()
    splitInto2_part2()
}

func splitInto2_part1() {
    selectionStyle = .none
    layer.cornerRadius = 4
    clipsToBounds = true
    
    contentView.clipsToBounds = true
    contentView.layer.cornerRadius = 4
    contentView.backgroundColor = .gray
    contentView.addSubview(rightAccessoryImageView)
    contentView.addSubview(brandImageView)
    contentView.addSubview(labelStack)
    
    rightAccessoryImageView.image = UIImage(named: "")
    rightAccessoryImageView.transform = CGAffineTransform(rotationAngle: .pi / -2)
    rightAccessoryImageView.tintColor = .white
}

func splitInto2_part2() {
    labelStack.addArrangedSubview(enterNowLabel)
    labelStack.addArrangedSubview(nowLabel)
    labelStack.axis = .vertical
    labelStack.spacing = 2
    
    enterNowLabel.textColor = .white
    enterNowLabel.textAlignment = .right
    enterNowLabel.font = UIFont.systemFont(ofSize: 13)
    enterNowLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
    
    nowLabel.textColor = .white
    nowLabel.textAlignment = .right
    nowLabel.font = UIFont.systemFont(ofSize: 12)
    nowLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
}

{% endhighlight %}

This example is perhaps the most useful of all the examples on this page. It is much better for compile time if you split your functions into smaller composite functions. The best thing about this is that generally this also results in more readable code.
