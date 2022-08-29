---
title: OGPS Corrector
summary: System for correcting the position of a participant in orienteering competitions using the Kalman filter on Kotlin
tags:
  - School
date: '2021-01-01T00:00:00Z'

# Optional external URL for project (replaces project detail page).
external_link: ''

image:
  caption: Demo
  focal_point: Smart

links:
url_code: ''
url_pdf: ''
url_slides: ''
url_video: ''

# Slides (optional).
#   Associate this project with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides = "example-slides"` references `content/slides/example-slides.md`.
#   Otherwise, set `slides = ""`.
slides: ""
---

## What is this
OGPS corrector is a research project completed at the *Academic lyceum "Physical-Technical High School" named after Zh. I. Alfyorov*. Together with my classmate, Mark Ipatov, during a year-long research internship at O-GPS Center we have developed a system for correcting the path of an orienteering sportsman.

## Abstract

Many sports (for example, sailing, multi-racing, various marathons and orienteering) do not allow spectators to constantly watch the athletes.
To increase entertainment and control, trackers are used, the data from which is shown to viewers in real time.
However, when conducting such online broadcasts, the organizers face the problem of inaccurate display of the position of the athlete.
This can make it difficult for viewers to follow the dynamics of the event.

The goal of our work is to create a correction system that will correctly display the location of the athlete using a specific model for a particular sport. Our work is devoted to methods of correction for orienteering.

To achieve the goal, we implemented and compared several correction methods: naive pulling the athlete to the road, Kalman filter, hybrid options.

As a result, one of our hybrid options turned out to be 36% more accurate than the naive one. However, further improvement of this correction algorithm is possible.
