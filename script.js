$(function() {
    // Overwrite the console functions
    var ocon = {};
    for (var i in console) {
        ocon[i] = console[i];
    }

    // isNaN is weird
    var isReallyNaN = function(a) {
        return isNaN(a) && "number" == typeof a
    };

    var highlight = function(txt) {
        var el = $("<code></code>").text(txt);
        hljs.highlightBlock(el[0]);
        return el;
    }

    // JSON.stringify is weird
    var repr = function(obj) {
        var r = undefined;
        try {
            r = JSON.stringify(obj, function(k, v) {
                if (v === null || v === undefined || isReallyNaN(v) || v === Infinity || v === -Infinity)
                    return "\xFFconstant:" + String(v);
                if (v instanceof RegExp)
                    return "\xFFregexp:" + v.toString();
                if (typeof v == "function")
                    return "\xFFfunction:" + v.toString();
                return v;
            }, 2);

            r = r.replace(/"\xFFconstant:(null|undefined|NaN|Infinity|-Infinity)"/g, "$1");
            r = r.replace(/"\xFFregexp:(.+)"/g, function(_, re) {
                return JSON.parse(re);
            });
            r = r.replace(/"\xFFfunction:(.+)"/g, "$1");
        } catch (e) {
            r = String(obj);
        }
        return highlight(r);
    }

    var format = function(args) {
        var s = [];
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] != "string")
                s.push(repr(args[i]));
            else
                s.push($("<span></span>").text(args[i]));
            if (i != args.length - 1)
                s.push($("<span> </span>"));
        }
        return s;
    }

    console.debug = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend($('<pre class="console debug"></pre>').append(format(arguments)));
    };
    console.log = function() {
        ocon.log.apply(console, arguments);
        $("#console").prepend($('<pre class="console log"></pre>').append(format(arguments)));
    };
    console.info = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend($('<pre class="console info"></pre>').append(format(arguments)));
    };
    console.warn = function() {
        ocon.warn.apply(console, arguments);
        $("#console").prepend($('<pre class="console warn"></pre>').append(format(arguments)));
    };
    console.error = function() {
        ocon.error.apply(console, arguments);
        $("#console").prepend($('<pre class="console error"></pre>').append(format(arguments)));
    };
    console.dir = function() {
        ocon.dir.apply(console, arguments);
        $("#console").prepend($('<pre class="console dir"></pre>').append(repr(arguments[0])));
    };

    // Add a global error handler for good measure
    window.onerror = function(message, url, lineNumber) {  
      var e = $('<pre class="console error">' + message + "</pre>");
      $('<div class="right">' + url + ":" + lineNumber + "</div>").appendTo(e);
      e.prependTo("#console");
      return false;
    }

    // Evaluate some code
    var evaluate = function(nick, code) {
        try {
            var ret = eval(code);

            // Success
            var io = $('<div class="console iopair"></div>');
            io.append($('<div class="right"></div>').text(nick));
            io.append($('<pre class="console input"></pre>').append(highlight(code)));
            io.append($('<pre class="console output"></pre>').append(repr(ret)));
            $("#console").prepend(io);
            return true;
        } catch (e) {
            // Failure
            var io = $('<div class="console iopair"></div>');
            io.append($('<div class="right"></div>').text(nick));
            io.append($('<pre class="console input"></pre>').append(highlight(code)));
            io.append($('<pre class="console output error"></pre>').text(e.message));
            $("#console").prepend(io);
            return false;
        }
    }

    // Connect to the socket
    var socket = io(window.location.href.replace(/^http/, "ws"));

    socket.on("connected", function(data) {
        socket.nick = data.nick;
        console.info("Connected as " + socket.nick + ",", data.count, "total connections");
    });
    socket.on("count", function(data) {
        console.debug(data.count + " total connections");
    });

    socket.on("connect_error", function(e) {
        console.error("Connection failed", e);
    });
    socket.on("connect_timeout", function() {
        console.error("Connection timed out.");
    });
    socket.on("reconnect", function(n) {
        console.info("Reconnected at the", n, "time");
    });
    socket.on("reconnecting", function(n) {
        console.debug("Reconnecting for the", n, "time");
    });
    socket.on("reconnect_failed", function(e) {
        console.error("Gave up on reconnecting");
    });

    socket.on("code", function(data) {
        evaluate(data.nick, data.code);
    });
    socket.on("nick", function(data) {
        if (data.success) {
            socket.nick = data.nick;
            console.info("You are now known as", data.nick);
        } else {
            console.error(data.message);
        }
    });

    socket.on("oconnect", function(data) {
        console.warn(data.nick, "connected,", data.count, "total connections");
    });
    socket.on("odisconnect", function(data) {
        console.warn(data.nick, "disconnected,", data.count, "total connections");
    });
    socket.on("onick", function(data) {
        console.info(data.oldnick, "is now known as", data.nick);
    });

    var commands = {};
    commands.help = function(args) {
        $.get("README.md", function(res) {
            console.log(res);
        });
    }

    commands.nick = function(args) {
        socket.emit("nick", {
            nick: args
        });
    }

    commands.reload = function(args) {
        window.location.reload();
    }

    // Bind keys on the textarea
    $("#input").on("keypress", function(e) {
        if (e.keyCode == 13) { // enter
            e.preventDefault();
            if (e.shiftKey) {
                $("#input")
                    .attr("rows", Number($("#input").attr("rows")) + 1)
                    .val($("#input").val() + "\n");
            } else {
                if (!socket.connected) {
                    console.error("Not connected");
                    return;
                }

                var code = $("#input").val();
                if (code.trim() == "")
                    return;
                var m = code.match(/\/\/(\w+)(?: (.+))?/);
                if (m) {
                    if (commands.hasOwnProperty(m[1])) {
                        commands[m[1]](m[2]);
                        $("#input")
                            .attr("rows", 1)
                            .val("");
                    } else {
                        console.error("Command not found");
                    }
                    return;
                }

                if (evaluate(socket.nick, code)) {
                    $("#input")
                        .attr("rows", 1)
                        .val("");
                }
                socket.emit("code", {
                    code: code
                });
            }
        }
    });

    // Show the readme
    $.get("README.md", function(res) {
        console.log(res);
    });
});
