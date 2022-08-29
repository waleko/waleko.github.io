---
title: Wikirace
summary: Online game about traversing links from one wikipedia page to another
tags:
  - School
  - Personal
  - GameDev
date: '2021-12-29T00:00:00Z'

# Optional external URL for project (replaces project detail page).
external_link: ''

image:
  caption: Demo
  focal_point: Smart

links:
  - icon: gamepad
    icon_pack: fas
    name: Play now
    url: https://wikirace.wlko.me/
  - icon: github
    icon_pack: fab
    name: GitHub
    url: https://github.com/waleko/wiki-race
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

## What is Wikirace

Wikirace is a single-/multiplayer game about traversing links from one wikipedia page to another.

Players are given two wikipedia page titles. Their goal is to make their way from the one to the other by only clicking
links on the wikipedia page they are on. The faster you get to the goal page, the more points you get! 
You can read more about rules [here](https://en.wikipedia.org/wiki/Wikipedia:Wiki_Game).

## Features
* Both singleplayer and multiplayer supported
* Automatic round generation
* Persistence of state after page refresh 
* Asynchronous websockets
* Postgresql and Redis databases
* Automatic deploy and CI/CD

## Goals of this project
This website is a first year educational project for <a class="mylink" href="https://spb.hse.ru/en/ba/appmath/">AMI at HSE SPb</a>.
Therefore it's main purpose is familiarizing myself with various technologies.

## Work of other people used
'Circle Icons' by Nick Roach provided under [GPL v3.0](https://www.gnu.org/licenses/gpl-3.0.html).

## License
This project is [MIT](./LICENSE) licensed.
