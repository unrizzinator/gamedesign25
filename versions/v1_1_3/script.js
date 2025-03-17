const theaterBG = document.querySelector('#tbg');
const gameContainer = document.querySelector('.game-container');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const STAMINA_RELOAD_SPEED = 0.25;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const BASE_TIMELINE_FRAMERATE = 60;

let cW = canvas.width = GAME_WIDTH;
let cH = canvas.height = GAME_HEIGHT;

const COIN_128 = new Image();
COIN_128.src = "../../src/img/Coin128x128.png";

const cookie = {
    set(name, value) {
        document.cookie = `${name}=${(value).toString()}; expires="Fri, 01 Jan 2027 00:00:00 GMT;"`;
    },
    get(name) {
        console.log(`Requesting ${name}`);
        const cookies = document.cookie.split("; ");
        console.log(cookies);
        const cookie = cookies.find(r => r.startsWith(name + "="))?.split("=")[1] || null;
        console.log(`Found ${cookie}`);
        return cookie;
    },
    remove(name) {
        document.cookie = `${name}=""; expires="Fri, 01 Jan 1970 00:00:00 GMT; path=/"`;
    }
}

var settings = {
    controls: {
        left:    "a",
        right:   "d",
        down:    "s",
        up:      "w",
        jump:    " ",
        dash:    "shift",
        reset:   "r",
        pause:   "p",
        gravity: "g",
        editor:  "e",
        debug:   "\\",
        delete:  "delete"
    },
    gravity: true,
    debug: false
};

var editor = {
    panel: document.querySelector('#gameEditor'),
    editing: false,
    drawing: false,
    modes: ["select", "draw", "move"],
    mode: 0,
    activeObject: null,
    gridSize: 100,
    setMode(i) {
        this.mode = i;
        this.panel.querySelector('[editor-mode]').textContent = `Mode (${this.modes[this.mode]})`;
    },
    apply() {
        if (!this.activeObject) return;
        this.activeObject.position.x = Number.parseInt(this.panel.querySelector('#objectPosX ').value);
        this.activeObject.position.y = Number.parseInt(this.panel.querySelector('#objectPosY ').value);
        this.activeObject.size.x     = Number.parseInt(this.panel.querySelector('#objectSizeX').value);
        this.activeObject.size.y     = Number.parseInt(this.panel.querySelector('#objectSizeY').value);
    },
    translate(d) {
        switch (d) {
            case 0:
                this.activeObject.position.x -= editor.gridSize;
                break;
            case 1:
                this.activeObject.position.x += editor.gridSize;
                break;
            case 2:
                this.activeObject.position.y -= editor.gridSize;
                break;
            case 3:
                this.activeObject.position.y += editor.gridSize;
                break;
            default:
                break;
        }
        this.getObjectInfo();
    },
    setActiveObject(o) {
        if (!o) return;
        this.activeObject = o;
        this.getObjectInfo();
    },
    clearActiveObject() {
        this.activeObject = null;
        this.panel.querySelector('#objectId   ').value = null;
        this.panel.querySelector('#objectPosX ').value = null;
        this.panel.querySelector('#objectPosY ').value = null;
        this.panel.querySelector('#objectSizeX').value = null;
        this.panel.querySelector('#objectSizeY').value = null;
    },
    getObjectInfo() {
        if (!this.activeObject) return;
        this.panel.querySelector('#objectId   ').value = this.activeObject.id;
        this.panel.querySelector('#objectPosX ').value = this.activeObject.position.x;
        this.panel.querySelector('#objectPosY ').value = this.activeObject.position.y;
        this.panel.querySelector('#objectSizeX').value = this.activeObject.size.x;
        this.panel.querySelector('#objectSizeY').value = this.activeObject.size.y;
    },
    getObjectById(n) {
        for (let o of objects) {
            if (o.id == n) return o;
        }
        return null;
    },
    changeMode() {
        this.mode++;
        if (this.mode > this.modes.length - 1) this.mode = 0;
        this.clearActiveObject();
        this.panel.querySelector('[editor-mode]').textContent = `Mode (${this.modes[this.mode]})`;
    },
    updateDraw() {
        if (!this.drawing || !this.activeObject) return;
        this.activeObject.size = new Vector(Math.floor((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize - this.activeObject.position.x, 
                                            Math.floor((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize - this.activeObject.position.y);
    },
    startDraw() {
        if (this.mode != 1 || this.drawing) return;
        this.drawing = true;
        editor.activeObject = new Platform(new Vector(Math.floor((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize, Math.floor((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize), new Vector(20, 20), "#fff");
    },
    stopDraw() {
        if (this.mode != 1 || !this.drawing) return;
        this.drawing = false;
    },
    destroy() {
        if (!this.activeObject) return;
        this.activeObject.destroy();
        this.clearActiveObject();
    },
    load() {
        this.panel.style.display = "grid";
        this.setMode(0);
    },
    unload() {
        this.panel.style.display = "none";
        this.clearActiveObject();
    }
}

var backgroundColor = "#101010";
var paused = false;
var player = null;
var keyStates = {};
var currHighScore = 0;
var coins = 0;
var score = 0;
var nextID = 0;
var cameraSubject = null;
var dashLineSpan = 200;
var dashGuideScale = 1;

function goFullscreen() {
    if (!document.fullscreenElement) gameContainer.requestFullscreen();
    cW = canvas.width = window.outerWidth;
    cH = canvas.height = window.outerHeight;
    theaterBG.style.display = "block";
}

var objects = [];

class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }

    add(x, y) {
        return new Vector(this.x + x, this.y + y);
    }

    addVector(other) {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    sub(x, y) {
        return new Vector(this.x - x, this.y - y);
    }

    subVector(other) {
        return new Vector(this.x -other.x, this.y - other.y);
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    abs() {
        new Vector(Math.abs(this.x), Math.abs(this.y));
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    unit() {
        return new Vector(this.x/this.magnitude(), this.y/this.magnitude());
    }

    normal() {
        return new Vector(-this.y, this.x).unit();
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    clamp(minX, maxX, minY, maxY) {
        return new Vector(Math.max(minX, Math.min(this.x, maxX)), Math.max(minY, Math.min(this.y, maxY)));
    }

    clampX(minX, maxX) {
        return new Vector(Math.max(minX, Math.min(this.x, maxX)), this.y);
    }

    clampY(minY, maxY) {
        return new Vector(this.x, Math.max(minY, Math.min(this.y, maxY)));
    }

    mul(scalarX, scalarY) {
        return new Vector(this.x * scalarX, this.y * scalarY);
    }

    display(p, c, s) {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(p.x + cameraOffset.x, p.y + cameraOffset.y);
        ctx.lineTo(p.x + cameraOffset.x + this.x * s, p.y + cameraOffset.y + this.y * s);
        ctx.stroke();
    }

    displayUnit(p, c, l) {
        let ue = this.unit().mul(l, l);
        let origin = p.addVector(cameraOffset);
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + ue.x, origin.y + ue.y);
        ctx.stroke();
    }

    connect(v, c) {
        if (!v) return;
        ctx.strokeStyle = c ? c : "#09f";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
    }
}

function round(n, p) {
    return Math.round(n * (10**p)) / (10**p);
}

function raycast(startPos, directionUnit, maxDistance, objects) {
    let endX = startPos.x + directionUnit.x * maxDistance;
    let endY = startPos.y + directionUnit.y * maxDistance;

    let closestHit = null;
    let minDist = maxDistance;

    for (let obj of objects) {
        let hit = checkLineIntersection(startPos, new Vector(endX, endY), obj);
        if (hit && hit.distance < minDist) {
            closestHit = hit;
            minDist = hit.distance;
        }
    }

    return closestHit || { position: new Vector(endX, endY), hit: false };
}

function checkLineIntersection(startPos, endPos, obj) {
    if (endPos.x > obj.position.x &&
        endPos.x < obj.position.x + obj.size.x &&
        endPos.y > obj.position.y &&
        endPos.y < obj.position.y + obj.size.y) {
            let distance = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
            return { position: endPos, distance: distance, hit: true, target: obj };
    }
}

let spawnpoint = new Vector(0, -120);

class Player {
    constructor(position, color) {
        this.id = nextID;
        this.type = "Player";
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.velocity = new Vector();
        this.stamina = {
            min: 0,
            max: 100,
            value: 100
        }
        this.jumpHeight = 7;
        this.acceleration = .6;
        this.friction = 0.09;
        this.isGrounded = false;
        this.isDashing = false;
        this.color = color ? color : "#f00";
        this.size = new Vector(20, 20);
        this.offset = new Vector(5, 20);
        nextID++;
    }

    jump() {
        if (!this.isGrounded) return;
        this.isGrounded = false;
        this.velocity.y > 0 ? this.velocity.set(this.velocity.x, -this.jumpHeight) : 
                              this.velocity = this.velocity.add(0, -this.jumpHeight);
    }

    dash() {
        if (this.stamina.value < DASH_STAMINA_COST || this.isDashing || this.velocity.x === 0) return;
        this.isDashing = true;
        this.stamina.value -= DASH_STAMINA_COST;
        this.velocity.x = this.velocity.x < 0 ? -20 : 20;
        this.velocity.clampX(-25, 25);
        dashGuideScale = 0;
        setTimeout(() => {
            this.isDashing = false;
        }, 200);
    }

    setSpawnpoint(v) {
        if (!v) return;
        spawnpoint = v;
    }
}

class Zone {
    static zones = [];
    entities = [];

    constructor(identifier, position, size, visible, color) {
        this.identifier = identifier;
        this.position = position;
        this.size = size;
        this.visible = visible ? visible : false;
        this.color = color ? color : "#f002";
        Zone.zones.push(this);
    }

    getEntities() {
        let _entities = [];
        if (this.checkFor(player)) _entities.push(player);
        this.entities = _entities;
        return this.entities;
    }

    setVisible(state) {
        if (typeof state != Boolean) return;
        this.visible = state;
    }
    
    destroy() {
        this.toBeDestroyed = true;
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }

    checkFor(obj) {
        if (!obj) return console.error("An object wasn't provided.");
        if (!obj.position || !obj.size) return console.error("Object provided doesn't hold a position and/or size.");
        if (obj.position.x + obj.size.x / 2 > this.position.x &&
            obj.position.x + obj.size.x / 2 < this.position.x + this.size.x &&
            obj.position.y + obj.size.y / 2 > this.position.y &&
            obj.position.y + obj.size.y / 2 < this.position.y + this.size.y
        ) {
            return true;
        }
        return false;
    }

    static getZoneById(identifier) {
        for (let zone of Zone.zones) {
            if (zone.identifier == identifier) return zone;
        }
        return null;
    }
}

class AITurret {
    constructor(position) {
        this.position = position;
    }
}

class Point {
    static instances = [];

    constructor(position, value) {
        this.id = nextID;
        this.type = "Point";
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        Point.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Point.instances = [];
    }

    destroy() {
        this.toBeDestroyed = true;
        Point.instances = Point.instances.filter(o => !o.toBeDestroyed);
    }
}

class Dialog {

    static instances = [];

    constructor(text, color, position) {
        this.id = nextID;
        this.type = "Dialog";
        if (!text) return console.error("No text provided.");
        this.text = text;
        this.color = color ? color : "#fff";
        this.size = new Vector(ctx.measureText(this.text).width, ctx.measureText(this.text).fontBoundingBoxAscent + ctx.measureText(this.text).fontBoundingBoxDescent);
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        Dialog.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Dialog.instances = [];
    }

    destroy() {
        this.toBeDestroyed = true;
        Dialog.instances = Dialog.instances.filter(o => !o.toBeDestroyed);
    }
}

class Platform {

    static instances = [];

    constructor(position, size, color, velocity) {
        this.id = nextID;
        this.type = "Platform";
        this.position = position ? position : new Vector();
        this.velocity = velocity ? velocity : new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Platform.instances = [];
    }

    destroy() {
        this.toBeDestroyed = true;
        Platform.instances = Platform.instances.filter(o => !o.toBeDestroyed);
    }
}

class Checkpoint {

    static instances = [];

    constructor(position, size) {
        this.id = nextID;
        this.type = "Checkpoint";
        this.position = position ? position : new Vector();
        this.size = size;
        this.color = "#f09";
        Checkpoint.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Checkpoint.instances = [];
    }

    destroy() {
        this.toBeDestroyed = true;
        Checkpoint.instances = Checkpoint.instances.filter(o => !o.toBeDestroyed);
    }
}

class Bouncepad {

    static instances = [];

    constructor(position, power, size, color) {
        this.id = nextID;
        this.type = "Bouncepad";
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.power = power ? Math.max(0, power) : 10;
        this.size = size;
        this.color = color ? color : "#444";
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Bouncepad.instances = [];
    }

    destroy() {
        this.toBeDestroyed = true;
        Bouncepad.instances = Bouncepad.instances.filter(o => !o.toBeDestroyed);
    }
}

function updateSetting(s, v) {
    if (!v) return;
    if (settings[s]) {
        settings[s] = v;
    }
}

function toggleGravity() {
    settings.gravity = !settings.gravity;
    if (!settings.gravity) player.velocity.y = 0;
}

function toggleEditor() {
    editor.editing = !editor.editing;
    if (editor.editing) editor.load();
    else editor.unload();
}

function toggleDebug() {
    settings.debug = !settings.debug;
}

var cameraOffset = new Vector();
var currMousePos = new Vector();

function getObjectAtMouse() {
    var pc = new Vector(currMousePos.x, currMousePos.y);
        pc = pc.subVector(cameraOffset);
        pc = pc.add(cW/2, cH/2);
    for (let o of objects) {
        if (o.type == "Platform" || o.type == "Bouncepad") {
            if (pc.x > o.position.x && pc.x < o.position.x + o.size.x &&
                pc.y > o.position.y && pc.y < o.position.y + o.size.y) {
                    return o;
            }
        }
    }
    return null;
}

function reset() {
    const _tmpPlayerSize = new Vector().addVector(player.size);
    player = new Player(spawnpoint.add(-(_tmpPlayerSize.x/2), -_tmpPlayerSize.y - 20), "#fff");
    cameraSubject = player;
}

function pause() {
    paused = !paused;
}

function setup() {
    player = new Player(spawnpoint.add(-10, -40), "#fff");
    cameraSubject = player;
    
    // Floor
    new Platform(new Vector(-(Number.MAX_SAFE_INTEGER/2), 0), new Vector(Number.MAX_SAFE_INTEGER, cH), "#0a0a0a");

    // Walls
    new Platform(new Vector(-2000 - 100, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");
    new Platform(new Vector(2000, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");

    // Falling platforms
    for (let i = 1; i <= 5000; i++) {
        new Platform(new Vector((Math.random() * 800) - 400, -100 - (i * 40) + ((Math.random() * 60) - 30)), new Vector(100, 10), "#fff", new Vector(0, -Math.random() * 0.1 + 0.5));
    }

    new Checkpoint(new Vector(400, -5000), new Vector(100, 10));
    new Checkpoint(new Vector(-500, -10000), new Vector(100, 10));

    // new Zone("aZone", new Vector(-400, -400), new Vector(400, 400), true, "#f002");

    editor.editing = false;
    editor.unload();
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function drawGraph() {
    ctx.fillStyle = "#40404040";
    for (let _x = 0; _x < Math.floor(cW + 50 / editor.gridSize); _x++) {
        let offset = cameraOffset.x % editor.gridSize;
        ctx.fillRect((_x * editor.gridSize) + offset, 0, 1, cH);
    }
    for (let _y = 0; _y < Math.floor(cH / editor.gridSize); _y++) {
        let offset = cameraOffset.y % editor.gridSize;
        ctx.fillRect(0, (_y * editor.gridSize) + offset, cW, 1);
    }
}

function checkCollision(player, rect) {
    let nextPos = {
        x: player.position.x + player.velocity.x,
        y: player.position.y + player.velocity.y
    };

    let collisionX = nextPos.x + player.size.x > rect.position.x &&
                     nextPos.x < rect.position.x + rect.size.x;

    let collisionY = nextPos.y + player.size.y > rect.position.y &&
                     nextPos.y < rect.position.y + rect.size.y;

    if (collisionX && collisionY) {
        let overlapRight = nextPos.x + player.size.x - rect.position.x;
        let overlapLeft = rect.position.x + rect.size.x - nextPos.x;
        let overlapDown = nextPos.y + player.size.y - rect.position.y;
        let overlapUp = rect.position.y + rect.size.y - nextPos.y;

        let smallestOverlap = Math.min(overlapRight, overlapLeft, overlapDown, overlapUp);

        if (smallestOverlap === overlapRight && player.velocity.x > 0) {
            player.position.x = rect.position.x - player.size.x;
            player.velocity.x = 0;
        } 
        else if (smallestOverlap === overlapLeft && player.velocity.x < 0) {
            player.position.x = rect.position.x + rect.size.x;
            player.velocity.x = 0;
        } 
        else if (smallestOverlap === overlapDown && player.velocity.y > 0) {
            player.position.y = rect.position.y - player.size.y;
            if (rect instanceof Platform) {
                player.velocity.y = 0;
            } else if (rect instanceof Checkpoint) {
                player.velocity.y = 0;
                player.setSpawnpoint(rect.position.add(rect.size.x/2, rect.size.y/2));
            } else if(rect instanceof Bouncepad) {
                player.velocity.y = -rect.power;
            }
            player.isGrounded = true;
        } 
        else if (smallestOverlap === overlapUp && player.velocity.y < 0) {
            player.position.y = rect.position.y + rect.size.y;
            player.velocity.y = 0;
        }

        return true;
    }

    return false;
}

function updatePhysics(deltaTime) {
    if (player.position.y + player.velocity.y > 2000) reset();
    if (settings.gravity) player.velocity = player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER * deltaTime);
    if (keyStates[settings.controls.left]) player.velocity = player.velocity.add(-player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (keyStates[settings.controls.right]) player.velocity = player.velocity.add(player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;
    player.velocity = player.velocity.clamp((player.isDashing ? -50 : -10), (player.isDashing ? 50 : 10), -15, 10);
    player.velocity = player.velocity.mul(1 - player.friction * deltaTime, 1);
    player.position = player.position.add(player.velocity.x * deltaTime, player.velocity.y * deltaTime);

    for (let p of Platform.instances) {
        p.position = p.position.addVector(p.velocity);
        if ((p.velocity.x != 0 || p.velocity.y != 0) && p.position.y > 0) {
            p.destroy();
        }
        checkCollision(player, p);
    }

    for (let c of Checkpoint.instances) {
        checkCollision(player, c);
    }

    for (let zone of Zone.zones) {
        let entities = zone.getEntities();
        if (zone.identifier == "spawn") {
            for (let entity of entities) {
                entity.size.x = 50;
                entity.size.y = 50;
            }
        }
    }
}

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cW, cH);

    ctx.fillStyle = "#ffffff0a";
    ctx.font = "200px code";
    ctx.fillText(`${Math.round(score)}`, 50, 200);

    if (!editor.editing) {
        ctx.fillStyle = "white";
        ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillRect(player.position.x + cameraOffset.x + (dashLineSpan * dashGuideScale + 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillStyle = "#fff4";
        for (let i = 0; i < 9; i++) {
            ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10) + (((dashLineSpan * dashGuideScale * 2)/8)*i), player.position.y + cameraOffset.y + 5, 1, 10);
        }
    }

    // if (editor.editing)
    drawGraph();

    for (let o of objects) {
        if (o instanceof Platform) {
            ctx.fillStyle = o.color;
            ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y);
        } else if (o instanceof Checkpoint) {
            ctx.fillStyle = o.color;
            ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y);
        } else if (o instanceof Dialog) {
            ctx.fillStyle = o.color;
            ctx.font = "24px Arial";
            ctx.fillText(o.text, o.position.x + cameraOffset.x, o.position.y + cameraOffset.y);
        } else if (o instanceof Zone) {
            ctx.fillStyle = o.color;
            ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y); 
        }   
    }

    let playerSizeSquashX = Math.max(0, player.velocity.y);
    let playerSizeSquashY = Math.abs(player.velocity.x) > 10 ? Math.abs(player.velocity.x) : 0;

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x - (Math.max(-8, -playerSizeSquashX) / 2) + cameraOffset.x, 
                 player.position.y - (Math.max(-8, -playerSizeSquashY) / 2) + cameraOffset.y, 
                 player.size.x + Math.max(-8, -playerSizeSquashX), 
                 player.size.y + Math.max(-8, -playerSizeSquashY));

    ctx.fillStyle = "#08f";
    ctx.fillRect(0, cH - 5, (player.stamina.value/player.stamina.max)*cW, 5);

    if (settings.debug) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(40, 40, 200, 150);
        ctx.fillStyle = "white";
        ctx.font = "18px code";
        ctx.fillText(`Vel x: ${round(player.velocity.x, 2)}`, 50, 68);
        ctx.fillText(`Vel y: ${round(player.velocity.y, 2)}`, 50, 104);
        ctx.fillText(`Pos x: ${round(player.position.x, 2)}`, 50, 140);
        ctx.fillText(`Pos y: ${round(player.position.y, 2)}`, 50, 176);

        let centerOfPlayer = player.position.addVector(player.size.mul(0.5, 0.5));
        ctx.lineWidth = 3;
        new Vector(0, -1).normal().displayUnit(centerOfPlayer, "#f00", 120);
        player.velocity.normal().displayUnit(centerOfPlayer, "#08f", 50);
        player.velocity.displayUnit(centerOfPlayer, "#6f6", 100);
        player.velocity.display(centerOfPlayer, "#f88", 10);

        let newRay = raycast(centerOfPlayer, new Vector(0, 1), 100, Platform.instances);
        if (newRay.hit) {
            centerOfPlayer.addVector(cameraOffset).connect(newRay.position.addVector(cameraOffset), "#fff");
        }
    }

    ctx.fillStyle = "#000b";
    ctx.fillRect(cW - 170, 20, 160, 50);
    ctx.drawImage(COIN_128, cW - 160, 28, 32, 32);
    ctx.font = "24px code";
    ctx.fillStyle = "#fff";
    ctx.fillText(coins, cW - 120, 52);
    
    if (!editor.editing) return;

    let target = getObjectAtMouse();

    if (target && (editor.mode == 0 || editor.mode == 2)) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#80f";
        ctx.strokeRect(target.position.x + cameraOffset.x, target.position.y + cameraOffset.y, target.size.x, target.size.y);
    }

    if (editor.activeObject) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#f80";
        ctx.strokeRect(editor.activeObject.position.x + cameraOffset.x, editor.activeObject.position.y + cameraOffset.y, editor.activeObject.size.x, editor.activeObject.size.y);
    }

    ctx.fillStyle = "#fff";
}

var lastDeltaTime = performance.now();

function loop(t) {
    deltaTime = (t - lastDeltaTime)/1000;
    deltaTime = Math.min(deltaTime, 0.016) * 120;
    lastDeltaTime = t;

    score = Math.floor(Math.abs(player.position.y + 20) / 10);
    if (score > 25 && score - currHighScore) {
        coins += score - currHighScore;
        cookie.set("coins", coins);
        currHighScore = score;
    }

    objects = objects.filter(o => !o.toBeDestroyed);

    if (!paused && deltaTime) {
        if (!player) return;
        if (!cameraSubject) cameraSubject = player;
        player.stamina.value += STAMINA_RELOAD_SPEED;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        if (player.stamina.value >= DASH_STAMINA_COST) dashGuideScale = 1;
        var targetCameraOffset = new Vector(
            -(cameraSubject.position.x + cameraSubject.size.x / 2) + cW / 2,
            -(cameraSubject.position.y + cameraSubject.size.y / 2) + cH / 2);
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * 0.03;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * 0.1;

        updatePhysics(deltaTime);
        draw();
    }
    requestAnimationFrame(loop);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left - cW/2;
    currMousePos.y = ev.clientY - bb.top - cH/2;
    if (editor.drawing) editor.updateDraw();
}

canvas.onmousedown = (ev) => {
    if (ev.target != canvas) return;
    if (editor.editing) {
        switch (editor.mode) {
            case 0:
                let objectAtMousePosition = getObjectAtMouse(currMousePos);
                if (objectAtMousePosition) editor.setActiveObject(objectAtMousePosition);
                else editor.clearActiveObject();
                break;
            case 1:
                editor.startDraw();
                break;
            default:
                break;
        }
    }
}

document.onmouseup = () => {
    if (editor.editing && editor.mode == 1) editor.stopDraw();
}

document.onkeydown = (ev) => {
    if (ev.key == "Tab" || ev.key == " " || ev.key == "Enter") ev.preventDefault();
    keyStates[ev.key.toLowerCase()] = true;
    switch (ev.key.toLowerCase()) {
        case settings.controls.jump:
            player.jump();
            break;
        case settings.controls.up:
            player.jump();
            break;
        case settings.controls.dash:
            player.dash();
            break;
        case settings.controls.reset:
            reset();
            break;
        case settings.controls.pause:
            pause();
            break;
        case settings.controls.gravity:
            toggleGravity();
            break;
        case settings.controls.editor:
            toggleEditor();
            break;
        case settings.controls.debug:
            toggleDebug();
            break;
        case settings.controls.delete:
            editor.destroy();
            break;
        default:
            null;
            break;
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key.toLowerCase()] = false;
}

document.onfullscreenchange = () => {
    if (!document.fullscreenElement) {
        cW = canvas.width = 900;
        cH = canvas.height = 600;
        theaterBG.style.display = "none";
    }
}

const coinsLastSaved = cookie.get("coins");
coins = coinsLastSaved ? Number.parseInt(coinsLastSaved) : 0;
console.log(`Last saved: ${coinsLastSaved}`);