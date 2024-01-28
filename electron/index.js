const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net = __importStar(require("net"));
const events_1 = require("events");
//@ts-ignore
const splitStream = __importStar(require("./split-stream"));
const random4digithex = () => Math.random().toString(16).split('.')[1].substr(0, 4);
const randomuuid = () => new Array(8).fill(0).map(() => random4digithex()).join('-');
/**
 *
 *
 * Section 1, Basic messaging System
 *
 *
 */
const ConnectionMap = new Map(); //Map of uids to socket
const brain = new events_1.EventEmitter();
const server = net.createServer(handleNewSocket);
function handleNewSocket(socket) {
    let connectionId = randomuuid();
    ConnectionMap.set(connectionId, {
        socket,
        connectionId
    });
    brain.emit('system-connect', connectionId);
    socket.on('close', () => {
        ConnectionMap.delete(connectionId);
        brain.emit('system-disconnect', connectionId);
    });
    socket.pipe(splitStream()).on('data', (message) => {
        brain.emit('system-message', {
            connectionId,
            message
        });
    });
}
;
function _send(connectionId, message) {
    const connection = ConnectionMap.get(connectionId);
    if (!connection) {
        throw new Error(`Attempt to send data to connection that does not exist ${connectionId}`);
    }
    connection.socket.write(JSON.stringify(message));
}
;
function connect(ip, port, cb) {
    const socket = new net.Socket();
    socket.connect(port, ip, () => {
        handleNewSocket(socket);
        cb && cb();
    });
    return (cb) => socket.destroy(cb);
}
;
server.listen();
const identity_1 = __importDefault(require("./identity"));
const auth = (0, identity_1.default)();
const NODE_ID = auth.UUID;
const neighbors = new Map();
const findNodeId = (connectionId) => {
    for (const [nodeId, $connectionId] of neighbors) {
        if (connectionId === $connectionId) {
            return nodeId;
        }
    }
};
brain.on('system-connect', (connectionId) => {
    _send(connectionId, {
        type: 'handshake',
        data: NODE_ID
    });
});
brain.on('system-message', ({ connectionId, message }) => {
    const { type, data } = message;
    if (type === 'handshake') {
        neighbors.set(data, connectionId);
        brain.emit('connect', {
            data
        });
    }
    if (type === 'message') {
        const nodeId = findNodeId(connectionId);
        brain.emit('message', {
            nodeId,
            data
        });
    }
});
brain.on('system-disconnect', (connectionId) => {
    const nodeId = findNodeId(connectionId);
    neighbors.delete(nodeId);
    brain.emit('disconnect', {
        nodeId
    });
});
const send = (nodeId, data) => {
    const connectionId = neighbors.get(nodeId);
    _send(connectionId, {
        type: 'message',
        data
    });
};
const alreadySeenMessages = new Set();
const sendPacket = (packet) => {
    for (const $nodeId of neighbors.keys()) {
        send($nodeId, packet);
    }
};


const direct = (destination, message, id = randomuuid(), origin = NODE_ID, ttl = 255) => {
    sendPacket({
        id,
        ttl,
        type: 'direct',
        message,
        destination,
        origin
    });
};

brain.on('message', ({ nodeId, data: packet }) => {
    if (alreadySeenMessages.has(packet.id) || packet.ttl < 1) {
        return;
    }
    else {
        alreadySeenMessages.add(packet.id);
    }


    if (packet.type === 'direct') {
        if (packet.destination === NODE_ID) {
            brain.emit('direct', {
                origin: packet.origin,
                message: packet.message
            });
        }
        else {
            direct(packet.destination, packet.message, packet.id, packet.origin, packet.ttl - 1);
        }
    }
});


//on direct
//conect
//broadcast
//direct
//id
//neigbhors


const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
    })
    ipcMain.on('connect', (event, data) => {
        const [ip, port] = data.split(':');
        const socket = net.connect(port, ip);
        socket.on('connect', () => {
            event.reply('connection-status', 'Connected');
        });
    
        socket.on('data', (data) => {
            mainWindow.webContents.send('message-from-backend', data.toString());
        });
    
        socket.on('close', () => {
            event.reply('connection-status', 'Disconnected');
        });
    });
    
    // IPC communication for sending messages
    ipcMain.on('send-message', (event, message) => {
        // Broadcast the message to all connected clients
        server.getConnections((err, count) => {
            if (!err && count > 0) {
                server.getConnections((err, sockets) => {
                    sockets.forEach((socket) => {
                        socket.write(message);
                    });
                });
            }
        });
    });

    win.loadFile('frontend/main.htm')
}

app.whenReady().then(() => {
    createWindow()
})