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
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const BASE_TIMELINE_FRAMERATE = 60;
const GRID_SIZE = 100;
const TARGET_UPS = 60;

let cW = canvas.width = window.innerWidth;
let cH = canvas.height = window.innerHeight;

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
        debug:   "\\",
    },
    debug: false,
};

var backgroundColor = "#fafafa";
var hasStarted = false;
var gameFocused = false;
var player = null;
var keyStates = {};
var currHighScore = 0;
var coins = 0;
var score = 0;
var cameraSubject = null;
var dashLineSpan = 200;
var dashGuideScale = 1;
var zoneCoinMultiplier = 1;
var shootLoop;
var inLead;

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

class Tag {

    #tags = [];

    getTag(t) {
        for (let tag of this.#tags) {
            if (t == tag) return tag;
        }
        return null;
    }

    addTag(t) {
        if (this.#tags[t]) return;
        this.#tags.push(t);
    }

    removeTag() {
        if (this.#tags.indexOf(t) == -1) return;
        this.#tags.splice(this.#tags.indexOf(t, 1));
    }
}

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

let spawnpoint = new Vector(0, -60);

class Player extends Tag {
    constructor(position, color) {
        super();
        this.name = `Player${Math.floor(Math.random()*255)}`;
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

class GhostPlayer {
    static instances = [];

    constructor(uuid, name) {
        this.uuid = uuid;
        this.name = name;
        this.size = new Vector(20, 20);
        this.color = `hsl(${Math.random() * 360}, 100%, 40%)`;
        this.currPosition = new Vector();
        this.position = new Vector();
        GhostPlayer.instances.push(this);
    }

    static getByUUID(uuid) {
        for (let gp of GhostPlayer.instances) {
            if (gp.uuid == uuid) return gp;
        }
        return null;
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
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        this.zIndex = 98;
        Point.instances.push(this);
        objects.push(this);
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
        if (!text) return console.error("No text provided.");
        this.text = text;
        this.color = color ? color : "#fff";
        this.size = new Vector(ctx.measureText(this.text).width, ctx.measureText(this.text).fontBoundingBoxAscent + ctx.measureText(this.text).fontBoundingBoxDescent);
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.zIndex = 97;
        Dialog.instances.push(this);
        objects.push(this);
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

class Platform extends Tag {

    static instances = [];

    constructor(position, size, color, velocity, zIndex) {
        super();
        this.position = position ? position : new Vector();
        this.velocity = velocity ? velocity : new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = zIndex ? zIndex : 1;
        Platform.instances.push(this);
        objects.push(this);
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
        this.position = position ? position : new Vector();
        this.size = size;
        this.color = "#f09";
        this.zIndex = 96;
        Checkpoint.instances.push(this);
        objects.push(this);
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
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.power = power ? Math.max(0, power) : 10;
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = 95;
        Platform.instances.push(this);
        objects.push(this);
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
    new Zone("Easy", new Vector(-Number.MAX_SAFE_INTEGER/4, -5000), new Vector(Number.MAX_SAFE_INTEGER/2, 5000), {coinMultiplier: 1, platformWidth: 100, platformSpeed: {min: -0.5, max: 0.5}}, false, "#0f01"),
    new Zone("Medium", new Vector(-Number.MAX_SAFE_INTEGER/4, -15000), new Vector(Number.MAX_SAFE_INTEGER/2, 10000), {coinMultiplier: 2, platformWidth: 70, platformSpeed: {min: -0.75, max: 0.75}}, false, "#ff01"),
    new Zone("Hard", new Vector(-Number.MAX_SAFE_INTEGER/4, -30000), new Vector(Number.MAX_SAFE_INTEGER/2, 15000), {coinMultiplier: 4, platformWidth: 60, platformSpeed: {min: -0.75, max: 0.75}}, false, "#f001"),
    new Zone("Insanity", new Vector(-Number.MAX_SAFE_INTEGER/4, -50000), new Vector(Number.MAX_SAFE_INTEGER/2, 20000), {coinMultiplier: 6, platformWidth: 40, platformSpeed: {min: -1.2, max: 1.2}}, false, "#80f1")
];

function updateSetting(s, v) {
    if (!v) return;
    if (settings[s]) {
        settings[s] = v;
    }
}

function toggleDebug() {
    settings.debug = !settings.debug;
}

var cameraOffset = new Vector();
var currMousePos = new Vector();

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

function setup() {
    player = new Player(spawnpoint.add(-10, -20), "#f00");
    inLead = player;
    cameraSubject = player;

    // Floor
    new Platform(new Vector(-100000, 0), new Vector(101000, cH), "#fff", null, 2);
    let _x = new Platform(new Vector(1000, 100), new Vector(2000, cH), "#f90", null, 2);
    _x.addTag('kill');
    new Platform(new Vector(3000, 0), new Vector(100000, cH), "#fff", null, 2);

    // Walls
    // new Platform(new Vector(-2000 - 100, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");
    // new Platform(new Vector(2000, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");

    objects = objects.sort((a, b) => a.zIndex - b.zIndex);
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function drawGraph() {
    ctx.fillStyle = "#0001";
    for (let _x = 0; _x < Math.floor(cW + 50 / GRID_SIZE); _x++) {
        let offset = cameraOffset.x % GRID_SIZE;
        ctx.fillRect((_x * GRID_SIZE) + offset, 0, 1, cH);
    }
    for (let _y = 0; _y < Math.floor(cH / GRID_SIZE); _y++) {
        let offset = cameraOffset.y % GRID_SIZE;
        ctx.fillRect(0, (_y * GRID_SIZE) + offset, cW, 1);
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

        if (rect.hasTag) {
            if (rect.hasTag('kill')) {
                alert('kill player');
            }
        }

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
    player.velocity = player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER * deltaTime);
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

    for (let gp of GhostPlayer.instances) {
        gp.currPosition.x += (gp.position.x - gp.currPosition.x) * 0.15;
        gp.currPosition.y += (gp.position.y - gp.currPosition.y) * 0.15;
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

    drawGraph();

    for (let i = objects.length - 1; i >= 0; i--) {
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

    for (let gp of GhostPlayer.instances) {
        ctx.fillStyle = gp.color;
        ctx.fillRect(gp.currPosition.x + cameraOffset.x, gp.currPosition.y + cameraOffset.y,
                     gp.size.x, gp.size.y);
        ctx.font = "16px code";
        ctx.fillText(gp.name, gp.currPosition.x + cameraOffset.x - 
                     ctx.measureText(gp.name).width/2 + gp.size.x/2, 
                     gp.currPosition.y + cameraOffset.y - 20);
    }

    ctx.fillStyle = "#08f";
    ctx.fillRect(0, cH - 5, (player.stamina.value/player.stamina.max)*cW, 5);

    if (keyStates["tab"]) {
        const center = {x: cW/2, y: cH/2};
        const playerCount = GhostPlayer.instances.length + 1;
        const rowHeight = 30;
        ctx.fillStyle = "#0004";
        ctx.fillRect(center.x - 150, center.y - (playerCount*rowHeight)/2, 300, playerCount*rowHeight);
        const topAnchor = center.y - (playerCount * rowHeight)/2 + 22.5;
        const selfHeight = Math.round(Math.abs(player.position.y)/10);
        ctx.fillStyle = "#fff";
        ctx.font = "20px bungee";
        ctx.fillText(player.name + " (YOU)", center.x - 130, topAnchor);
        ctx.fillText(selfHeight.toString(), center.x + 130 - ctx.measureText(selfHeight.toString()).width, topAnchor);
        for (let i = 0; i < GhostPlayer.instances.length; i++) {
            const gpHeight = Math.round(Math.abs(GhostPlayer.instances[i].position.y)/10);
            ctx.fillText(GhostPlayer.instances[i].name, center.x - 130, topAnchor + (i * rowHeight) + rowHeight);
            ctx.fillText(gpHeight.toString(), center.x + 130 - ctx.measureText(gpHeight.toString()).width, topAnchor + (i * rowHeight) + rowHeight);
        }
    }

    if (settings.debug) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(40, 40, 200, 150);
        ctx.fillStyle = "white";
        ctx.font = "18px code";
        ctx.fillText(`Vel x: ${round(player.velocity.x, 2)}`, 50, 68);
        ctx.fillText(`Vel y: ${round(player.velocity.y, 2)}`, 50, 104);
        ctx.fillText(`Pos x: ${round(player.position.x, 2)}`, 50, 140);
        ctx.fillText(`Pos y: ${round(player.position.y, 2)}`, 50, 176);

        ctx.fillStyle = "#0008";
        ctx.fillRect(40, 230, 410, 200);
        ctx.fillStyle = "#fff";
        ctx.font = "18px code";
        ctx.fillText(`${selfID}`, 50, 260);

        var listofIDs = '';

        for (let gp of GhostPlayer.instances) {
            listofIDs += `${gp.uuid}\n`;
        }

        ctx.fillStyle = "#bbd";
        ctx.fillText(`${listofIDs}`, 50, 300);

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
    } else {
        ctx.fillStyle = "#0004";
        ctx.font = "62px bungee";
        ctx.fillText("LEADER:", 40, 80);
        ctx.fillStyle = inLead.color;
        ctx.fillRect(40, 120, 80, 80);
        ctx.font = "20px bungee";
        ctx.fillText(`${inLead.name + (inLead.name == player.name ? " (YOU)" : "")}`, 140, 140);
        // ctx.fillText(`${Math.round(Math.abs(inLead.position.x)/10)}`, 140, 170);
    }

    ctx.fillStyle = "#fff";
}

var lastDeltaTime = performance.now();

function loop(t) {
    deltaTime = (t - lastDeltaTime)/1000;
    deltaTime = Math.min(deltaTime, 0.016) * 120;
    lastDeltaTime = t;

    for (let gp of GhostPlayer.instances) {
        if (gp.position.x > inLead.position.x) {
            inLead = gp;
        }
    }
    if (player.position.x > inLead.position.x) {
        inLead = player;
    }

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
    GhostPlayer.instances = GhostPlayer.instances.filter(c => !c.toBeDestroyed);

    if (deltaTime) {
        if (!player) return;
        if (!cameraSubject) cameraSubject = player;
        player.stamina.max = 100 + (stats.stamina.level.current * 20);
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
start();

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left;
    currMousePos.y = ev.clientY - bb.top;
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
        case settings.controls.debug:
            toggleDebug();
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
        cW = canvas.width = window.innerWidth;
        cH = canvas.height = window.innerHeight;
        theaterBG.style.display = "none";
    }
}

window.addEventListener("resize", () => {
    cW = canvas.width = window.innerWidth;
    cH = canvas.height = window.innerHeight;
});

const coinsLastSaved = cookie.get("coins");
coins = coinsLastSaved ? Number.parseFloat(coinsLastSaved) : 0;
coinStatDisplay.textContent = coins.toLocaleString();




// Multiplayer handling below

var ws = new WebSocket("ws://localhost:3036");
// var ws = new WebSocket("https://zlww6zc0-3036.usw2.devtunnels.ms/");
var selfID;

let requestData = {
    "header": {
        "eventName": "requestJoin",
    },
    "body": {
        "name": player.name
    }
};

ws.onopen = () => {
    setTimeout(()=>{ws.send(JSON.stringify(requestData));}, 20);

    ws.addEventListener('message', (packet) => {
        const data = JSON.parse(packet.data);
        if (data.header.eventName == 'accept') {
            selfID = data.body.newID;
            for (let plr of data.body.players) {
                if (plr.uuid != selfID) {
                    new GhostPlayer(plr.uuid, plr.name);
                }
            }
        } else if (data.header.eventName == 'update') {
            for (let plr of data.body.players) {
                let ghostPlayerObject = GhostPlayer.getByUUID(plr.uuid);
                if (!ghostPlayerObject) {
                    new GhostPlayer(plr.uuid, plr.name);
                }
                ghostPlayerObject.position = plr.position;
            }
        } else if (data.header.eventName == 'playerDisconnected') {
            let disconnectedPlayer = GhostPlayer.getByUUID(data.body.uuid);
            disconnectedPlayer.toBeDestroyed = true;
        }
    });

    function fireUpdate() {
        if (!player || ws.readyState !== WebSocket.OPEN) return;
        const data = {
            "header": {
                "eventName": "player2Server"
            },
            "body": {
                "uuid": selfID,
                "position": player.position
            }
        };
        ws.send(JSON.stringify(data));
    }

    setInterval(fireUpdate, (1000/TARGET_UPS));
}
