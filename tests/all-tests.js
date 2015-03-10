"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.test.mail.smtp.testSuite");

require("../index.js");

var jqUnit = fluid.require("jqUnit");
var fs     = require("fs");

gpii.test.mail.smtp.testSuite.mailOptions = {
    from:    "sender@localhost",
    to:      "recipient@localhost",
    subject: "Test Subject",
    text:    "Test Body"
};

gpii.test.mail.smtp.testSuite.isSaneResponse = function (error, info) {
    jqUnit.assertNull("There should be no mail errors", error);

    jqUnit.assertNotNull("There should message info returned...", info);
    jqUnit.assertNotNull("There should be a message ID", info.messageId);
    jqUnit.assertEquals("There should be an accepted message...", 1, info.accepted.length);
    jqUnit.assertEquals("There should be no rejected messages...", 0, info.rejected.length);
    jqUnit.assertEquals("The sender should be correct", gpii.test.mail.smtp.testSuite.mailOptions.from, info.envelope.from);
    jqUnit.assertEquals("The recipient should be correct", gpii.test.mail.smtp.testSuite.mailOptions.to, info.envelope.to[0]);
};

gpii.test.mail.smtp.testSuite.mailTest = function (funcName) {
    gpii.test.mail.smtp({
        "config": {
            "port": 4026
        },
        "listeners": {
            "ready": {
                "funcName": funcName,
                "args": ["{that}"]
            }
        }
    });
};

gpii.test.mail.smtp.testSuite.testMailSending = function (that) {
    that.transporter.sendMail(gpii.test.mail.smtp.testSuite.mailOptions, function (error, info) {
        jqUnit.start();
        gpii.test.mail.smtp.testSuite.isSaneResponse(error, info);
        that.destroy();
    });
};

gpii.test.mail.smtp.testSuite.testCustomMailHandling = function (that) {

    that.events.messageReceived.addListener(function (that, connection) {
        jqUnit.start();
        jqUnit.assertEquals("The sender should be correct", gpii.test.mail.smtp.testSuite.mailOptions.from, connection.from);
        jqUnit.assertEquals("The recipient should be correct", gpii.test.mail.smtp.testSuite.mailOptions.to, connection.to[0]);

        jqUnit.stop();

        // Confirm that the test content exists and is correct
        fs.readFile(that.options.messageFile, function (err, data) {
            jqUnit.start();
            jqUnit.assertNull("There should be no errors:" + err, err);
            jqUnit.assertNotNull("There should be message data returned.", data);
            if (data) {
                var message = data.toString();
                jqUnit.assertTrue("The subject data should be in the message.", message.indexOf(gpii.test.mail.smtp.testSuite.mailOptions.subject) !== -1);
                jqUnit.assertTrue("The message body should be in the message.", message.indexOf(gpii.test.mail.smtp.testSuite.mailOptions.text) !== -1);
            }
        });
    });

    that.transporter.sendMail(gpii.test.mail.smtp.testSuite.mailOptions, function (error, info) {
        jqUnit.start();
        gpii.test.mail.smtp.testSuite.isSaneResponse(error, info);
        that.destroy();
        jqUnit.stop();
    });
};

gpii.test.mail.smtp.testSuite.tests = {
    "Testing default mail handling...":                   "gpii.test.mail.smtp.testSuite.testMailSending",
    "Testing custom mail handling (and file storage)...": "gpii.test.mail.smtp.testSuite.testCustomMailHandling"
};

gpii.test.mail.smtp.testSuite.runTests = function () {
    Object.keys(gpii.test.mail.smtp.testSuite.tests).forEach(function (label) {
        var testFuncName = gpii.test.mail.smtp.testSuite.tests[label];
        jqUnit.asyncTest(label, function () {
            gpii.test.mail.smtp.testSuite.mailTest(testFuncName);
        });
    });
};

gpii.test.mail.smtp.testSuite.runTests();