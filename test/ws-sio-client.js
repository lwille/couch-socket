var sio = require('socket.io')
,
WebSocket = require('websocket-client').WebSocket
,
parser = require('./sio-parser')
/**
 * WebSocket socket.io client.
 *
 * @api private
 */

function WSClient(port, sid) {
    this.sid = sid;
    this.port = port;
    WebSocket.call(
    this
    , 'ws://localhost:' + port + '/socket.io/websocket'
    );
};

/**
 * Inherits from WebSocket.
 */

WSClient.prototype.__proto__ = WebSocket.prototype;

/**
 * Overrides message event emission.
 *
 * @api private
 */

WSClient.prototype.emit = function(name) {
    var args = arguments;

    if (name == 'message' || name == 'data') {
        args[1] = parser.decodePacket(args[1].toString());
    }

    return WebSocket.prototype.emit.apply(this, arguments);
};

/**
 * Writes a packet
 */

WSClient.prototype.packet = function(pack) {
    this.write(parser.encodePacket(pack));
    return this;
};

/**
 * Creates a websocket client.
 *
 * @api public
 */
exports.createClient = function websocket(cl, sid) {
        return new WSClient(cl.port, sid);
}
