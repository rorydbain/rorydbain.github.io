---
layout: default
title: Categories & Archive
---

{% assign rawcategories = "" %}
{% for post in site.posts %}
    {% assign ccategories = post.categories | join:'|' | append:'|' %}
    {% assign rawcategories = rawcategories | append:ccategories %}
{% endfor %}
{% assign rawcategories = rawcategories | split:'|' | sort %}

{% assign categories = "" %}
{% for category in rawcategories %}
    {% if category != "" %}
        {% if categories == "" %}
            {% assign categories = category | split:'|' %}
        {% endif %}
        {% unless categories contains category %}
            {% assign categories = categories | join:'|' | append:'|' | append:category | split:'|' %}
        {% endunless %}
    {% endif %}
{% endfor %}

{% for category in categories %}
<h4 id="{{ category | slugify }}">{{ category | capitalize }}</h4>
<ul>
    {% for post in site.posts %}
        {% if post.categories contains category %}
            <li>
            <h5>
            <a href="{{ post.url }}">
                {{ post.title }}
                <small>- {{ post.date | date_to_string }}</small>
            </a>
            </h5>
            </li>
        {% endif %}
    {% endfor %}
</ul>
{% endfor %}
