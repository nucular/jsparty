
// node app.js

var socketio = require("socket.io");
var http = require("http");
var express = require("express");

var app = express();
app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
var io = socketio(server);

var nicks = {};

io.on("connection", function(socket) {
    socket.nick = socket.id.substr(0, 5);
    console.log("[connect] " + socket.nick);

    socket.emit("connected", {
        count: io.engine.clientsCount,
        nick: socket.nick
    });

    socket.broadcast.emit("oconnect", {
        nick: socket.nick,
        count: io.engine.clientsCount
    });

    socket.on("code", function(data) {
        console.log("[code] " + socket.nick + ": " + data.code);
        data.nick = socket.nick;
        socket.broadcast.emit("code", data);
    });
    socket.on("nick", function(data) {
        console.log("[nick] " + socket.nick + ": " + data.nick);
        if (nicks.hasOwnProperty(data.nick)) {
            socket.emit("nick", {
                nick: data.nick,
                success: false,
                message: "Nickname already taken"
            });
            return;
        }
        if (data.nick.length > 10) {
            socket.emit("nick", {
                nick: data.nick,
                success: false,
                message: "Nickname too long (max. 10 characters)"
            });
            return;
        }
        if (data.nick.length < 1) {
            socket.emit("nick", {
                nick: data.nick,
                success: false,
                message: "Nickname too short (min. 1 character)"
            });
            return;
        }
        data.oldnick = socket.nick;
        socket.broadcast.emit("onick", data);

        socket.emit("nick", {
            nick: data.nick,
            success: true
        });
        socket.nick = data.nick;
        nicks[data.nick] = socket.id;
    });

    socket.on("disconnect", function() {
        console.log("[disconnect] " + socket.id);
        socket.broadcast.emit("odisconnect", {
            nick: socket.nick,
            count: io.engine.clientsCount
        });
        if (nicks.hasOwnProperty(socket.nick)) {
            delete nicks[socket.nick];
        }
    });
});

var port = Number(process.env.PORT || 5000);
server.listen(port, function() {
    console.log("Listening on port " + port);
});
