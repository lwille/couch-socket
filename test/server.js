var ConnectionTracker, CouchSocket, WebSocket, app, couchSocket, express, tracking, ws, _;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
express = require('express');
CouchSocket = require('../index.js');
_ = require('underscore');
WebSocket = require('./ws-sio-client');
app = express.createServer();
app.listen(9999);
couchSocket = new CouchSocket({
  host: 'emma-mobil.de',
  user: 'lwille',
  pass: 'emma2341',
  dbs: {
    'barcode_scans': {
      filter: function(doc, clients, next) {
        return next(clients);
      }
    },
    'carts': {
      filter: function(doc, clients, next) {
        return next(clients);
      }
    }
  }
});
tracking = new (ConnectionTracker = (function() {
  function ConnectionTracker() {
    this.remove = __bind(this.remove, this);
    this.add = __bind(this.add, this);
  }
  ConnectionTracker.prototype.connections = {};
  ConnectionTracker.prototype.add = function(key, value) {
    if (!(key in this.connections)) {
      this.connections[key] = [];
    }
    this.connections[key].push(value);
    return this.connections[key];
  };
  ConnectionTracker.prototype.remove = function(key, value) {
    if (key in this.connections) {
      return this.connections[key] = _(this.connections[key]).reject(function(needle) {
        return needle === value;
      });
    }
  };
  return ConnectionTracker;
})());
couchSocket.listen(app, {
  onConnect: function(client, next) {
    return express.cookieParser()(client.request, null, function() {
      var connections;
      console.log("session", client.request.cookies.session);
      connections = tracking.add('user', client);
      _(connections).invoke('send', _(connections).map(function(conn) {
        return conn.request.headers['User-Agent'];
      }));
      return next();
    });
  },
  onMessage: function(data) {},
  onDisconnect: function(client) {
    var connections;
    connections = tracking.remove('user', client);
    return _(connections).invoke('send', _(connections).map(function(conn) {
      return conn.request.headers['User-Agent'];
    }));
  }
});
ws = WebSocket.createClient({
  port: 9999
});
ws.on("open", function() {
  return console.log('webSocket connected');
});
ws.on("data", function(msg) {
  return console.log('ws', msg);
});