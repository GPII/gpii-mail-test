"use strict";
var fluid = fluid || require('infusion');
var gpii  = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.test.mail.smtp");
require("../js/mailserver");

var jqUnit = fluid.require("jqUnit");
var fs     = require("fs");

var nodemailer    = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
var options = {
    secure: false,
    port:   4026,
    ignoreTLS: true
};
var transporter   = nodemailer.createTransport(smtpTransport(options));

var mailOptions = {
    from:    "sender@localhost",
    to:      "recipient@localhost",
    subject: "Test Subject",
    text:    "Test Body"
};

function isSaneResponse(jqUnit, error, info) {
    jqUnit.assertNull("There should be no mail errors", error);

    jqUnit.assertNotNull("There should message info returned...", info);
    if (info) {
        jqUnit.assertNotNull("There should be a message ID", info.messageId);
        jqUnit.assertEquals("There should be an accepted message...", 1, info.accepted.length);
        jqUnit.assertEquals("There should be no rejected messages...", 0, info.rejected.length);
        jqUnit.assertEquals("The sender should be correct", mailOptions.from, info.envelope.from);
        jqUnit.assertEquals("The recipient should be correct", mailOptions.to, info.envelope.to[0]);
    }
};

var mailServer = gpii.test.mail.smtp({
    "config": { "port": 4026 }
});

function runTests() {
    //jqUnit.module("Testing SMTP server...");
    jqUnit.module("Testing SMTP server...", { "setup": function() { mailServer.reset(); } });

    jqUnit.asyncTest("Testing default mail handling...", function() {
        transporter.sendMail(mailOptions, function(error, info){
            jqUnit.start();
            isSaneResponse(jqUnit, error, info);
        });
    });

    jqUnit.asyncTest("Testing custom mail handling (and file storage)...", function() {
        mailServer.applier.change("mailHandler", function(that, connection) {
            jqUnit.start();
            jqUnit.assertEquals("The sender should be correct",    mailOptions.from, connection.from);
            jqUnit.assertEquals("The recipient should be correct", mailOptions.to, connection.to[0]);

            jqUnit.stop();

            // Confirm that the test content exists and is correct
            fs.readFile(that.model.messageFile, function(err, data) {
                jqUnit.start();
                jqUnit.assertNull("There should be no errors:" + err, err);
                jqUnit.assertNotNull("There should be message data returned.", data);
                if (data) {
                    var message = data.toString();
                    jqUnit.assertTrue("The subject data should be in the message.", message.indexOf(mailOptions.subject) !== -1);
                    jqUnit.assertTrue("The message body should be in the message.", message.indexOf(mailOptions.text) !== -1);
                }
            });
        });

        transporter.sendMail(mailOptions, function(error, info){
            jqUnit.start();
            isSaneResponse(jqUnit, error, info);
            jqUnit.stop();
        });
    });

    jqUnit.asyncTest("Testing reset function to remove custom mail handler and restore the default handler...", function() {
        mailServer.applier.change("mailHandler", function(that, connection) {
            jqUnit.fail("The custom mail handler should never have been reached.")
        });

        mailServer.reset(function() {
            transporter.sendMail(mailOptions, function(error, info){
                jqUnit.start();
                isSaneResponse(jqUnit, error, info);
            });
        });
    });

    jqUnit.asyncTest("Testing server shutdown...", function() {
        mailServer.stop(function() {
            transporter.sendMail(mailOptions, function(error, info){
                jqUnit.start();

                // We should see an error because the server is now down.
                jqUnit.assertNotNull("There should be an error.", error);
                jqUnit.assertEquals("The connection should have been refused.", "ECONNREFUSED", error.code);
            });
        });
    });

}

mailServer.start(runTests);