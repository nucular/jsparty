$(function() {
    // Overwrite the console functions
    var ocon = {};
    for (var i in console) {
        ocon[i] = console[i];
    }

    var format = function(args) {
        var s = "";
        for (var i = 0; i < args.length; i++) {
            if (typeof s != "string")
                s += JSON.stringify(args[i]);
            else
                s += args[i];
            if (i != args.length - 1)
                s += " ";
        }
        return s;
    }

    console.debug = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend('<div class="console debug">' + format(arguments) + "</div>");
    };
    console.log = function() {
        ocon.log.apply(console, arguments);
        $("#console").prepend('<div class="console log">' + format(arguments) + "</div>");
    };
    console.info = function() {
        ocon.debug.apply(console, arguments);
        $("#console").prepend('<div class="console info">' + format(arguments) + "</div>");
    };
    console.warn = function() {
        ocon.warn.apply(console, arguments);
        $("#console").prepend('<div class="console warn">' + format(arguments) + "</div>");
    };
    console.error = function() {
        ocon.error.apply(console, arguments);
        $("#console").prepend('<div class="console error">' + format(arguments) + "</div>");
    };
    console.dir = function() {
        ocon.error.apply(console, arguments);
        $("#console").prepend('<div class="console dir">' + JSON.stringify(arguments) + "</div>");
    };

    // Add a global error handler for good measure
    window.onerror = function(message, url, lineNumber) {  
      var e = $('<div class="console error">' + message + "</div>");
      $('<div class="right">' + url + ":" + lineNumber + "</div>").appendTo(e);
      e.prependTo("#console");
      return false;
    }

    // Connect to the socket
    var socket = io(window.location.href.replace(/https?/, "ws"));
    socket.on("connect", function() {
        console.info("Connected.");
    });
    socket.on("connect_error", function(e) {
        console.error("Connection Error: " + e.message);
    });
    socket.on("connect_timeout", function() {
        console.error("Connection timed out.");
    });

    // Evaluate some code
    var evaluate = function(code) {
        try {
            var ret = eval(code);

            // Success
            var io = $('<div class="console iopair"></div>');
            io.append('<div class="console input">' + code + "</div>");
            io.append('<div class="console output">' + JSON.stringify(ret) + "</div>");
            $("#console").prepend(io);
            return true;
        } catch (e) {
            // Failure
            var io = $('<div class="console iopair"></div>');
            io.append('<div class="console input">' + code + "</div>");
            io.append('<div class="console output error">' + e.message + "</div>");
            $("#console").prepend(io);
            return false;
        }
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
                var code = $("#input").val();
                if (code.trim() == "")
                    return;
                if (evaluate(code)) {
                    $("#input")
                        .attr("rows", 1)
                        .val("");
                    socket.emit(code);
                }
            }
        }
    });

    // Show the readme
    $.get("README.md", function(res) {
        console.log(res);
    });
});
