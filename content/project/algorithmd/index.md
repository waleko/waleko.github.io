---
title: AlgorithmD
summary: Website for sharing code snippets
tags:
  - Personal
date: '2021-07-19T00:00:00Z'

# Optional external URL for project (replaces project detail page).
external_link: ''

image:
  caption: Demo
  focal_point: Smart

links:
  - icon: earth-europe
    icon_pack: fas
    name: Live site
    url: https://algorithmd.wlko.me/
  - icon: github
    icon_pack: fab
    name: GitHub
    url: https://github.com/waleko/algorithmd
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

## What is AlgorithmD

AlgorithmD is a website for sharing snippets of code.

It is named after Donald Knuth's "Algorithm D", that implements division of nonnegative integers ([learn more](https://skanthak.homepage.t-online.de/division.html)).

You can even see an [implementation](https://algorithmd.wlko.me/view/fb792837-c2db-4f80-a002-d0b4801991df) of Algorithm D on AlgorithmD!

## Features
* Built-in code editor that supports all major languages
* Drag-n-drop support
* Snippet tags for grouping
* Search of snippets by title, filename, tags, code or their parts
* Publicly accessible URLs
* Download and copy functionalities

## Goals of this project
The main goal of this project is educational, as countless other alternatives exist ([gist](https://gist.github.com), [pastebin](https://pastebin.com) and many others). While creating this website I got to familiarize myself with such technologies as Angular, Ktor, Google App Engine, Firebase Realtime Database, Auth0 and much more.

## Linked repositories
* Frontend: [waleko/algorithmd](https://github.com/waleko/algorithmd). Built with Angular. Hosted on Cloudflare Pages.
* Backend: [waleko/algorithmd-uploader](https://github.com/waleko/algorithmd-uploader). Written in Kotlin using Ktor. Hosted on Google App Engine.


## License
AlgorithmD is [Apache 2](./LICENSE) licensed.
