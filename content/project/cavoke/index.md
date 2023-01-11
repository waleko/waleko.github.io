---
title: Cavoke
summary: A Platform for creating and hosting multiplayer turn-based board games.
tags:
  - School
  - GameDev
date: '2022-07-01T00:00:00Z'

# Optional external URL for project (replaces project detail page).
external_link: ''

image:
  caption: Demo
  focal_point: Smart

links:
  - icon: earth-europe
    icon_pack: fas
    name: Homepage
    url: https://cavoke.wlko.me
  - icon: github
    icon_pack: fab
    name: GitHub
    url: https://github.com/cavoke-project/cavoke
  
url_code: ''
url_pdf: ''
url_slides: 'Cavoke.pdf'
url_video: ''

# Slides (optional).
#   Associate this project with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides = "example-slides"` references `content/slides/example-slides.md`.
#   Otherwise, set `slides = ""`.
slides: ""
---


## Overview

### Problem formulation

We believe that developing a desktop multiplayer game is always a great adventure that has many wonderful opportunities
to learn something new along the way.
However, in our opinion this journey, is often riddled with unnecessary challenges of implementing mechanisms that are
common for many games. This includes:

- Developing a **client application** with many UI components for game creation process
- **Networking**, which in itself includes
  - **Synchronizing the game state** among clients
  - Handling network issues on client's side
  - SSL and Security
- **Game state persistence**
- **Game move validation**
- **Role choosing** (e.g. White/Black in Chess)
- Managing **game sessions** and **shareable invites** for friends to play with you
- **Game and User statistics** (win rate, total time spent, etc.)
- User **Authentication and Authorization**
- Game versioning
- Hosting server logic and scalability

To make these obstacles easier to avoid, we developed a framework for developing multiplayer turn-based board games
that comes with built-in solutions to solve all the above-mentioned problems.

### Our solution

We have developed a solution that works for many board games. Your board game can work with cavoke if:

| Requirement              | Description                                                                                                                                                                                                                                                 |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ✅ **Is a board game**    | Has a **simple 2D interface**. Game interface must be implementable using QML.                                                                                                                                                                              |
| ✅ **Is based on moves**  | All changes during the game are based on the **moves** and **updates** that are representable as a string.                                                                                                                                                  |
| ✅ **No race conditions** | If multiple players are eligible to move at the given moment, there is no guarantee that the first one to move will be recorded as such. However, there is **a guarantee that the resulting game state is achieved via a valid subsequence of game moves**. |

#### Developers side

Our platform provides an easy way for developers to create a desktop game. A developer should provide only two
components:

- **Server logic component** that verifies one's move correctness and updates the game state
- **Client game component**. A [QML](https://doc.qt.io/qt-6/qmlapplications.html) application that communicates with the
  main Cavoke Client application and sends player's moves through this gateway. It also receives updates from other
  players' moves to update its user interface.

You can read more about creating your own cavoke game on
our [Cavoke Game Template](https://github.com/cavoke-project/cavoke-game-template) GitHub page that has been made to
flatten the learning curve.

#### Players side
Furthermore, we provide many features in our cavoke client for the users. These include:
- **Cross-platform**: Available on Windows, macOS and Linux
- **User Authentication** using Email-Password or SSO via Google or GitHub
- **Catalog of available cavoke games**
- **Rooms** with shareable invites for your friends, so you can play multiple games without the need to change the app
- **User's statistics** for every game
- **Developer mode** to test QML components locally

![Demo](https://raw.githubusercontent.com/cavoke-project/cavoke/develop/.github/assets/cavoke-demo.gif)

## How To Use

Please see the instructions for how to clone and build server and client components in its subdirectories.

- [Server](./server)
- [Client](./client)

## Download

You can [download](https://github.com/cavoke-project/cavoke/releases/) the latest installable version of Cavoke Client
for Windows, macOS and Linux.

## Credits

This software uses the following open source projects:

- [Qt](https://www.qt.io/)
- [Drogon](https://github.com/drogonframework/drogon)
- [Circle Icons](https://www.iconfinder.com/iconsets/circle-icons-1) by Nick Roach
- [Boost](https://www.boost.org/)
- [KArchive](https://github.com/KDE/karchive)
- [KDE Craft](https://github.com/KDE/Craft)
- [ECM](https://github.com/KDE/extra-cmake-modules)
- [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
- [qtkeychain](https://github.com/frankosterfeld/qtkeychain)
- [nlohmann/json](https://github.com/nlohmann/json)
- [Quassel](https://github.com/quassel/quassel)

Credit to [Mudlet](https://github.com/Mudlet/Mudlet) and [Markdownify](https://github.com/amitmerchant1990/electron-markdownify) for the README inspiration.

## License

[MIT](https://github.com/cavoke-project/cavoke/blob/master/LICENSE)

---

> [@MarkTheHopeful](https://github.com//MarkTheHopeful) &nbsp;&middot;&nbsp;
> [@waleko](https://github.com/waleko) &nbsp;&middot;&nbsp;
> [@petrtsv](https://github.com/petrtsv) 
