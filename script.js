(function() {
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
        $("#console").prepend('<div class="console dir">' + format(arguments) + "</div>");
    };

    // Add a global error handler for good measure
    window.onerror = function(message, url, lineNumber) {  
      var e = $('<div class="console error">' + message + "</div>");
      $('<div class="right">' + url + ":" + lineNumber + "</div>").appendTo(e);
      e.prependTo("#console");
      return false;
    }

    // Show the readme
    $.get("README.md", function(res) {
        console.log(res);
    });
})();
