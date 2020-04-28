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
    PERIOD_FIGHT: 'fight',
    PERIOD_IDLE: 'idle',
    BOXER_ONE: 'blue',
    BOXER_TWO: 'red',
    lastBoxerHit: '',
    blockedInSequence: 0,
    matchTimeFromStart: -5, // Seconds from the beginning of the match, we give 5 seconds to "prepare" boxers before the first period
    intervalForAddingFightTime: null,
    allowedBoxerMoves: {},
    roundSettings: {
        pauseBeforeMatch: 5, // Seconds
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
                            animationFrames.push(directoryPathForBoxerMoves + '/' + moveFrame);
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
function chooseNextRandomMoves() {
    // Choose who will hit next
    const whoWillHit = [boxingMatchRuleBook.BOXER_ONE, boxingMatchRuleBook.BOXER_TWO][Math.round(Math.random())]

    // Will the boxer have the ability to block the hit
    const willOpponentBlock = decideWillOpponentBlock(whoWillHit);

    // Save it for the next hit
    boxingMatchRuleBook.lastBoxerHit = whoWillHit;

    let returningObject = {};
    returningObject[whoWillHit] = 'hits'; // Hit animation
    returningObject[whoWillHit === boxingMatchRuleBook.BOXER_ONE ? boxingMatchRuleBook.BOXER_TWO : boxingMatchRuleBook.BOXER_ONE] = willOpponentBlock ? 'block' : 'break'; // Block/blood animation - TODO use break frames for now, later on need to draw blood like after a good strong hit, to make it more interesting to watch through all rounds

    return returningObject;
}

// Choose the next random hit
function getIdleMove() {
    let returningObject = {};
    returningObject[boxingMatchRuleBook.BOXER_ONE] = 'idle';
    returningObject[boxingMatchRuleBook.BOXER_TWO] = 'idle';

    return returningObject;
}

// Decide whether the next hit will be blocked by the opponent
// Change of blocking the first hit in a sequence is pretty high, getting lower with every next hit. No one can block all hits forever. This is true only if the same boxer has blocks in a sequence
function decideWillOpponentBlock(whoWillHit) {
    let chanceToBlock = 1;

    // For every blocked hit previously - we decrease the change for the next successful block, only if the same opponent hits
    if (whoWillHit === boxingMatchRuleBook.lastBoxerHit) {
        // Increase blocked hits in a row
        boxingMatchRuleBook.blockedInSequence++;

        // Decrease by 25% change for every next block
        chanceToBlock -= (boxingMatchRuleBook.blockedInSequence * 0.25);
    } else {
        // Reset the sequence for the next boxer
        boxingMatchRuleBook.blockedInSequence = 0;
    }

    // Approx.
    return Math.random() < chanceToBlock;
}

function getCurrentMatchPeriod() {
    // If current time is in the middle of any fight period - boxers should show some moves
    let iPeriod = 0;
    let periodTimeStart;
    let periodTimeEnd;
    let pauseShift;

    for (; iPeriod < boxingMatchRuleBook.roundSettings.totalRoundInOneFight; ++iPeriod) {
        // Calculate the start and the end for each period
        periodTimeStart = iPeriod * boxingMatchRuleBook.roundSettings.roundTimeout;
        periodTimeEnd = (iPeriod + 1) * boxingMatchRuleBook.roundSettings.roundTimeout;

        // Add the idle period between rounds
        pauseShift = iPeriod * boxingMatchRuleBook.roundSettings.idlePauseBetweenRounds;

        // Add idle time to our times between
        periodTimeStart += pauseShift;
        periodTimeEnd += pauseShift;

        // Return the fight constant if it is a time to show some hits
        if (boxingMatchRuleBook.matchTimeFromStart >= periodTimeStart && boxingMatchRuleBook.matchTimeFromStart <= periodTimeEnd) {
            return boxingMatchRuleBook.PERIOD_FIGHT;
        }
    }

    // In all other cases - boxers rest
    return boxingMatchRuleBook.PERIOD_IDLE;
}

function getMoveAnimationFrames(moves) {
    let boxerOneFrames;
    let boxerTwoFrames;

    // To get the random hit a boxer will do next
    const randomProperty = function (obj) {
        const keys = Object.keys(obj);
        console.log('keys: ' + keys);
        return obj[keys[ keys.length * Math.random() << 0]];
    };

    // We could use a for;in loop here for all boxer in moves, but we have only two, let's use usual copy-paste

    // Set the actual frames for the boxer 1
    switch (moves[boxingMatchRuleBook.BOXER_ONE]) {
        case 'hits': {
            boxerOneFrames = randomProperty(boxingMatchRuleBook.allowedBoxerMoves[boxingMatchRuleBook.BOXER_ONE]['hits']);

            break;
        }
        default: {
            // Get whatever is in the selected object by name
            boxerOneFrames = boxingMatchRuleBook.allowedBoxerMoves[boxingMatchRuleBook.BOXER_ONE][moves[boxingMatchRuleBook.BOXER_ONE]];
        }
    }

    // And for the boer 2
    switch (moves[boxingMatchRuleBook.BOXER_TWO]) {
        case 'hits': {
            boxerTwoFrames = randomProperty(boxingMatchRuleBook.allowedBoxerMoves[boxingMatchRuleBook.BOXER_TWO]['hits']);

            break;
        }
        default: {
            // Get whatever is in the selected object by name
            boxerTwoFrames = boxingMatchRuleBook.allowedBoxerMoves[boxingMatchRuleBook.BOXER_TWO][moves[boxingMatchRuleBook.BOXER_TWO]];
        }
    }


    let returningObject = {};
    returningObject[boxingMatchRuleBook.BOXER_ONE] = boxerOneFrames;
    returningObject[boxingMatchRuleBook.BOXER_TWO] = boxerTwoFrames;

    return returningObject;
}

// Trigger the hit animation
function playNextAnimation() {
    // We decide do boxers fight now or rest
    const currentMatchPeriod = getCurrentMatchPeriod();

    let nextMoves;

    if (currentMatchPeriod === boxingMatchRuleBook.PERIOD_FIGHT) {
        nextMoves = chooseNextRandomMoves();
    } else {
        // Separately we set only an idle move, to make it easy to choose a hit moves
        nextMoves = getIdleMove();
    }

    const nextMovesAnimationFrames = getMoveAnimationFrames(nextMoves);

    // TODO if match is over - show the winner with most points
    // TODO show results as a counter table in frontend, points for hitting without a block
    // TODO after preparing all that - go to Pixi and draw actual animation frames

    const sendToFrontend = {
        'moveAnimationFrames': nextMovesAnimationFrames, // Animations to play
        'period': currentMatchPeriod, // Current period: start, fighting, idle, over
        'points': { // Boxer points, +3 for not blocked hit, +1 for blocked.
            'blue' : 0,
            'red' : 0
        },
        'timeFromFightStart': boxingMatchRuleBook.matchTimeFromStart
    };

    // console.log('Sending: ' + sendToFrontend);
    io.emit('playNextAnimation', sendToFrontend);
}

// We could send all mass of all moves and combination to frontend and send periodically only the command to play... But we do not care for it in our example, so all calculation are done in the backend and we will send a full animation frames to play. This is also good if something changes while the match goes and we do not to refresh the frontend.
function initTheMatch() {
    // We do not use promises here, so we have to make sure we reset interval object to clear the match
    console.log('Watcher is connected, start the match over again');
    boxingMatchRuleBook.matchTimeFromStart = -5;

    boxingMatchRuleBook.intervalForAddingFightTime = setInterval(function() {
        boxingMatchRuleBook.matchTimeFromStart++
    }, 1000);

    // Start the match, let's it rumble
    (function loop() {
        // Random time from 0.5 seconds to 3 seconds. Because our boxers are not robot and should hit with random delay
        let rand = Math.round(Math.random() * 2500) + 500;
        setTimeout(function() {
            playNextAnimation();
            loop();
        }, rand);
    }());
}

io.on('connection', (socket) => {
    initTheMatch();

    // Make sure we reset the interval object when the watcher disconnects, gives nothing to our watcher but keeps memory low for the server
    socket.on('disconnect', () => {
        console.log('Watcher is disconnected, stop the match');
  });
});

http.listen(4208, () => {
  console.log('listening on *:4208');

    // Initiate all settings
    generateListOfAvailableMoves();
});