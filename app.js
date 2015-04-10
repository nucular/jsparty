
// node app.js

var socketio = require("socket.io");
var http = require("http");
var express = require("express");

var app = express();
app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
var io = socketio(server);

io.on("connection", function(socket) {
    console.log("[connect] " + socket.id);

    socket.on("event", function(data) {
        console.log("[event] " + socket.id + ": " + data);
        socket.broadcast.emit(data);
    });
    socket.on("disconnect", function() {
        console.log("[disconnect] " + socket.id);
    });
});

var port = Number(process.env.PORT || 5000);
server.listen(port, function() {
    console.log("Listening on port " + port);
});
