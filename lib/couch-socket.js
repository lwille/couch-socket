var CouchSocket, http, url, _;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
http = require('http');
url = require('url');
_ = require('underscore');
module.exports = CouchSocket = (function() {
  function CouchSocket(options) {
    this.listen = __bind(this.listen, this);    this.log = function() {};
    if (options.logging) {
      this.log = console.log;
    }
    this.db = {
      user: options.user || false,
      pass: options.pass || false,
      host: options.host || 'localhost',
      port: options.port || 5984
    };
    this.dbs = options.dbs;
  }
  CouchSocket.prototype.get = function(uri, cb) {
    var headers;
    this.log(uri);
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
          return console.error(error, error.stack);
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
            ;
          } else {
            this.log("" + db + " changed to seq " + json.seq);
            _ref = [json.doc._id, json.doc._rev], json.doc.id = _ref[0], json.doc.rev = _ref[1];
            delete json.doc._id;
            delete json.doc._rev;
            this.log(db, json.doc.id);
            message = {
              database: db,
              data: json.doc
            };
            _clients = _(this.clients).map(function(client) {
              return client;
            });
            return options.filter(json.doc, _clients, __bind(function(clients) {
              if (clients.length > 0 && clients.length === _clients.length) {
                this.log('filter 1');
                return this.io.sockets.emit('changed', message);
              } else {
                this.log("filter 2", clients);
                return _(clients).invoke('emit', 'changed', message);
              }
            }, this));
          }
        }, this));
      }, this));
    }, this));
  };
  CouchSocket.prototype.listen = function(server, events) {
    var next;
    next = function(clt, data, cb) {
      if (cb) {
        cb();
      }
      if (!cb) {
        return console.error((new Error).stack);
      }
    };
    events || (events = {});
    events.onConnect || (events.onConnect = next);
    events.onMessage || (events.onMessage = next);
    events.onDisconnect || (events.onDisconnect = next);
    this.clients = {};
    this.connect();
    this.io = (require('socket.io')).listen(server);
    return this.io.sockets.on('connection', __bind(function(socket) {
      this.log("" + socket.id + " connected");
      this.clients[socket.id] = socket;
      events.onConnect(socket, null, __bind(function() {}, this));
      return socket.on('disconnect', __bind(function() {
        delete this.clients[socket.id];
        this.log("" + socket.id + " disconnected");
        return events.onDisconnect(socket, null, __bind(function() {}, this));
      }, this));
    }, this));
  };
  return CouchSocket;
})();