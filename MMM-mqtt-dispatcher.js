'use strict';
/* global Module */

/* Magic Mirror
 * Module: MMM-mqtt
 *
 * By Javier Ayala http://www.javierayala.com/
 * MIT Licensed.
 */

Module.register('MMM-mqtt-dispatcher', {

  defaults: {
    debug: false,
    mqttServer: 'mqtt://test.mosquitto.org',
    loadingText: 'Loading MQTT Data...',
    topic: '',
    showTitle: false,
    title: 'MQTT Data',
    interval: 300000,
    postText: '',
    subscriptions: [],
    publications: []
  },

  start: function() {
    Log.info('Starting module: ' + this.name);
    this.loaded = false;
    this.mqttVal = '';
    this.updateMqtt(this);
  },

  updateMqtt: function(self) {
    self.sendSocketNotification('MQTT_DISPATCH_SERVER', { mqttServer: self.config.mqttServer, subscriptions: self.config.subscriptions});
    setTimeout(self.updateMqtt, self.config.interval, self);
  },

  getDom: function() {
    var wrapper = document.createElement('div');

    if (this.config.debug) {
      if (!this.loaded) {
        wrapper.innerHTML = this.config.loadingText;
        return wrapper;
      }

      if (this.config.showTitle) {
        var titleDiv = document.createElement('div');
        titleDiv.innerHTML = this.config.title;
        wrapper.appendChild(titleDiv);
      }

      var mqttDiv = document.createElement('div');
      mqttDiv.innerHTML = this.mqttVal.toString().concat(this.config.postText);
      wrapper.appendChild(mqttDiv);
    }
      
    return wrapper;
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === 'MQTT_DISPATCH_DATA') {
      if (this.config.debug){Log.log("Got message: topic "+payload.topic+", data:"+payload.data)};
      // search topics
      for (var i = 0; i < this.config.subscriptions.length; i++) {
        if (this.config.debug){Log.log("Testing against "+this.config.subscriptions[i].topic)};
        if (payload.topic === this.config.subscriptions[i].topic){
          if (this.config.debug){Log.log("Matched.")};
          // search notifications, compare message value
          for (var j = 0; j < this.config.subscriptions[i].notifications.length; j++) {
            if (this.config.debug){Log.log("Testing against "+this.config.subscriptions[i].notifications[j].value)};
            if (payload.data === this.config.subscriptions[i].notifications[j].value) {
              if (this.config.debug){Log.log("Matched.")};
              var data = payload.data;
              // Some recipients insist on numerics, not strings
              if (this.config.subscriptions[i].notifications[j].hasOwnProperty('numeric')) {
                data = Number(payload.data);
              }
              this.sendNotification(this.config.subscriptions[i].notifications[j].notification, data);
              if (this.debug) {
                this.mqttVal = "Sent "+this.config.subscriptions[i].notifications+" with arg "+payload.data;
              }
            }
          }
        } else {
          if (this.debug) {
            this.mqttVal = "Ignored "+payload.topic+" with arg "+payload.data;
          }          
        }
      }
      
      this.loaded = true;
      this.updateDom();
    }

    if (notification === 'ERROR') {
      this.sendNotification('SHOW_ALERT', payload);
    }
  },

  notificationReceived: function(notification, payload, sender) {
    var self = this;

    if (self.config.mode !== "send") {
      return;
    }

    var topic;
    if (sender) {
      Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name + ": ", payload);
      topic = this.config.topic + "/" + sender.name + "/" + notification;
    } else {
      Log.log(this.name + " received a system notification: " + notification + ": ", payload);
      topic = this.config.topic + "/" + notification;
    }

    this.sendSocketNotification("MQTT_DISPATCH_SEND", {
      mqttServer: self.config.mqttServer,
      topic: topic,
      payload: payload
    });
  }

});
