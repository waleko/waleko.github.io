---
title: Creating a Cavoke Game
subtitle: Hi 👋 In this quick tutorial I walkthrough how to create your first cavoke game

# Summary for listings and search engines
summary: Hi 👋 In this quick tutorial I walkthrough how to create your first cavoke game

# Link this post with a project
projects: [cavoke]

# Date published
date: '2022-08-25T00:00:00Z'

# Date updated
lastmod: '2022-08-25T00:00:00Z'

# Is this an unpublished draft?
draft: false

# Show this page in the Featured widget?
featured: true

# Featured image
# Place an image named `featured.jpg/png` in this page's folder and customize its options here.
image:
  caption: 'Image credit: [**Unsplash**](https://unsplash.com/photos/NrS53eUKgiE)'
  focal_point: ''
  placement: 2
  preview_only: false

authors:
  - admin

tags:
  - School
  - GameDev

categories:
  - Tutorials
---

## What is Cavoke

Cavoke is a platform for creating and hosting multiplayer board games. It comes with built-in solutions to solve many common-found problems associated with developing a multiplayer game.

If you are new to [Cavoke](https://cavoke.wlko.me), I would advise you to consult the documentation's [Introduction section](https://cavoke.wlko.me/_1_Introduction.html).

## Quick Start

Let's look at the cavoke development using Tic-Tac-Toe game as an example. You can freely browse our **final code [on GitHub](https://github.com/cavoke-project/tictactoe/blob/master)**.


### Client-side

First of all, let's begin with our client component. We will delegate all the checking and validating to the server side, and only receive full board state and send cell clicks. 

We will create a brand-new [QML](https://doc.qt.io/qt-6/qmlapplications.html) application:

```QML
import QtQuick 2.0

Rectangle {
  id: game
  width: display.width; height: display.height + 10
}
```

Now let's add the code for interacting with main cavoke application: 

```QML
import QtQuick 2.0

Rectangle {
    // BEGIN cavoke section
    Connections {
        target: cavoke

        function onReceiveUpdate(jsonUpdate) {
            console.log("Received: " + jsonUpdate);
            // TODO: update board
        }
    }
    // END cavoke section

    id: game

    width: display.width; height: display.height + 10
}
```

Now let's add our board image and a grid with our small icons:

```QML
import QtQuick 2.0
import "content"

Rectangle {
    // BEGIN cavoke section
    Connections {
        target: cavoke

        function onReceiveUpdate(jsonUpdate) {
            console.log("Received: " + jsonUpdate);
            // TODO: update board
        }
    }
    // END cavoke section

    id: game

    width: display.width; height: display.height + 10

    Image {
        id: boardImage
        source: "content/pics/board.png"
    }

    Column {
        id: display

        Grid {
            id: board
            width: boardImage.width; height: boardImage.height
            columns: 3

            Repeater {
                model: 9

                Rectangle { // TODO: use a custom class
                    width: board.width/3
                    height: board.height/3

                    onClicked: {
                       // TODO: send move
                    }
                }
            }
        }

        Row {
            spacing: 4
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }
}
```

Now let's finally implement the logic. For this let's create a separate `content/interactions.js` for move processing. It can look like this:

```js
function processResponse(response) {
    let res = JSON.parse(response)
    updateBoard(res["state"]);
}

function sendMove(moveString) {
    let move = {}
    move.move = "X" + moveString
    cavoke.getMoveFromQml(JSON.stringify(move))
}

function updateBoard(boardString) {
    for (let i = 0; i < 9; ++i) {
        board.children[i].state = boardString[i];
    }
}

function gameFinished(message) {
    messageDisplay.text = message
    messageDisplay.visible = true
}

function resetField() {
    for (var i = 0; i < 9; ++i)
        board.children[i].state = ""
}
```

We will also create a custom `TicTac` class for our noughts and crosses:

```QML
// FILE: content/TicTac.qml
import QtQuick 2.0

Item {
    signal clicked

    states: [
        State { name: "X"; PropertyChanges { target: image; source: "pics/x.png" } },
        State { name: "O"; PropertyChanges { target: image; source: "pics/o.png" } }
    ]

    Image {
        id: image
        anchors.centerIn: parent
    }

    MouseArea {
        anchors.fill: parent
        onClicked: parent.clicked()
    }
}
```

Finally, our main `app.qml` looks now like this:
```QML
import QtQuick 2.0
import "content"
import "content/interactions.js" as Interact

Rectangle {
    // BEGIN cavoke section
    Connections {
        target: cavoke

        function onReceiveUpdate(jsonUpdate) {
            console.log("Received: " + jsonUpdate);
            Interact.processResponse(jsonUpdate);
        }
    }
    // END cavoke section

    id: game

    width: display.width; height: display.height + 10

    Image {
        id: boardImage
        source: "content/pics/board.png"
    }

    Column {
        id: display

        Grid {
            id: board
            width: boardImage.width; height: boardImage.height
            columns: 3

            Repeater {
                model: 9

                TicTac {
                    width: board.width/3
                    height: board.height/3

                    onClicked: {
                            Interact.sendMove(String(index));
                    }
                }
            }
        }

        Row {
            spacing: 4
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }

    Text {
        id: messageDisplay
        anchors.centerIn: parent
        color: "blue"
        style: Text.Outline; styleColor: "white"
        font.pixelSize: 50; font.bold: true
        visible: false

        Timer {
            running: messageDisplay.visible
            onTriggered: {
                messageDisplay.visible = false;
                Interact.resetField();
            }
        }
    }
}
```

This is it for the client-side! You can browse the final code along with static assets [on GitHub](https://github.com/cavoke-project/tictactoe/blob/master/client).

### Server-side

As outlined in the [documentation](https://cavoke.wlko.me/GameLogicProtocol.html), we have to implement three http-methods. We will use our [template repository](https://github.com/cavoke-project/cavoke-game-template) for this.
Now we only need to implement three methods in a C++ project.

Our code is currently:
```cpp
#include "cavoke.h"

namespace cavoke {

bool validate_settings(
    const json &settings, const std::vector<int> &occupied_positions,
    const std::function<void(std::string)> &message_callback) {
  // TODO: Implement your game validation here
  return true;
}

GameState init_state(const json &settings,
                     const std::vector<int> &occupied_positions) {
  // TODO: Implement your game start here

  return GameState{false, "<INIT_STATE>", {}, {}};
}

GameState apply_move(GameMove &new_move) {
  // TODO: Implement your game move event processing here

  return GameState{false, "<GLOBAL_STATE>", {}, {}};
}
} // namespace cavoke
```

Filling this out with our state structure, we can achieve code looking something like this:

```cpp
#include <sstream>
#include "cavoke.h"

namespace cavoke {

bool validate_settings(
    const json &settings,
    const std::vector<int> &occupied_positions,
    const std::function<void(std::string)> &message_callback) {
    if (occupied_positions.size() != 2) {
        message_callback("Not enough players");
        return false;
    }
    if (!settings.contains("board_size")) {
        message_callback("No board_size property");
        return false;
    }
    if (settings["board_size"].get<int>() != 3 &&
        settings["board_size"].get<int>() != 5) {
        message_callback("Only 3 and 5 board_size values are supported");
        return false;
    }
    return true;
}

int get_board_size(const std::string &board) {
    return static_cast<int>(sqrt(static_cast<double>(board.size())));
}

char current_player(const std::string &board) {
    int xs_cnt = 0;
    int os_cnt = 0;
    for (int i = 0; i < board.size(); ++i) {
        if (board[i] == 'X') {
            xs_cnt++;
        } else if (board[i] == 'O') {
            os_cnt++;
        }
    }
    return (xs_cnt == os_cnt ? 'X' : 'O');
}

int extract_position(const std::string &move) {
    std::stringstream to_split(move);
    char action;
    to_split >> action;
    int position;
    to_split >> position;
    return position;
};

bool is_valid_move(const std::string &board, int position) {
    return position >= 0 && position < board.size() && board[position] == ' ';
}

bool is_full(const std::string &board) {
    return std::none_of(board.begin(), board.end(),
                        [](char c) { return c == ' '; });
}

int coord_to_pos(int x, int y, int board_size) {
    return x * board_size + y;
}

bool winner(const std::string &board) {
    int board_size = get_board_size(board);
    int row_to_win = (board_size == 3 ? 3 : 4);
    for (int i = 0; i < board_size; ++i) {
        for (int j = 0; j < board_size; ++j) {
            char cur = board[coord_to_pos(i, j, board_size)];
            if (cur == ' ') {
                continue;
            }
            if (i + row_to_win <= board_size) {
                bool flag = true;
                for (int k = 1; k < row_to_win; ++k) {
                    if (board[coord_to_pos(i + k, j, board_size)] != cur) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    return true;
                }
            }
            if (j + row_to_win <= board_size) {
                bool flag = true;
                for (int k = 1; k < row_to_win; ++k) {
                    if (board[coord_to_pos(i, j + k, board_size)] != cur) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    return true;
                }
            }
            if (i + row_to_win <= board_size && j + row_to_win <= board_size) {
                bool flag = true;
                for (int k = 1; k < row_to_win; ++k) {
                    if (board[coord_to_pos(i + k, j + k, board_size)] != cur) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    return true;
                }
            }
            if (i - row_to_win >= -1 && j + row_to_win <= board_size) {
                bool flag = true;
                for (int k = 1; k < row_to_win; ++k) {
                    if (board[coord_to_pos(i - k, j + k, board_size)] != cur) {
                        flag = false;
                        break;
                    }
                }
                if (flag) {
                    return true;
                }
            }
        }
    }
    return false;
}

GameState init_state(const json &settings,
                     const std::vector<int> &occupied_positions) {
    int board_size = settings["board_size"];
    std::string board(board_size * board_size, ' ');
    return GameState{false, board, {board, board}, {}};
}

GameState apply_move(GameMove &new_move) {
    std::string &board = new_move.global_state;
    char player = (new_move.player_id == 0 ? 'X' : 'O');
    if (player != current_player(board)) {
        return {false, board, {board, board}, {}};
    }
    int position = extract_position(new_move.move);
    if (!is_valid_move(board, position)) {
        return {false, board, {board, board}, {}};
    }
    board[position] = player;
    bool win = winner(board);
    bool full = is_full(board);
    std::vector<int> winners;
    if (win) {
        winners.push_back(new_move.player_id);
    }
    return {win || full, board, {board, board}, winners};
}
}  // namespace cavoke
```

We are done! You can browse the final code [on GitHub](https://github.com/cavoke-project/tictactoe/blob/master/server).

### Running it all

Now let's see how it all works together.

We create a simple cavoke json config:
```json
{
  "default_settings": {
    "board_size": 3
  },
  "description": "Paper-and-pencil game for two players who take turns marking the spaces in a three-by-three grid with X or O",
  "display_name": "Tic-tac-toe",
  "id": "tictactoe",
  "players_num": 2,
  "role_names": [
    "Crosses",
    "Noughts"
  ],
  "app_type": "LOCAL",
  "url": ""
}
```

We load the server using *local* or *remote* mode and pack the client folder into a `.zip` file.

![Demo](https://raw.githubusercontent.com/cavoke-project/cavoke/develop/.github/assets/cavoke-demo.gif)

Voilà! It all works and multiplayer-ready out of the box.

All code in this guide is available on [GitHub](https://github.com/cavoke-project/tictactoe).

[![GitHub Repo stars](https://img.shields.io/github/stars/cavoke-project/cavoke?style=social&label=Star%20Us)](https://github.com/cavoke-project/cavoke)
