import * as net from 'net';
import {  EventEmitter} from 'events';
//@ts-ignore
import * as splitStream from './split-stream';

const random4digithex = (): string => Math.random().toString(16).split('.')[1].substr(0, 4);
const randomuuid = (): string => new Array(8).fill(0).map(() => random4digithex()).join('-');

interface Connection {
  socket: net.Socket;
  connectionId: string;
}

interface HandshakeMessage {
  type: 'handshake';
  data: string;
}

interface MessageMessage {
  type: 'message';
  data: any;
}

type MessageType = HandshakeMessage | MessageMessage;

interface Packet {
  id: string;
  ttl: number;
  type: 'broadcast' | 'direct';
  message: any;
  origin: string;
  destination ? : string;
}

/**
 * 
 * 
 * Section 1, Basic messaging System
 * 
 * 
 */

const ConnectionMap = new Map < string, Connection > (); //Map of uids to socket

const brain = new EventEmitter();

const server = net.createServer(handleNewSocket);

function handleNewSocket(socket: net.Socket): void {

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

  socket.pipe(splitStream()).on('data', (message: MessageType) => {
    brain.emit('system-message', {
      connectionId,
      message
    });
  });
};


function _send (connectionId: string, message: any): void {
  const connection = ConnectionMap.get(connectionId);

  if (!connection) {
    throw new Error(`Attempt to send data to connection that does not exist ${connectionId}`);
  }

  connection.socket.write(JSON.stringify(message));
};

function connect (ip: string, port: number, cb ? : () => void): (() => void) {
  const socket = new net.Socket();

  socket.connect(port, ip, () => {
    handleNewSocket(socket);
    cb && cb();
  });

  return (cb ? : () => void) => socket.destroy(cb as undefined);
};


server.listen()

//---------------------------------------------------------------------------------
//---------------------------------------------------------------------------------


/**
 * 
 * 
 * Section 2, User managment
 * 
 * 
*/

import * as crypto from 'crypto'
import USER_AUTH from './identity';

const auth = USER_AUTH()

const NODE_ID = auth.UUID;
const neighbors = new Map < string, string > ();

const findNodeId = (connectionId: string): string | undefined => {
  for (const [nodeId, $connectionId] of neighbors) {
    if (connectionId === $connectionId) {
      return nodeId;
    }
  }
};

brain.on('system-connect', (connectionId: string): void => {
  _send(connectionId, {
    type: 'handshake',
    data: NODE_ID
  });
});

brain.on('system-message', ({ connectionId, message}: { connectionId: string,  message: MessageType}): void => {

  const { type, data  } = message;

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

brain.on('system-disconnect', (connectionId: string): void => {
  const nodeId = findNodeId(connectionId);

  neighbors.delete(nodeId as string);
  brain.emit('disconnect', {
    nodeId
  });
});

const send = (nodeId: string, data: any): void => {
  const connectionId = neighbors.get(nodeId);

  _send(connectionId!, {
    type: 'message',
    data
  });
};

const alreadySeenMessages = new Set < string > ();

const sendPacket = (packet: Packet): void => {
  for (const $nodeId of neighbors.keys()) {
    send($nodeId, packet);
  }
};

const broadcast = (message: any, id: string = randomuuid(), origin: string = NODE_ID, ttl: number = 255): void => {
  sendPacket({
    id,
    ttl,
    type: 'broadcast',
    message,
    origin
  });
};

const direct = (destination: string, message: any, id: string = randomuuid(), origin: string = NODE_ID, ttl: number = 255): void => {
  sendPacket({
    id,
    ttl,
    type: 'direct',
    message,
    destination,
    origin
  });
};

brain.on('message', ({ nodeId, data: packet}: { nodeId: string, data: Packet }): void => {

  if (alreadySeenMessages.has(packet.id) || packet.ttl < 1) {
    return;
  } else {
    alreadySeenMessages.add(packet.id);
  }

  if (packet.type === 'broadcast') {
    brain.emit('broadcast', {
      message: packet.message,
      origin: packet.origin
    });

    broadcast(packet.message, packet.id, packet.origin, packet.ttl - 1);
  }

  if (packet.type === 'direct') {
    if (packet.destination === NODE_ID) {
      brain.emit('direct', {
        origin: packet.origin,
        message: packet.message
      });
    } else {
      direct(packet.destination!, packet.message, packet.id, packet.origin, packet.ttl - 1);
    }
  }
});

//on direct
//on boradcast
//conect
//broadcast
//direct
//id
//neigbhors

