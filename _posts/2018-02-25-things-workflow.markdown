---
layout: post
title:  "Things 3 + Workflow"
date:   2018-02-25 20:29:04 +0000
categories: workflow things3
---
I started using [Things](https://culturedcode.com/things/) as my to-do list on iOS back in December and it has become one of my favourite apps to use. The latest version (3.4) added powerful deeplinking that allows you to create shortcuts and automate tasks within the app. For example, you can open the following URL on your Mac or iOS device to go straight to the today list - [`things:///show?id=today`](things:///show?id=today). 


These deeplinks can perform complex generation of tasks that would be cumbersome to do manually. Inspired by a [MacStories post](https://www.macstories.net/stories/things-automation/) I decided to use the app Workflow to automate my timers for making bread. A good bread doesn't take a lot of hands on time to make, but it does require attention every few hours for a day (or more). Different flours with different rising agents can have very different schedules and I was keen to find an easy way to keep track of this without always having to refer to a book.

Workflow is an iOS app in which you write miniature programs to perform whatever tasks you like - you can read all about it on [Macstories](https://www.macstories.net). The workflow I created gets the current time and works out the date and time of each step in the chosen recipe. These strings of date and time are then injected into a JSON body that I created using [Things 3's Swift developer tool](https://github.com/culturedcode/ThingsJSONCoder). Here's a trimmed down copy of this.

{% highlight json %}
[
  {
    "type": "project",
    "attributes": {
      "title": "Saturday White Bread",
      "notes": "Created Thursday 23/02",
      "items": [
        {
          "type": "to-do",
          "attributes": {
            "title": "Autolyse",
            "when": "2018-02-23@15:20",
            "checklist-items": [
              {
                "type": "checklist-item",
                "attributes": {
                  "title": "500 grams flour"
                }
              },
              {
                "type": "checklist-item",
                "attributes": {
                  "title": "360 grams water. 35°C"
                }
              }
            ]
          }
        }
      ]
    }
  }
]
{% endhighlight %}

The `when` attribute of the Autolyse step in this case would be swapped out with a calculated variable in Workflow. I created two workflows to manage the whole action, one workflow takes an input of minutes, adds those minutes to the current datetime, and outputs a string in the `YYYY-MM-dd@hh:mm` format. The second - and main - workflow will continuously call the previous workflow with the minutes required for each step of the recipe. It puts the resulting datetime strings into a constant json body; uses a regular expression to remove the minify the json; and finally url encodes the resulting string. This is then opened in Things and the project with to-do items with reminders are created.

A final adjustment I added was the ability to preview the times for the respective recipe without having to create the todo list. This took an `if-else` block in the main workflow that gives the user options of whether to preview the times or do make the todo list. Doing this I can check if I have time to make a specific bread from my lockscreen or even my watch.
![Workflow from lockscreen]({{ "assets/workflow-output.jpeg" | absolute_url }})


You can find the full workflow [here](https://workflow.is/workflows/8d663d101e474462b75d2cf7ac100c0f) and watch the workflow in action below.


<iframe src="https://giphy.com/embed/830QciNGxX1e8DoSrt" width="100%" height="480" frameBorder="0" class="giphy-embed" allowFullScreen style="pointer-events: none;"></iframe>