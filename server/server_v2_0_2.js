const ws = require('ws');
const { v4 } = require('uuid');

const TARGET_UPS = 60; // Updates per second

const wss = new ws.WebSocketServer({ port:3036 });

class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }
}

class Player {
    static instances = [];

    toBeDestroyed = false;

    constructor(socket, name) {
        this.uuid = v4();
        this.name = name;
        this.socket = socket;
        this.position = new Vector();
        Player.instances.push(this);
    }

    destroy() {
        this.toBeDestroyed = true;
    }

    static getByUUID(uuid) {
        for (let plr of Player.instances) {
            if (plr.uuid == uuid) return plr;
        }
        return null;
    }
}

function serverUpdate() {
    Player.instances = Player.instances.filter(p => !p.toBeDestroyed);
    
    for (let plr of Player.instances) {
        let syncData = {
            "header": {
                "eventName": "update"
            }, 
            "body": {
                "players": Player.instances.filter(p => p.uuid != plr.uuid)
                                           .map(p => ({
                                            uuid: p.uuid,
                                            name: p.name,
                                            position: p.position
                                           }))
            }
        };

        plr.socket.send(JSON.stringify(syncData));
    }
}

wss.on('connection', (socket) => {
    socket.addEventListener("message", (packet) => {
        const data = JSON.parse(packet.data);
        if (data.header.eventName == 'requestJoin') {
            let newPlr = new Player(socket, data.body.name);
            
            var res = {
                "header": {
                    "eventName": "accept"
                },
                "body": {
                    "newID": newPlr.uuid,
                    "players": Player.instances
                }
            };
            newPlr.socket.send(JSON.stringify(res));
        } else if (data.header.eventName == 'player2Server') {
            let playerRequesting = Player.getByUUID(data.body.uuid);
            if (!playerRequesting) return;
            playerRequesting.position = data.body.position;
        }
    });

    socket.on('close', () => {
        for (let plr of Player.instances) {
            if (socket == plr.socket) {
                plr.toBeDestroyed = true;
                
                var data = {
                    "header": {
                        "eventName": "playerDisconnected"
                    },
                    "body": {
                        "uuid": plr.uuid
                    }
                };

                for (let c of wss.clients) {
                    c.send(JSON.stringify(data));
                }
            }
            
        }
    });
});

setInterval(serverUpdate, (1000/TARGET_UPS));
