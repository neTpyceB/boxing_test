var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var express = require('express');
const fs = require('fs');

// Serve our images and style file
app.use(express.static(__dirname + '/public'));

// Only one page defined with the boxing ring
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Container for all our variables
let boxingMatchRuleBook = {
    intervalForHitting: null,
    allowedBoxerMoves: {},
    roundSettings: {
        roundTimeout: 180, // Seconds
        totalRoundInOneFight: 4,
        idlePauseBetweenRounds: 10, // Seconds
    }
};

// We generate the list of available hits
function generateListOfAvailableMoves() {
    // Scanning all available players and moves
    const mainDirectoryPath = __dirname + '/public/source/boxers_anim/';

    fs.readdir(mainDirectoryPath, function (err, boxers) {
        boxers.forEach(function (boxer) {
            // Adding a boxer
            boxingMatchRuleBook.allowedBoxerMoves[boxer] = {}

            // Adding all possible moves
            let directoryPathForBoxer = __dirname + '/public/source/boxers_anim/' + boxer;

            // Adding empty move bag
            boxingMatchRuleBook.allowedBoxerMoves[boxer]['hits'] = {}

            fs.readdir(directoryPathForBoxer, function (err, moves) {
                moves.forEach(function (oneMove) {

                    let animationFrames = [];
                    // All folders with hits have _ in it, either L_ or R_
                    let isAllowedHit = oneMove.indexOf('_') === 1;
                    let directoryPathForBoxerMoves = __dirname + '/public/source/boxers_anim/' + boxer + '/'+ oneMove;

                    fs.readdir(directoryPathForBoxerMoves, function (err, moveFrames) {
                        moveFrames.forEach(function (moveFrame) {
                            // We believe all files are pngs here and we will collect full path from parts to make it easier in case we move smth and all are sorted due to 8 frames per hit only
                            animationFrames.push(directoryPathForBoxerMoves + '/' + moveFrame + '.png');
                        });
                    });

                    if (isAllowedHit) {
                        // Add possible hit moves
                        boxingMatchRuleBook.allowedBoxerMoves[boxer]['hits'][oneMove] = animationFrames;
                    } else {
                        // And add block, idle and break in own objects
                        boxingMatchRuleBook.allowedBoxerMoves[boxer][oneMove] = animationFrames;
                    }
                });
            });
        });

        // At that moment match is ready to begin, boxers know the rules and watcher can enjoy
    });

}

// Choose the next random hit
function chooseNextRandomHit() {
    // TODO get the random red/blue and random L_.../R_...
}

// Decide whether the next hit will be blocked by the opponent
// Change of blocking the first hit in a sequence is pretty high, getting lower with every next hit. No one can block all hits forever.
function decideWillOpponentBlock() {
    // TODO random block the hit,
}

// Trigger the hit animation
function playNextAnimation(_params) {
    // TODO set idle animation for first 3 seconds before starting the match, show timer in frontend
    // TODO send next animation to be played
    // TODO if round is going - send hit command and possible block command
    // TODO if pause between rounds - send idle command
    // TODO if match is over - show the winner. Winner counted who hot most without blocked
    // TODO show results as a counter table in frontend, points for hitting without a block
    // TODO after preparing all that - go to Pixi and draw actual animation frames

    console.log('Sending ' + _params);
    io.emit('playNextAnimation', _params);
}

function initTheMatch() {
    // TODO Send allowed moves to the frontend, so we can send only command names, it will save some traffic to all connected poolings
    console.log(boxingMatchRuleBook.allowedBoxerMoves);

    // We do not use promises here, so we have to make sure we reset interval object because it is JS and we may have multiple interval objects living there on the server
    console.log('Watcher is connected, start the match over again');
    clearInterval(boxingMatchRuleBook.intervalForHitting);

    // Start the match, let's it rumble
    (function loop() {
        // Random time from 0.5 seconds to 3 seconds. Because our boxers are not robot and should hit with random delay
        let rand = Math.round(Math.random() * 2500) + 500;
        console.log(rand);
        setTimeout(function() {
            playNextAnimation('Next hit in ' + rand + ' ms.');
            loop();
        }, rand);
    }());
}

io.on('connection', (socket) => {
    initTheMatch();

    // Make sure we reset the interval object when the watcher disconnects, gives nothing to our watcher but keeps memory low for the server
    socket.on('disconnect', () => {
        console.log('Watcher is disconnected, stop the match');

        clearInterval(boxingMatchRuleBook.intervalForHitting);
  });
});

http.listen(4208, () => {
  console.log('listening on *:4208');

    // Initiate all settings
    generateListOfAvailableMoves();
});