$(function() {
    // Overwrite the console functions
    var ocon = {};
    for (var i in console) {
        ocon[i] = console[i];
    }

    // Awesome thing stolen from http://stackoverflow.com/a/7220510/2405983
    var highlight = function(json) {
        if (typeof json != 'string') {
             json = JSON.stringify(json, null, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null|undefined|NaN|Infinity)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null|undefined|NaN|Infinity/.test(match)) {
                cls = 'constant';
            }
            return '<span class="highlight ' + cls + '">' + match + '</span>';
        });
    }

    // isNaN is weird
    var isReallyNaN = function(a) {
        return isNaN(a) && "number" == typeof a
    };

    // JSON.stringify is weird
    var repr = function(obj, hl) {
        var r = undefined;
        try {
            r = JSON.stringify(obj, function(k, v) {
                if (v === null || v === undefined || isReallyNaN(v) || v === Infinity || v === -Infinity)
                    return "\xFFconstant:" + String(v);
                if (v instanceof RegExp)
                    return "\xFFregexp:" + v.toString();
                return v;
            }, 2);

            r = r.replace(/"\xFFconstant:(null|undefined|NaN|Infinity|-Infinity)"/g, "$1");
            r = r.replace(/"\xFFregexp:(.+)"/g, function(_, re) {
                return JSON.parse(re);
            });
        } catch (e) {
            r = String(obj);
        }
        if (hl)
            r = highlight(r);
        return r;
    }

    var format = function(args, hl) {
        var s = "";
        for (var i = 0; i < args.length; i++) {
            if (typeof s != "string")
                s += repr(args[i], hl);
            else
                s += args[i];
            if (i != args.length - 1)
                s += " ";
        }
        return s;
    }

    console.debug = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend('<div class="console debug">' + format(arguments, true) + "</div>");
    };
    console.log = function() {
        ocon.log.apply(console, arguments);
        $("#console").prepend('<div class="console log">' + format(arguments, true) + "</div>");
    };
    console.info = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend('<div class="console info">' + format(arguments, true) + "</div>");
    };
    console.warn = function() {
        ocon.warn.apply(console, arguments);
        $("#console").prepend('<div class="console warn">' + format(arguments, true) + "</div>");
    };
    console.error = function() {
        ocon.error.apply(console, arguments);
        $("#console").prepend('<div class="console error">' + format(arguments, true) + "</div>");
    };
    console.dir = function() {
        ocon.error.apply(console, arguments);
        $("#console").prepend('<div class="console dir">' + repr(arguments, true) + "</div>");
    };

    // Add a global error handler for good measure
    window.onerror = function(message, url, lineNumber) {  
      var e = $('<div class="console error">' + message + "</div>");
      $('<div class="right">' + url + ":" + lineNumber + "</div>").appendTo(e);
      e.prependTo("#console");
      return false;
    }

    // Evaluate some code
    var evaluate = function(id, code) {
        try {
            var ret = eval(code);

            // Success
            var io = $('<div class="console iopair"></div>');
            io.append('<div class="id">' + id.substr(0, 5) + "</div>");
            io.append('<div class="console input">' + code + "</div>");
            io.append('<div class="console output">' + repr(ret, true) + "</div>");
            $("#console").prepend(io);
            return true;
        } catch (e) {
            // Failure
            var io = $('<div class="console iopair"></div>');
            io.append('<div class="id">' + id.substr(0, 5) + "</div>");
            io.append('<div class="console input">' + code + "</div>");
            io.append('<div class="console output error">' + e.message + "</div>");
            $("#console").prepend(io);
            return false;
        }
    }

    // Connect to the socket
    var socket = io(window.location.href.replace(/^http/, "ws"));

    socket.on("connect", function() {
        console.info("Connected as: " + socket.id.substr(0, 5));
    });
    socket.on("connect_error", function(e) {
        console.error("Connection Error: " + e.message);
    });
    socket.on("connect_timeout", function() {
        console.error("Connection timed out.");
    });

    socket.on("code", function(data) {
        evaluate(data.id, data.code);
    });

    socket.on("oconnect", function(data) {
        console.warn("Connected: " + data.id.substr(0, 5));
    });
    socket.on("odisconnect", function(data) {
        console.warn("Disconnected: " + data.id.substr(0, 5));
    });

    // Bind keys on the textarea
    $("#input").on("keypress", function(e) {
        if (e.keyCode == 13) { // enter
            e.preventDefault();
            if (e.shiftKey) {
                $("#input")
                    .attr("rows", Number($("#input").attr("rows")) + 1)
                    .val($("#input").val() + "\n");
            } else {
                var code = $("#input").val();
                if (code.trim() == "")
                    return;
                if (evaluate(socket.id, code)) {
                    $("#input")
                        .attr("rows", 1)
                        .val("");
                    socket.emit("code", {
                        id: socket.id,
                        code: code
                    });
                }
            }
        }
    });

    // Show the readme
    $.get("README.md", function(res) {
        console.log(res);
    });
});
