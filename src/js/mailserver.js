// An SMTP server to be used in outgoing mail tests.  It is only intended for testing, in that:
//
// 1.  It does not require any authentication or authorization
// 2.  It accepts mail for all domains and recipients
// 3.  It does not actually transmit messages.
//
// You can plug in your own tests to be run on individual messages by changing the value of that.model.mailHandler
// to use your own function.
//
// Your custom function should accept two arguments:
//
// * that       = the configured mail server, including its options and the name of the last saved message file
// * connection = the connection, including the to/from details.
//
// For specific examples, look at the tests in this project.

"use strict";
var fluid      = fluid || require("infusion");
var gpii       = fluid.registerNamespace("gpii");
var namespace  = "gpii.test.mail.smtp";
var mailServer = fluid.registerNamespace(namespace);

var simplesmtp = require("simplesmtp");
var fs         = require("fs");

mailServer.defaultMailHandler = function (that, connection) {
    console.log("You have not registered a custom message handling callback, messages will not be processed further.");
    console.log("The most recent mail message was saved to '" + that.model.messageFile + "'...");
};

mailServer.handleStartData = function (that, connection){
    var timestamp = (new Date()).getTime();
    that.applier.change('messageFile', that.options.config.outputDir + "/message-" + timestamp + ".txt");
    connection.saveStream = fs.createWriteStream(that.model.messageFile);
};

mailServer.handleData = function (that, connection, chunk){
    connection.saveStream.write(chunk);
};

mailServer.handleDataReady = function( that, connection, callback){
    connection.saveStream.end();

    // Execute our payload here once the message is complete and ready for review
    if (that.model.mailHandler && typeof that.model.mailHandler === "function") {
        that.model.mailHandler(that, connection);
    }
    else {
        console.log("No mail handler is configured, all mail will be saved and ignored.");
    }

    callback(null, that.options.config.queueId);
};

mailServer.init = function (that) {
    that.simplesmtp = simplesmtp.createServer(that.options.config);

    that.simplesmtp.on("startData", that.handleStartData);
    that.simplesmtp.on("data",      that.handleData);
    that.simplesmtp.on("dataReady", that.handleDataReady);

    that.applier.change("mailHandler", that.defaultMailHandler);
};

// Convenience function to get rid of any custom mail handler and revert to the default.
mailServer.reset = function(that, callback) {
    that.applier.change("mailHandler", that.defaultMailHandler);
    if (callback) { callback(); }
};

mailServer.start = function (that, callback) {
    console.log("Starting test mail server on port " + that.options.config.port + "....");
    that.simplesmtp.listen(that.options.config.port, callback);
};

mailServer.stop = function(that, callback) {
    try {
        that.simplesmtp.end(callback);
    }
    catch (e) {
        console.log("The SMTP server thinks it was already stopped.  I don't care as long as it's no longer running.");
    }
};

fluid.defaults(namespace, {
    gradeNames: ["fluid.standardRelayComponent", "autoInit"],
    "config": {
        "SMTPBanner":           "Test Mail Server",
        "queueID":              "TESTMAIL",
        "ignoreTLS":            true,
        "disableDNSValidation": true,
        "outputDir":            "/tmp",
        "port":                 4025
    },
    "model": {
        "messageFile": null,
        "mailHandler": null
    },
    "invokers": {
        "init": {
            "funcName": namespace + ".init",
            "args": ["{that}"]
        },
        "listen": {
            "funcName": namespace + ".start",
            "args": ["{that}", "{arguments}.0"]
        },
        "start": {
            "funcName": namespace + ".start",
            "args": ["{that}", "{arguments}.0"]
        },
        "stop": {
            "funcName": namespace + ".stop",
            "args": ["{that}", "{arguments}.0"]
        },
        "defaultMailHandler": {
            "funcName": namespace + ".defaultMailHandler",
            "args": ["{that}", "{arguments}.0"]
        },
        "handleStartData": {
            "funcName": namespace + ".handleStartData",
            "args": ["{that}", "{arguments}.0"]
        },
        "handleData": {
            "funcName": namespace + ".handleData",
            "args": ["{that}", "{arguments}.0", "{arguments}.1"]
        },
        "handleDataReady": {
            "funcName": namespace + ".handleDataReady",
            "args": ["{that}", "{arguments}.0", "{arguments}.1"]
        },
        "reset": {
            "funcName": namespace + ".reset",
            "args": ["{that}", "{arguments}.0"]
        }
    },
    "listeners": {
        "onCreate": {
            "funcName": namespace + ".init",
            "args": ["{that}"]
        },
        "reset": {
            "funcName": namespace + ".reset",
            "args": ["{that}"]
        }
    },
    "events": {
        "reset": "preventable"
    }
});