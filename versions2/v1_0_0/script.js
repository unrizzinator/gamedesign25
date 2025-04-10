const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const DASH_STAMINA_COST = 100;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const BASE_TIMELINE_FRAMERATE = 60;

let cW = canvas.width = GAME_WIDTH;
let cH = canvas.height = GAME_HEIGHT;

var backgroundColor = "#101010";

var settings = {
    controls: {
        left:    "a",
        right:   "d",
        down:    "s",
        up:      "w",
        jump:    " ",
        dash:    "shift",
        reset:   "r",
    }
};

var keyStates = [];

function round(n, p) {
    return Math.round(n * (10**p)) / (10**p);
}

class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }

    add(x, y) {
        this.x += x;
        this.y += y;
    }

    addVector(other) {
        this.x += other.x;
        this.y += other.y;
    }

    sub(x, y) {
        this.x -= x;
        this.y -= y;
    }

    subVector(other) {
        this.x -= other.x;
        this.y -= other.y;
    }

    abs() {
        this.x = Math.abs(this.x)
        this.y = Math.abs(this.y)
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
        this.x *= scalarX;
        this.y *= scalarY;
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

class Platform {

    static instances = [];

    constructor(position, size, color, velocity, zIndex) {
        this.position = position ? position : new Vector();
        this.velocity = velocity ? velocity : new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = zIndex ? zIndex : 1;
        Platform.instances.push(this);
        game.objects.push(this);
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
        game.objects.push(this);
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

let spawnpoint = new Vector(0, -500);

class Player {
    constructor(position, color) {
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

class Game {
    player = null;
    objects = [];

    constructor() {
        this.player = new Player();
    }
}

let game = new Game();
let player = game.player;

var cameraOffset = new Vector();
var currMousePos = new Vector();

function cleanup() {
    Bouncepad.clearInstances();
    Platform.clearInstances();
}

function reset() {
    cleanup();
    setup();
}

function setup() {
    player = new Player(spawnpoint.add(-10, -20), "#fff");
    cameraSubject = player;

    new Platform(new Vector(-(Number.MAX_SAFE_INTEGER/2), 500), new Vector(Number.MAX_SAFE_INTEGER, cH), "#fff", null, 2);
    new Platform(new Vector(-1000, -500), new Vector(500, 500), "#fff");

    game.objects = game.objects.sort((a, b) => a.zIndex - b.zIndex);
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
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
    player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER * deltaTime * (settings.moonGravity ? 0.166 : 1));
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER) * deltaTime, 0);
    if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;
    player.velocity.clamp((player.isDashing ? -50 : -10), (player.isDashing ? 50 : 10), -20, 10);
    player.velocity.mul(1 - player.friction * deltaTime, 1);
    player.position.add(player.velocity.x * deltaTime, player.velocity.y * deltaTime);

    for (let p of Platform.instances) {
        p.position.addVector(p.velocity);
        if (p.velocity.y != 0 && p.position.y > 0) {
            p.destroy();
        }
        if (p.velocity.x != 0 && ((p.position.x < -300 && p.velocity.x < 0) || (p.position.x + p.size.x > 300 && p.velocity.x > 0))) {
            p.velocity.x = -p.velocity.x;
        }
        checkCollision(player, p);
    }
}

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cW, cH);

    for (let i = game.objects.length - 1; i > 0; i--) {
        let o = game.objects[i];
        if (o instanceof Platform) {
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
}

var lastDeltaTime = performance.now();

function loop(t) {
    deltaTime = (t - lastDeltaTime)/1000;
    deltaTime = Math.min(deltaTime, 0.016) * 120;
    lastDeltaTime = t;

    game.objects = game.objects.filter(o => !o.toBeDestroyed);

    if (deltaTime) {
        if (!player) return;
        if (!cameraSubject) cameraSubject = player;
        player.stamina.value += 1 * deltaTime;
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

setup();
loop();

canvas.ondblclick = () => {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
        cW = canvas.width = window.screen.width;
        cH = canvas.height = window.screen.height;
    } else {
        document.exitFullscreen();
    }
}

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left - cW/2;
    currMousePos.y = ev.clientY - bb.top - cH/2;
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