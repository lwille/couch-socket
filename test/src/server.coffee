express = require 'express'

CouchSocket = require '../index.js'
_           = require 'underscore'
WebSocket    = require('./ws-sio-client')
app         = express.createServer()

app.listen 9999

couchSocket = new CouchSocket
  host: 'emma-mobil.de'
  user: 'lwille'
  pass: 'emma2341'
  dbs:
    # 'sessions':
    #   filter: (doc, clients, next)->next(clients)
    'barcode_scans':
      filter: (doc, clients, next)->next(clients)
    'carts':
      filter: (doc, clients, next)->next(clients)
        
  

tracking = new class ConnectionTracker
  connections:{}
  add: (key, value)=>
    @connections[key] = [] unless key of @connections
    @connections[key].push value
    @connections[key]
  remove: (key, value)=>
    if key of @connections
      @connections[key] = _(@connections[key]).reject (needle)->
        needle is value 

couchSocket.listen app,
  onConnect: (client, next)->
    express.cookieParser() client.request, null, ()->                                      
      console.log "session", client.request.cookies.session
      connections = tracking.add 'user', client
      _(connections).invoke 'send', _(connections).map (conn)->conn.request.headers['User-Agent']
      next()
  onMessage: (data)->
      
  onDisconnect: (client)->
    connections = tracking.remove 'user', client
    _(connections).invoke 'send', _(connections).map (conn)->conn.request.headers['User-Agent']


ws = WebSocket.createClient port:9999

ws.on "open", ()->
  console.log 'webSocket connected'
  
  
ws.on "data", (msg)->console.log 'ws', msg