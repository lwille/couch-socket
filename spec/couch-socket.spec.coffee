CouchSocket = require "../index.js"
settings    = require './test-settings.js'
express     = require 'express'
_           = require 'underscore'
http        = require 'http'
WebSocket    = require('websocket-client').WebSocket
#io          = require 'socket.io-node-client'

client = ()->
  new WebSocket "ws://localhost:#{settings.testPort}/socket.io/websocket"
dbRequest = (method, path, body, cb)->
  [cb, body] = [body, cb] unless cb
  console.log method, path
  headers = "Content-Type":"application/json"
  if settings.user && settings.pass
    headers['Authorization'] = 'Basic ' + new Buffer(settings.user + ':' + settings.pass).toString('base64')
  req = http.request
    host: settings.host
    port: settings.port
    method: method
    path: path
    headers: headers
    , (res)->
      res.on 'data', (data)->
        try
          cb JSON.parse data.toString().trim()
        catch error
          console.error error.message
  req.write JSON.stringify(body).toString('base64') if body
  req.end()

describe 'when the library is required', ->
  it 'should export a CouchSocket class', ->
    expect(typeof CouchSocket).toEqual('function')


describe 'when starting the server', ->
  app         = express.createServer()
  beforeEach ->
    app.listen settings.testPort
    console.log "listening to #{settings.testPort}"
  afterEach ->
    console.log "close"
    app.close()

  describe 'and a client connects', ->
    socket = new CouchSocket settings
    socket.listen app, 
      onConnect: (c)=>
        console.log "onConnect"

    clientConnected = 0
    ws = client()
    @messages = 0
    ws.on "message", (ev)=>
      console.log "received#{@messages}", ev
      @messages += 1
      clientConnected = 2 if @messages >= 1
      @notificationReceived = true if @messages >= 2
      
    ws.on "open", ()=>
      console.log "open"
      clientConnected = 1

    it 'should receive a connection event', ->
      waitsFor (()->clientConnected == 2), "client to connect",6000
      #ws = io.createClient "ws://localhost:#{settings.testPort}/socket.io"
      #ws.on 'connect', ()->console.log "connected"

    xdescribe 'and the database changes', =>
      it 'should receive a notification', =>
        waitsFor (()=>
          if clientConnected
            dbRequest "POST", "/"+_(settings.dbs).chain().keys().first().value(), {'test':'blubb'}, (res)=>
              console.log 'created test document'
              expect(res.ok).toBe true
              @documentCreated=true
        ), 'client to connect', 5000
        waitsFor (()=>@documentCreated and @notificationReceived), 'document to be created', 7000

  it 'should work without having a database', ->
    socket = new CouchSocket _(settings).extend dbs:{}
    socket.listen app

  it 'should work without attaching event callbacks', ->
    socket = new CouchSocket settings
    socket.listen app
