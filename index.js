var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var express = require('express');

// Serve our images and style file
app.use(express.static(__dirname + '/public'));

// Only one page defined with the boxing ring
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Container for all our variables
var boxingDataBag = {
    intervalForHitting: null
}

// Trigger the hit animation
function doBoxingHit(_params) {
    console.log('Sending ' + _params);
    io.emit('doBoxingHit', _params);
}

io.on('connection', (socket) => {
    // We do not use promises here, so we have to make sure we reset interval object because it is JS and we may have multiple interval objects living there on the server
    console.log('Watcher is connected, start the match over again');
    clearInterval(boxingDataBag.intervalForHitting);

    boxingDataBag.intervalForHitting = setInterval(() => {
        doBoxingHit('New hit ' + Date.now());
    }, 1000);

    // Make sure we reset the interval object when the watcher disconnects, gives nothing to our watcher but keeps memory low for the server
    socket.on('disconnect', () => {
        console.log('Watcher is disconnected, stop the match');

        clearInterval(boxingDataBag.intervalForHitting);
  });
});

http.listen(4208, () => {
  console.log('listening on *:4208');
});