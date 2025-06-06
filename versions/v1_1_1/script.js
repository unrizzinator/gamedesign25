const titleElement = document.querySelector('.title');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const STAMINA_RELOAD_SPEED = 0.25;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.7;
const BASE_TIMELINE_FRAMERATE = 60;

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
        debug: "\\"
    },
    gravity: true,
    debug: false
};

var editor = {
    panel: document.querySelector('#gameEditor'),
    editing: false,
    modes: ["select", "draw", "move"],
    mode: 0,
    activeObject: null,
    gridSize: 20,
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
    shift(d) {
        switch (d) {
            case 0:
                this.activeObject.position.x -= 20;
                break;
            case 1:
                this.activeObject.position.x += 20;
                break;
            case 2:
                this.activeObject.position.y -= 20;
                break;
            case 3:
                this.activeObject.position.y += 20;
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
    changeMode() {
        this.mode++;
        if (this.mode > this.modes.length - 1) this.mode = 0;
        this.clearActiveObject();
        this.panel.querySelector('[editor-mode]').textContent = `Mode (${this.modes[this.mode]})`;
    },
    startDraw() {
        if (this.mode != 1) return;
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
var score = 0;
var nextID = 0;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

var objects = [];

function getObjectById(n) {
    for (let o of objects) {
        if (o.id == n) return o;
    }
    return null;
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
}

class Player {
    constructor(position, color) {
        this.id = nextID;
        this.type = "Player";
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
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
        this.velocity.x *= 5;
        this.velocity.clampX(-25, 25);
        setTimeout(() => {this.isDashing = false}, 200);
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
        Point.instances.splice(Point.instances.indexOf(this), 1);
        objects.splice(objects.indexOf(this), 1);
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
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
        Dialog.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        Dialog.instances = [];
    }

    destroy() {
        Dialog.instances.splice(Dialog.instances.indexOf(this), 1);
        objects.splice(objects.indexOf(this), 1);
    }
}

class Platform {

    static instances = [];

    constructor(position, size, color) {
        this.id = nextID;
        this.type = "Platform";
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
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
        Platform.instances.splice(Platform.instances.indexOf(this), 1);
        objects.splice(objects.indexOf(this), 1);
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
        Bouncepad.instances.splice(Bouncepad.instances.indexOf(this), 1);
        objects.splice(objects.indexOf(this), 1);
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
        pc = pc.add(canvas.width/2, canvas.height/2);
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
    Platform.clearInstances();
    Dialog.clearInstances();
    Point.clearInstances();
    player = null;
    setup();
}

function pause() {
    paused = !paused;
}

function setup() {
    player = new Player(new Vector(240, 100), "#08f");
    
    new Platform(new Vector(-canvas.width * 5, canvas.height), new Vector(canvas.width * 7, canvas.height), "#202020");
    new Platform(new Vector(-100, 0), new Vector(100, 460), "#fff");
    new Platform(new Vector(-100, 480), new Vector(100, (canvas.height * 2) - 480), "#fff");
    new Platform(new Vector(canvas.width * 2, 0), new Vector(100, canvas.height * 2), "#fff");

    new Platform(new Vector(600, 0), new Vector(400, 460), "#303030");
    new Platform(new Vector(600, 480), new Vector(400, 120), "#fff");
    new Platform(new Vector(1000, 500), new Vector(60, 20), "#fff");
    new Platform(new Vector(1000, 560), new Vector(200, 20), "#fff");
    new Platform(new Vector(1200, 560), new Vector(20, 40), "#fff");

    new Platform(new Vector(20, 320), new Vector(280, 20), "#fff");
    new Platform(new Vector(20, 0), new Vector(20, 280), "#fff");
    new Platform(new Vector(20, 280), new Vector(100, 20), "#fff");
    new Platform(new Vector(300, 220), new Vector(300, 20), "#fff");
    new Platform(new Vector(500, 260), new Vector(20, 100), "#fff");
    new Platform(new Vector(200, 320), new Vector(20, 200), "#fff");

    new Platform(new Vector(300, 380), new Vector(100, 20), "#fff");
    new Platform(new Vector(400, 480), new Vector(180, 20), "#fff");
    new Platform(new Vector(300, 580), new Vector(100, 20), "#fff");
    new Platform(new Vector(500, 120), new Vector(100, 20), "#fff");
    new Platform(new Vector(540, 0), new Vector(60, 20), "#fff");

    new Bouncepad(new Vector(0, 320), 12, new Vector(20, 20), "#69ff69");
    new Bouncepad(new Vector(1220, 580), 20, new Vector(60, 20), "#69ff69");
    new Bouncepad(new Vector(1280, 580), 50000, new Vector(60, 20), "#ff8800");

    new Dialog("• Collision system fixed", "#88888888", new Vector(50, 20));
    new Dialog("• Smooth cam", "#88888888", new Vector(50, 50));
    new Dialog("• Player squish physics", "#88888888", new Vector(50, 80));
    new Dialog("• Bigger map", "#88888888", new Vector(50, 110));
    new Dialog("• Updated Vector, Player, Rectangle class", "#88888888", new Vector(50, 140));
    new Dialog("• Added keybinds", "#88888888", new Vector(50, 170));
    new Dialog("• FPS counter", "#88888888", new Vector(50, 200));
    new Dialog("• Added Dialog class", "#88888888", new Vector(50, 230));
    new Dialog("• More", "#88888888", new Vector(50, 260));

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
    ctx.fillStyle = "#404040";
    for (let _x = 0; _x < Math.floor(canvas.width + 50 / editor.gridSize); _x++) {
        let offset = cameraOffset.x % editor.gridSize;
        ctx.fillRect((_x * editor.gridSize) + offset, 0, 1, canvas.height);
    }
    for (let _y = 0; _y < Math.floor(canvas.height / editor.gridSize); _y++) {
        let offset = cameraOffset.y % editor.gridSize;
        ctx.fillRect(0, (_y * editor.gridSize) + offset, canvas.width, 1);
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

    Platform.instances.forEach(p => {
        checkCollision(player, p);
    });
}

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (editor.editing) drawGraph();

    Platform.instances.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.position.x + cameraOffset.x, p.position.y + cameraOffset.y, p.size.x, p.size.y);
    });

    Dialog.instances.forEach(d => {
        ctx.fillStyle = d.color;
        ctx.font = "24px Arial";
        ctx.fillText(d.text, d.position.x + cameraOffset.x, d.position.y + cameraOffset.y);
    });

    let playerSizeSquashX = Math.max(0, player.velocity.y);
    let playerSizeSquashY = Math.abs(player.velocity.x) > 10 ? Math.abs(player.velocity.x) : 0;

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x - (Math.max(-8, -playerSizeSquashX) / 2) + cameraOffset.x, 
                 player.position.y - (Math.max(-8, -playerSizeSquashY) / 2) + cameraOffset.y, 
                 player.size.x + Math.max(-8, -playerSizeSquashX), 
                 player.size.y + Math.max(-8, -playerSizeSquashY));

    let offsetX = cameraOffset.x % editor.gridSize;
    let offsetY = cameraOffset.y % editor.gridSize;

    ctx.fillStyle = "#08f";
    ctx.fillRect(0, canvas.height - 5, (player.stamina.value/player.stamina.max)*canvas.width, 5);

    if (settings.debug) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(40, 40, 200, 80);
        ctx.fillStyle = "white";
        ctx.fillText(`Vel x: ${player.velocity.x.toPrecision(4)}`, 50, 68);
        ctx.fillText(`Vel y: ${player.velocity.y.toPrecision(4)}`, 50, 104);

        let centerOfPlayer = player.position.addVector(player.size.mul(0.5, 0.5));
        ctx.lineWidth = 3;
        new Vector(0, -1).normal().displayUnit(centerOfPlayer, "#f00", 120);
        player.velocity.normal().displayUnit(centerOfPlayer, "#08f", 50);
        player.velocity.displayUnit(centerOfPlayer, "#6f6", 100);
        player.velocity.display(centerOfPlayer, "#f88", 10);
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

    // ctx.lineWidth = 2;
    // ctx.strokeStyle = "orange";
    // ctx.strokeRect(Math.floor((currMousePos.x - offsetX + canvas.width/2) / editor.gridSize) * editor.gridSize + offsetX, 
    //                Math.floor((currMousePos.y - offsetY + canvas.height/2) / editor.gridSize) * editor.gridSize + offsetY,
    //                editor.gridSize,
    //                editor.gridSize);

    ctx.fillStyle = "#fff";
}

var lastDeltaTime = performance.now();

function loop(t) {
    deltaTime = (t - lastDeltaTime)/1000;
    deltaTime = Math.min(deltaTime, 0.016) * 120;
    lastDeltaTime = t;

    if (!paused && deltaTime) {
        player.stamina.value += STAMINA_RELOAD_SPEED;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        var targetCameraOffset = new Vector(
            -(player.position.x + player.size.x / 2) + canvas.width / 2,
            -(player.position.y + player.size.y / 2) + canvas.height / 2);
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * 0.1;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * 0.1;

        updatePhysics(deltaTime);
        draw();

        titleElement.innerHTML = `Score: ${score}`;
    }
    requestAnimationFrame(loop);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left - canvas.width/2;
    currMousePos.y = ev.clientY - bb.top - canvas.height/2;
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
                
                break;
            default:
                break;
        }
    }
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
        default:
            null;
            break;
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key.toLowerCase()] = false;
}