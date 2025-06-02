'use strict';

var Minio;

function Oss(_runtime, _client) {
    var runtime = _runtime;
    var settings = _runtime.settings.minio;
    var events = runtime.events;        // Events to commit change to runtime
    var logger = runtime.logger;        // Logger
    var working = false;
    var status = OssStatusEnum.INIT;   // Current status (StateMachine)
    var lastCheck = 0;
    var client = _client;

    this.start = function () {
        return new Promise(function (resolve, reject) {
            logger.info('oss start...');
            status = OssStatusEnum.CHECKING;
            client.bucketExists(settings.bucketName).then(function (exists) {
                 if (exists) {
                     status = OssStatusEnum.OK;
                     resolve();
                 } else {
                     logger.warn(`oss makeBucket ${settings.buketName}`);
                     client.makeBucket(settings.bucketName).then(function () {
                         status = OssStatusEnum.OK;
                         resolve();
                     }).catch(function (err) {
                         logger.error(`oss makeBucket ${settings.buketName} failed`);
                         reject(err);
                     });
                 }
             });
        });

    }
}

var OssStatusEnum = {
    INIT: 0,
    CHECKING: 1,
    OK: 2,
    ERROR: 3
};

export default {
    create: function (_runtime, manager) {
        //To use with plugin
        try {
            Minio = require('minio');
        } catch {
        }
        if (!Minio && manager) {
            try {
                Minio = manager.require('minio');
            } catch {
            }
        }
        if (!Minio) return null;
        return new Oss(_runtime, new Minio.Client(_runtime.settings.minio));
    }
}