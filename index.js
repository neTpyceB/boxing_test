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

            fs.readdir(directoryPathForBoxer, function (err, moves) {
                moves.forEach(function (oneMove) {
                    // Adding empty move bag
                    boxingMatchRuleBook.allowedBoxerMoves[boxer]['hits'] = {}

                    // TODO scan for animationFrames
                    let animationFrames = {}
                    // TODO is oneMove with L_/R_ or own name
                    let isAllowedHit = false;
                    let directoryPathForBoxerMoves = __dirname + '/public/source/boxers_anim/' + boxer + '/'+ oneMove;

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
function sendNextCommand(_params) {
    // TODO set random Interval, from 0.5 to 3 seconds
    // TODO set idle animation for first 3 seconds before starting the match, show timer in frontend
    // TODO send next animation to be played
    // TODO if round is going - send hit command and possible block command
    // TODO if pause between rounds - send idle command
    // TODO if match is over - show the winner. Winner counted who hot most without blocked
    // TODO show results as a counter table in frontend, points for hitting without a block
    // TODO after preparing all that - go to Pixi and draw actual animation frames

    console.log('Sending ' + _params);
    io.emit('sendNextCommand', _params);
}

function initTheMatch() {
    console.log(boxingMatchRuleBook.allowedBoxerMoves);

    // We do not use promises here, so we have to make sure we reset interval object because it is JS and we may have multiple interval objects living there on the server
    console.log('Watcher is connected, start the match over again');
    clearInterval(boxingMatchRuleBook.intervalForHitting);

    // Start the match, let's it rumble
    boxingMatchRuleBook.intervalForHitting = setInterval(() => {
        sendNextCommand('New hit ' + Date.now());
    }, 1000);
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