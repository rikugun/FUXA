/**
 *
 * Monibuca as a device
 * Monibuca (pronounced: analog not card, m7s is its abbreviation, similar to k8s) is an open source streaming server development framework developed in Go. It is based on go1.19+, in addition to no other dependencies built, and provides a set of plug-in secondary development model to help you efficiently develop streaming media servers, you can directly use the official plug-in, or develop your own plug-in to extend any function, so Monibuca is a framework that can support any streaming protocol!
 */
'use strict';

const utils = require('../../utils');
const deviceUtils = require('../device-utils');

function M7s(_data, _logger, _events) {
    var data = JSON.parse(JSON.stringify(_data)); // Current Device data { id, name, tags, enabled, ... }
    var logger = _logger;
    var working = false;                // Working flag to manage overloading polling and connection
    var events = _events;               // Events to commit change to runtime
    var varsValue = {};                 // Tags to send to frontend { id, type, value }
    var lastTimestampValue;             // Last Timestamp of values
    var tagsMap = {};                   // Map of tag id
    var overloading = 0;                // Overloading counter to mange the break connection
    var toCheck = false;                // Flag that define if there are tags to check by polling
    var connectionTags = [];            // Tags of connection status of devices
    var type;

    this.connect = function () {
        return new Promise(async (resolve, reject) => {

        })
    }
}


module.exports = {
    init: function (settings) {
    },
    create: function (data, logger, events) {
        return new M7s(data, logger, events);
    }
}