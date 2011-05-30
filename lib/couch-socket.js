var CouchSocket, http, io, url, _;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
http = require('http');
io = require('socket.io');
url = require('url');
_ = require('underscore');
module.exports = CouchSocket = (function() {
  function CouchSocket(options) {
    this.listen = __bind(this.listen, this);    this.db = {
      user: options.user || false,
      pass: options.pass || false,
      host: options.host || 'localhost',
      port: options.port || 5984
    };
    this.dbs = options.dbs;
  }
  CouchSocket.prototype.get = function(uri, cb) {
    var headers;
    console.log(uri);
    headers = {
      "Content-Type": "application/json"
    };
    if (this.db.user && this.db.pass) {
      headers['Authorization'] = 'Basic ' + new Buffer(this.db.user + ':' + this.db.pass).toString('base64');
    }
    return http.get({
      host: this.db.host,
      port: this.db.port,
      headers: headers,
      path: uri
    }, function(res) {
      return res.on('data', function(data) {
        var str;
        try {
          str = data.toString().trim();
          if (str.length) {
            return cb(JSON.parse(str));
          } else {
            return cb({});
          }
        } catch (error) {
          console.log("parse error", data.toString());
          return console.error(error.stack);
        }
      });
    }).on('error', console.error);
  };
  CouchSocket.prototype.connect = function() {
    return _(this.dbs).each(__bind(function(options, db) {
      options.filter || (options.filter = function(doc, clients, next) {
        return next(clients);
      });
      return this.get("/" + db, __bind(function(info) {
        return this.get("/" + db + "/_changes?feed=continuous&include_docs=true" + (info.update_seq ? '&since=' + info.update_seq : ''), __bind(function(json) {
          var message, _clients, _ref;
          if (json.doc == null) {
            return console.log("json contains no doc", json);
          } else {
            _ref = [json.doc._id, json.doc._rev], json.doc.id = _ref[0], json.doc.rev = _ref[1];
            delete json.doc._id;
            delete json.doc._rev;
            message = {
              database: db,
              data: json.doc
            };
            _clients = _(this.socket.clients).values();
            return options.filter(json.doc, _clients, __bind(function(clients) {
              if (clients.length > 0 && clients.length === _clients.length) {
                console.log('filter 1');
                return this.socket.broadcast(message);
              } else {
                console.log("filter 2", clients.length);
                return _(clients).invoke('send', message);
              }
            }, this));
          }
        }, this));
      }, this));
    }, this));
  };
  CouchSocket.prototype.listen = function(server, events) {
    var next;
    next = function(clt, cb) {
      return cb();
    };
    events || (events = {});
    events.onConnect || (events.onConnect = next);
    events.onMessage || (events.onMessage = next);
    events.onDisconnect || (events.onDisconnect = next);
    this.connect();
    this.socket = io.listen(server);
    return this.socket.on('connection', __bind(function(client) {
      console.log(arguments);
      events.onConnect(client, __bind(function() {}, this));
      client.on('message', __bind(function(data) {
        data = JSON.parse(data);
        return events.onMessage(data, __bind(function() {}, this));
      }, this));
      return client.on('disconnect', __bind(function() {
        console.log("" + client.sessionId + " disconnected");
        if (events.onDisconnect) {
          return events.onDisconnect(client);
        }
      }, this));
    }, this));
  };
  return CouchSocket;
})();