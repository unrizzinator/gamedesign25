const ws = require('ws');
const { v4 } = require('uuid').v4;

const TARGET_UPS = 30; // Updates per second

const wss = new ws.WebSocketServer({ port:3030 });

class Player {
    static instances = [];

    constructor(socket) {
        this.id = v4();
        this.socket = socket;
        Player.instances.push(this);
        this.onInit();
    }

    onInit() {
        const data = {
            "header": {
                "eventName": "accept"
            },
            "body": {
                "playerUUID": this.id
            }
        }
        this.socket.emit(JSON.parse(data));
    }

    destroy() {
        this.toBeDestroyed = true;
    }
}

function serverUpdate() {
    for (let i = Player.instances.length; i >= 0; i--) {
        const plr = Player.instances[i];
        if (plr.toBeDestroyed) {
            Player.instances.splice(i, 1);
        }
    }
}

wss.on('connection', (socket) => {
    new Player(socket);
});

setInterval(serverUpdate, (1000/TARGET_UPS));