http  = require 'http'
io    = require 'socket.io'
url   = require 'url'
_     = require 'underscore'

module.exports = class CouchSocket
  constructor: (options) ->
    @db = 
      user: options.user or false
      pass: options.pass or false
      host: options.host or 'localhost'
      port: options.port or 5984      
    @dbs = options.dbs  
  get: (uri, cb)->
    console.log uri
    headers = 
      "Content-Type":"application/json"
    if @db.user && @db.pass
      headers['Authorization'] = 'Basic ' + new Buffer(@db.user + ':' + @db.pass).toString('base64')
    http.get
      host: @db.host
      port: @db.port
      headers: headers
      path: uri
      , (res)->
        res.on 'data', (data)->
          try
            # server sends CRLF as heartbeat
            str = data.toString().trim()
            if str.length
              cb JSON.parse str
            else
              cb {}
          catch error
            console.log "parse error", data.toString()
            console.error error.stack
    .on 'error', console.error
  connect: () ->
    _(@dbs).each (options, db) =>
      options.filter ||= (doc, clients, next)->next clients
      @get "/#{db}", (info)=>
        @get "/#{db}/_changes?feed=continuous&include_docs=true#{if info.update_seq then '&since=' + info.update_seq else ''}", (json)=>
          unless json.doc?
            console.log "json contains no doc", json
          else
            [json.doc.id, json.doc.rev] = [json.doc._id,json.doc._rev]
            delete json.doc._id
            delete json.doc._rev
          
            message =
              database:db
              data:json.doc
            _clients = _(@socket.clients).values()
            options.filter json.doc, _clients, (clients)=>
              if clients.length > 0 and clients.length is _clients.length
                console.log 'filter 1'
                @socket.broadcast message
              else
                console.log "filter 2", clients.length
                _(clients).invoke 'send', message
              
  listen: (server, events) =>
    next = (clt,cb)->cb()
    events ||= {}
    events.onConnect ||= next
    events.onMessage ||= next
    events.onDisconnect ||= next
    @connect()
    @socket = io.listen server    
    @socket.on 'connection', (client) =>
      console.log arguments
      events.onConnect client, ()=>
        
      client.on 'message', (data) =>
        data = JSON.parse data
        events.onMessage data, ()=>

      client.on 'disconnect', () =>
        console.log "#{client.sessionId} disconnected"
        events.onDisconnect client if events.onDisconnect