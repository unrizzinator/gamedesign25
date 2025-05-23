// Known goals for the future:
// 1. Add a pacer system such as rising lava
// 2. Revert Vector class back

const theaterBG = document.querySelector('#tbg');
const gameContainer = document.querySelector('.game-container');

const ui = document.querySelector('.ui');
const windowContainer = document.querySelector('.window-container');
const coinStat = ui.querySelector('#coinStat');
const coinStatDisplay = coinStat.querySelector('#coinStatDisplay');
const healthStat = ui.querySelector('#healthStat');
const healthStatDisplay = healthStat.querySelector('#healthStatDisplay');
const staminaStat = ui.querySelector('#staminaStat');
const staminaStatDisplay = staminaStat.querySelector('#staminaStatDisplay');
const upgradesList = document.querySelector('#upgrades');

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const BASE_TIMELINE_FRAMERATE = 60;

let cW = canvas.width = GAME_WIDTH;
let cH = canvas.height = GAME_HEIGHT;

const UIWindows = document.querySelectorAll('.window');

const cookie = {
    set(name, value) {
        document.cookie = `${name}=${(value).toString()}; expires="Fri, 01 Jan 2027 00:00:00 GMT;"`;
    },
    get(name) {
        const cookies = document.cookie.split("; ");
        const cookie = cookies.find(r => r.startsWith(name + "="))?.split("=")[1] || null;
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
        menu:    "m",
        reset:   "r",
        pause:   "p",
        gravity: "g",
        editor:  "e",
        debug:   "\\",
        delete:  "delete"
    },
    gravity: true,
    debug: false,
    moonGravity: false
};

var editor = {
    panel: document.querySelector('#gameEditor'),
    editing: false,
    drawing: false,
    dragging: false,
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
        this.activeObject.size = new Vector(Math.round((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize - this.activeObject.position.x, 
                                            Math.round((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize - this.activeObject.position.y);
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
    updateMove() {
        if (!this.dragging || !this.activeObject) return;
        this.activeObject.position = new Vector(Math.round((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize - this.activeObject.position.x, 
                                                Math.round((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize - this.activeObject.position.y);
        console.log('Moving');
    },
    startMove() {
        if (this.mode != 2 || this.dragging) return;
        this.drawing = true;
        editor.setActiveObject(getObjectAtMouse());
    },
    stopMove() {
        if (this.mode != 2 || !this.dragging) return;
        this.drawing = false;
        editor.clearActiveObject();
        console.log('Move end');
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
var hasStarted = false;
var paused = false;
var gameFocused = false;
var player = null;
var keyStates = {};
var currHighScore = 0;
var coins = 0;
var score = 0;
var nextID = 0;
var cameraSubject = null;
var dashLineSpan = 200;
var dashGuideScale = 1;
var zoneCoinMultiplier = 1;

var stats = {
    stamina: {
        name: "Stamina",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 5000,
            scale: 1.75,
        }
    },
    staminaRegenSpeed: {
        name: "Stamina Regeneration Speed",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 5000,
            scale: 1.8,
        }
    },
    jumpHeight: {
        name: "Jump Height",
        level: {
            max: 3,
            current: 0
        },
        cost: {
            base: 3000,
            scale: 1.4
        }
    },
    coinMultiplier: {
        name: "Coin Multiplier",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 10000,
            scale: 1.85,
        }
    },
};

let upgradeData = cookie.get("upgrades");
if (upgradeData) {
    for (let i = 0; i < Object.keys(stats).length; i++) {
        let s = Object.keys(stats)[i];
        stats[s].level.current = upgradeData[s] ? upgradeData[s].level : 0;
    }
}

function requestStatUpgrade(el, stat) {
    if (!Object.keys(stats).includes(stat)) {
        Error(`Stat "${stat}" not found.`);
        return;
    }
    let s = stats[stat];
    let compoundedCost = s.cost.base * Math.pow(s.cost.scale, s.level.current)
    if (coins >= compoundedCost && s.level.current < s.level.max) {
        coins -= compoundedCost;
        s.level.current++;
    }

    let upgradeData = {};
    for (let i = 0; i < Object.keys(stats).length; i++) {
        let s = Object.keys(stats)[i];
        upgradeData[s] = {};
        s.level = stats[s].level.current;
    }
    cookie.set("upgrades", JSON.stringify(upgradeData));

    let upgradeProgressElement = el.parentNode.querySelector('.upgradeLevel');
    upgradeProgressElement.style.width = `${(s.level.current/s.level.max) * 100}%`;
}

function fillUI() {
    for (let i = 0; i < Object.keys(stats).length; i++) {
        let k = Object.keys(stats)[i];
        let v = stats[k];
        upgradesList.innerHTML += `
        <div class="upgrade">
            <div class="name">${v.name} (${Math.floor(v.cost.base + Math.pow(v.cost.scale, v.level.current))})</div>
            <div class="upgradeLevelContainer">
                <div class="upgradeLevel" style="width: ${(v.level.current/v.level.max) * 100}%;"></div>
            </div>
            <button class="coolBtn" onclick="requestStatUpgrade(this, '${k}')">Upgrade</button>
        </div>`;
    }
} setTimeout(fillUI, 200);

function goFullscreen() {
    if (!document.fullscreenElement) gameContainer.requestFullscreen();
    cW = canvas.width = window.screen.width;
    cH = canvas.height = window.screen.height;
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
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.velocity = new Vector();
        this.health = {
            min: 0,
            max: 100,
            value: 100
        }
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
        this.zone = null;
        this.zIndex = 100;
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

    constructor(identifier, position, size, attributes, visible, color) {
        this.identifier = identifier;
        this.position = position;
        this.size = size;
        this.attributes = attributes ? attributes : {};
        this.visible = visible ? visible : false;
        this.color = color ? color : "#f002";
        this.zIndex = 99;
        Zone.zones.push(this);
        objects.push(this);
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

    static clearInstances() {
        for (let i = 0; i < Zone.zones.length; i++) {
            let o = Zone.zones[i];
            o.toBeDestroyed = true;
        }
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }
}

class Coin {
    static instances = [];

    constructor(position, value) {
        this.id = nextID;
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        this.zIndex = 98;
        Point.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Coin.instances.length; i++) {
            let o = Coin.instances[i];
            o.toBeDestroyed = true;
        }
        Coin.instances = Coin.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Coin.instances = Coin.instances.filter(o => !o.toBeDestroyed);
    }
}

class Dialog {

    static instances = [];

    constructor(text, color, position) {
        this.id = nextID;
        if (!text) return console.error("No text provided.");
        this.text = text;
        this.color = color ? color : "#fff";
        this.size = new Vector(ctx.measureText(this.text).width, ctx.measureText(this.text).fontBoundingBoxAscent + ctx.measureText(this.text).fontBoundingBoxDescent);
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.zIndex = 97;
        Dialog.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Dialog.instances.length; i++) {
            let o = Dialog.instances[i];
            o.toBeDestroyed = true;
        }
        Dialog.instances = Dialog.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Dialog.instances = Dialog.instances.filter(o => !o.toBeDestroyed);
    }
}

class Platform {

    static instances = [];

    constructor(position, size, color, velocity, zIndex) {
        this.id = nextID;
        this.position = position ? position : new Vector();
        this.velocity = velocity ? velocity : new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = zIndex ? zIndex : 1;
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Platform.instances.length; i++) {
            let o = Platform.instances[i];
            o.toBeDestroyed = true;
        }
        Platform.instances = Platform.instances.filter(o => !o.toBeDestroyed);
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
        this.position = position ? position : new Vector();
        this.size = size;
        this.color = "#f09";
        this.zIndex = 96;
        Checkpoint.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Checkpoint.instances.length; i++) {
            let o = Checkpoint.instances[i];
            o.toBeDestroyed = true;
        }
        Checkpoint.instances = Checkpoint.instances.filter(o => !o.toBeDestroyed);
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
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.power = power ? Math.max(0, power) : 10;
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = 95;
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Bouncepad.instances.length; i++) {
            let o = Bouncepad.instances[i];
            o.toBeDestroyed = true;
        }
        Bouncepad.instances = Bouncepad.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Bouncepad.instances = Bouncepad.instances.filter(o => !o.toBeDestroyed);
    }
}

//identifier, position, size, visible, color
const difficultyZones = [
    new Zone("Easy", new Vector(-1000, -5000), new Vector(2000, 5000), {coinMultiplier: 1, platformWidth: 100, platformSpeed: {min: -0.5, max: 0.5}}, true, "#0f02"),
    new Zone("Medium", new Vector(-1000, -15000), new Vector(2000, 10000), {coinMultiplier: 2, platformWidth: 70, platformSpeed: {min: -0.75, max: 0.75}}, true, "#ff02"),
    new Zone("Hard", new Vector(-1000, -30000), new Vector(2000, 15000), {coinMultiplier: 4, platformWidth: 60, platformSpeed: {min: -0.75, max: 0.75}}, true, "#f002"),
    new Zone("Insanity", new Vector(-1000, -50000), new Vector(2000, 20000), {coinMultiplier: 6, platformWidth: 40, platformSpeed: {min: -1.2, max: 1.2}}, true, "#80f2")
];

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

function cleanup() {
    Bouncepad.clearInstances();
    Checkpoint.clearInstances();
    Coin.clearInstances();
    Dialog.clearInstances();
    Platform.clearInstances();
    Zone.clearInstances();
}

function reset() {
    cleanup();
    setup();
    cameraSubject = player;
}

function pause() {
    paused = !paused;
}

function setup() {
    player = new Player(spawnpoint.add(-10, -20), "#fff");
    cameraSubject = player;
    
    // Floor
    new Platform(new Vector(-(Number.MAX_SAFE_INTEGER/2), 0), new Vector(Number.MAX_SAFE_INTEGER, cH), "#0a0a0a", null, 2);

    // Walls
    new Platform(new Vector(-2000 - 100, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");
    new Platform(new Vector(2000, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");
    
    new Platform(new Vector(-2000, -100), new Vector(10, 100), "#08f", new Vector(1), 5);

    // Falling platforms
    for (let i = 0; i < difficultyZones.length; i++) {
        const zone = difficultyZones[i];
        for (let i = 1; i <= Math.round(zone.size.y) / 80; i++) {
            new Platform(new Vector((Math.random() * 800) - 400, zone.position.y + zone.size.y - (i * 80)), 
            new Vector(zone.attributes.platformWidth, 10), "#fff", 
            new Vector((Math.random() * (zone.attributes.platformSpeed.max - zone.attributes.platformSpeed.min)) + zone.attributes.platformSpeed.min));
        }
    }

    // new Checkpoint(new Vector(400, -5000), new Vector(100, 10));
    // new Checkpoint(new Vector(-500, -10000), new Vector(100, 10));

    objects = objects.sort((a, b) => a.zIndex - b.zIndex);

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
                player.position = player.position.add(rect.velocity.x, rect.velocity.y);
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
    if (settings.gravity) player.velocity = player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER * deltaTime * (settings.moonGravity ? 0.166 : 1));
    if (keyStates[settings.controls.left]) player.velocity = player.velocity.add(-player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (keyStates[settings.controls.right]) player.velocity = player.velocity.add(player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;
    player.velocity = player.velocity.clamp((player.isDashing ? -50 : -10), (player.isDashing ? 50 : 10), -20, 10);
    player.velocity = player.velocity.mul(1 - player.friction * deltaTime, 1);
    player.position = player.position.add(player.velocity.x * deltaTime, player.velocity.y * deltaTime);

    for (let i = 0; i < Zone.zones.length; i++) {
        let zone = Zone.zones[i];
        if (zone.checkFor(player)) {
            if (zone.attributes.coinMultiplier) {
                zoneCoinMultiplier = zone.attributes.coinMultiplier;
            }
        }
    }

    for (let p of Platform.instances) {
        p.position = p.position.addVector(p.velocity);
        if (p.velocity.y != 0 && p.position.y > 0) {
            p.destroy();
        }
        if (p.velocity.x != 0 && ((p.position.x < -300 && p.velocity.x < 0) || (p.position.x + p.size.x > 300 && p.velocity.x > 0))) {
            p.velocity.x = -p.velocity.x;
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

    ctx.fillStyle = "#ffffff40";
    ctx.font = "120px code";
    let st = score.toString();
    for (let i = 0; i < st.length; i++) {
        ctx.fillText(st.charAt(i), 50, 120 + (i*120));
    }

    if (!editor.editing) {
        ctx.fillStyle = "#fff6";
        ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillRect(player.position.x + cameraOffset.x + (dashLineSpan * dashGuideScale + 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillStyle = "#fff2";
        for (let i = 0; i < 9; i++) {
            ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10) + (((dashLineSpan * dashGuideScale * 2)/8)*i), player.position.y + cameraOffset.y + 5, 1, 10);
        }
    }

    // if (editor.editing)
    drawGraph();

    for (let i = objects.length - 1; i > 0; i--) {
        let o = objects[i];
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
            if (o.visible) {
                ctx.fillStyle = o.color;
                ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y); 
            }
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
    if (score > 25 && score - currHighScore > 0) {
        coins += (score - currHighScore) * zoneCoinMultiplier;
        cookie.set("coins", coins);
        cookie.set("highscore", score);
        currHighScore = score;
    }
    coinStatDisplay.textContent = coins.toLocaleString();
    healthStatDisplay.textContent = Math.round(player.health.value);
    staminaStatDisplay.textContent = Math.round(player.stamina.value);

    objects = objects.filter(o => !o.toBeDestroyed);

    if (!paused && deltaTime) {
        if (!player) return;
        if (!cameraSubject) cameraSubject = player;
        player.stamina.value += 1 * Math.max(1, (stats.staminaRegenSpeed.level.current)) * deltaTime;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        dashGuideScale = player.stamina.value/player.stamina.max;
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

function exitWindow() {
    for (let w of UIWindows) {
        w.classList.remove("active");
        windowContainer.style.backdropFilter = "none";
    }
    gameFocused = true;
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 1;
    staminaStat.style.opacity = 1;
}

function openWindow(windowId) {
    exitWindow();
    gameFocused = false;
    for (let i = 0; i < UIWindows.length; i++) {
        let window = UIWindows[i];
        if (window.getAttribute("windowId") == windowId) {
            window.classList.add('active');
            windowContainer.style.backdropFilter = "blur(8px)";
        }
    }
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 0;
    staminaStat.style.opacity = 0;
}

function toggleMenu() {
    if (gameFocused) openWindow("pauseMenu");
    else exitWindow();
}

function start() {
    exitWindow();
    hasStarted = true;
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 1;
    staminaStat.style.opacity = 1;
}

setup();
loop();

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left - cW/2;
    currMousePos.y = ev.clientY - bb.top - cH/2;
    if (editor.drawing) editor.updateDraw();
    if (editor.dragging) editor.updateMove();

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
            case 2:
                editor.startMove();
                break;
            default:
                break;
        }
    }
}

document.onmouseup = () => {
    if (editor.drawing) editor.stopDraw();
    if (editor.dragging) editor.stopMove();
}

document.onkeydown = (ev) => {
    if (ev.key != settings.controls.menu && !gameFocused) return;
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
        case settings.controls.menu:
            toggleMenu();
            break;
        case settings.controls.reset:
            reset();
            break;
        case settings.controls.pause:
            pause();
            break;
        case settings.controls.gravity:
            // toggleGravity();
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
coins = coinsLastSaved ? Number.parseFloat(coinsLastSaved) : 0;
coinStatDisplay.textContent = coins.toLocaleString();