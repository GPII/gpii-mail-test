// A module to wire in simplesmtp to handle incoming messages.
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.test.mail.smtp.simpleSmtpServer");

var simplesmtp = require("simplesmtp");
var fs         = require("fs");

gpii.test.mail.smtp.simpleSmtpServer.handleStartData = function (that, connection) {
    var timestamp = (new Date()).getTime();
    that.options.messageFile = that.options.config.outputDir + "/message-" + timestamp + ".txt";
    connection.saveStream = fs.createWriteStream(that.options.messageFile);
};

gpii.test.mail.smtp.simpleSmtpServer.handleData = function (that, connection, chunk) {
    connection.saveStream.write(chunk);
};

gpii.test.mail.smtp.simpleSmtpServer.handleDataReady = function (that, connection, callback) {
    connection.saveStream.end();

    that.events.messageReceived.fire(that, connection);

    callback(null, that.options.config.queueId);
};

gpii.test.mail.smtp.simpleSmtpServer.init = function (that) {
    that.simplesmtp = simplesmtp.createServer(that.options.config);

    that.simplesmtp.on("startData", that.handleStartData);
    that.simplesmtp.on("data",      that.handleData);
    that.simplesmtp.on("dataReady", that.handleDataReady);

    console.log("Starting test mail server on port " + that.options.config.port + "....");
    that.simplesmtp.listen(that.options.config.port, function () {
        that.events.ready.fire(that);
    });
};

gpii.test.mail.smtp.simpleSmtpServer.stop = function (that) {
    try {
        that.simplesmtp.end(function () {
            console.log("Stopped mail server...");
        });
    }
    catch (e) {
        console.log("The SMTP server thinks it was already stopped.  I don't care as long as it's no longer running.");
    }
};

fluid.defaults("gpii.test.mail.smtp.simpleSmtpServer", {
    gradeNames: ["fluid.standardRelayComponent", "autoInit"],
    "config": "{gpii.test.mail.smtp}.options.config.simpleSmtp",
    "messageFile": null,
    "invokers": {
        "handleStartData": {
            "funcName": "gpii.test.mail.smtp.simpleSmtpServer.handleStartData",
            "args": ["{that}", "{arguments}.0"]
        },
        "handleData": {
            "funcName": "gpii.test.mail.smtp.simpleSmtpServer.handleData",
            "args": ["{that}", "{arguments}.0", "{arguments}.1"]
        },
        "handleDataReady": {
            "funcName": "gpii.test.mail.smtp.simpleSmtpServer.handleDataReady",
            "args": ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    },
    "events": {
        "messageReceived": null,
        "ready":           null
    },
    "listeners": {
        "onCreate.init": {
            "funcName": "gpii.test.mail.smtp.simpleSmtpServer.init",
            "args": ["{that}"]
        },
        "onDestroy.stop": {
            "funcName": "gpii.test.mail.smtp.simpleSmtpServer.stop",
            "args": ["{that}"]
        }
    }
});