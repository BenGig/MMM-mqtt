'use strict';

/* Magic Mirror
 * Module: MMM-mqtt-dispatcher
 *
 * By Bengt Giger
 * Based on MMM-mqtt by Javier Ayala http://www.javierayala.com/
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var mqtt = require('mqtt');

module.exports = NodeHelper.create({
  start: function() {
    console.log('MMM-mqtt-dispatcher started ...');
    this.clients = [];
    this.config = {};
  },

  connectMqtt: function(config) {
    var self = this;
    var client;

    if(typeof self.clients[config.mqttServer] === "undefined" || self.clients[config.mqttServer].connected == false) {
      console.log("Creating new MQTT client for url: ", config.mqttServer);
      client = mqtt.connect(config.mqttServer);
      self.clients[config.mqttServer] = client;

      client.on('error', function(error) {
        console.log('*** MQTT JS ERROR ***: ' + error);
        self.sendSocketNotification('ERROR', {
          type: 'notification',
          title: 'MQTT Error',
          message: 'The MQTT Client has suffered an error: ' + error
        });
      });

      client.on('offline', function() {
        console.log('*** MQTT Client Offline ***');
        self.sendSocketNotification('ERROR', {
          type: 'notification',
          title: 'MQTT Offline',
          message: 'MQTT Server is offline.'
        });
        client.end();
      });
    } else {
      client = self.clients[config.mqttServer];
    }

    for (var i = 0; i < config.subscriptions.length; i++) {
      if (! client.connected) {
        client.subscribe(config.subscriptions[i].topic);
        console.log("MQTT subscription: "+config.subscriptions[i].topic);
        client.on('message', function(topic, message) {
          self.sendSocketNotification('MQTT_DISPATCH_DATA', {'topic':topic, 'data':message.toString()});
        });
      }
    }
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === 'MQTT_DISPATCH_CONNECT') {
      this.connectMqtt(payload);
    } else if(notification == 'MQTT_DISPATCH_SEND') {
      var client = this.clients[payload.mqttServer];
      if(typeof client !== "undefined") {
        client.publish(payload.topic, JSON.stringify(payload.payload));
      }
    }
  }
});
