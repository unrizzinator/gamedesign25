const titleElement = document.querySelector('.title');
const canvas = document.querySelector('canvas');
const editor = document.querySelector('#gameEditor');
const ctx = canvas.getContext('2d');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const STAMINA_RELOAD_SPEED = 0.25;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const EDITOR_GRID_SIZE = 20;

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
        editor:  "e"
    },
    gravity: true,
    editing: false
};

var backgroundColor = "#101010";
var timeScale = 1;
var paused = false;
var currMouseX = 0;
var currMouseY = 0;
var player = null;
var canJump = true;
var keyStates = {};
var score = 0;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

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
        this.x -= other.x;
        this.y -= other.y;
    }

    subVector(other) {
        this.x -= other.x;
        this.y -= other.y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    }

    clamp(minX, maxX, minY, maxY) {
        this.x = Math.max(minX, Math.min(this.x, maxX));
        this.y = Math.max(minY, Math.min(this.y, maxY));
    }

    clampX(minX, maxX) {
        this.x = Math.max(minX, Math.min(this.x, maxX));
    }

    clampY(minY, maxY) {
        this.y = Math.max(minY, Math.min(this.y, maxY));
    }

    mul(scalarX, scalarY) {
        this.x *= scalarX;
        this.y *= scalarY;
    }
}

class Player {
    constructor(position, color) {
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
    }

    jump() {
        if (!this.isGrounded) return;
        this.isGrounded = false;
        this.velocity.y > 0 ? this.velocity.set(this.velocity.x, -this.jumpHeight) : 
                              this.velocity.add(0, -this.jumpHeight);
    }

    dash() {
        if (this.stamina.value < DASH_STAMINA_COST || this.isDashing || this.velocity.x === 0) return;
        this.isDashing = true;
        this.stamina.value -= DASH_STAMINA_COST;
        this.velocity.x *= 10;
        this.velocity.clampX(-25, 25);
        setTimeout(() => {this.isDashing = false}, 200);
    }
}

class Point {

    static instances = [];

    constructor(position, value) {
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        points.push(this);
    }

    static clearInstances() {
        Point.instances = [];
    }
}

class Dialog {

    static instances = [];

    constructor(text, color, position) {
        if (!text) return console.error("No text provided.");
        this.text = text;
        this.color = color ? color : "#fff";
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
        Dialog.instances.push(this);
    }

    static clearInstances() {
        Dialog.instances = [];
    }
}

class Platform {

    static instances = [];

    constructor(position, size, color) {
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        Platform.instances.push(this);
    }

    static clearInstances() {
        Platform.instances = [];
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
        Platform.instances.push(this);
    }

    static clearInstances() {
        Bouncepad.instances = [];
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
    settings.editing = !settings.editing;
    if (settings.editing) loadEditor();
    else unloadEditor();
}

function loadEditor() {
    editor.style.display = "flex";
}

function unloadEditor() {
    editor.style.display = "none";
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
    player = new Player(new Vector(240, 100), "#09f");
    
    new Platform(new Vector(0, canvas.height), new Vector(canvas.width * 2, canvas.height), "#222");
    new Platform(new Vector(-100, 0), new Vector(100, canvas.height * 2), "#fff");
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
    new Bouncepad(new Vector(1280, 580), 50000, new Vector(60, 20), "#f80");

    new Dialog("• Collision system fixed", "#8888", new Vector(30, 20));
    new Dialog("• Smooth cam", "#8888", new Vector(30, 50));
    new Dialog("• Player squish physics", "#8888", new Vector(30, 80));
    new Dialog("• Bigger map", "#8888", new Vector(30, 110));
    new Dialog("• Updated Vector, Player, Rectangle class", "#8888", new Vector(30, 140));
    new Dialog("• Added keybinds", "#8888", new Vector(30, 170));
    new Dialog("• FPS counter", "#8888", new Vector(30, 200));
    new Dialog("• Added Dialog class", "#8888", new Vector(30, 230));
    new Dialog("• More", "#8888", new Vector(30, 260));

    // for (let i = 0; i < 10; i++) {
    //     new Point(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), 1);
    // }
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function drawGraph() {
    ctx.fillStyle = "#444";
    for (let _x = 0; _x < Math.floor(canvas.width + 50 / EDITOR_GRID_SIZE); _x++) {
        let offset = cameraOffset.x % EDITOR_GRID_SIZE;
        ctx.fillRect((_x * EDITOR_GRID_SIZE) + offset, 0, 1, canvas.height);
    }
    for (let _y = 0; _y < Math.floor(canvas.height / EDITOR_GRID_SIZE); _y++) {
        let offset = cameraOffset.y % EDITOR_GRID_SIZE;
        ctx.fillRect(0, (_y * EDITOR_GRID_SIZE) + offset, canvas.width, 1);
    }
}

// Function below only checks collisions between the player and the environment at the moment.
// Note: Collision system upgraded by AI.
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
        // Calculate the overlap depth
        let overlapRight = nextPos.x + player.size.x - rect.position.x; // Right side
        let overlapLeft = rect.position.x + rect.size.x - nextPos.x;    // Left side
        let overlapDown = nextPos.y + player.size.y - rect.position.y;  // Bottom side
        let overlapUp = rect.position.y + rect.size.y - nextPos.y;      // Top side

        // Find the smallest overlap, but factor in movement direction
        let smallestOverlap = Math.min(overlapRight, overlapLeft, overlapDown, overlapUp);

        if (smallestOverlap === overlapRight && player.velocity.x > 0) {
            // Colliding on the right
            player.position.x = rect.position.x - player.size.x;
            player.velocity.x = 0;
        } 
        else if (smallestOverlap === overlapLeft && player.velocity.x < 0) {
            // Colliding on the left
            player.position.x = rect.position.x + rect.size.x;
            player.velocity.x = 0;
        } 
        else if (smallestOverlap === overlapDown && player.velocity.y > 0) {
            // Landing on the floor
            player.position.y = rect.position.y - player.size.y;
            if (rect instanceof Platform) {
                player.velocity.y = 0;
            } else if(rect instanceof Bouncepad) {
                player.velocity.y = -rect.power;
            }
            player.isGrounded = true;
        } 
        else if (smallestOverlap === overlapUp && player.velocity.y < 0) {
            // Hitting the ceiling
            player.position.y = rect.position.y + rect.size.y;
            player.velocity.y = 0;
        }

        return true;
    }

    return false;
}


var cameraOffset = new Vector();

function updatePhysics() {
    if (player.position.y + player.velocity.y > 2000) reset();
    if (settings.gravity) player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER), 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration * (player.isGrounded?1:AIR_STRAFING_SPEED_MULTIPLIER), 0);
    player.velocity.clamp(player.isDashing ? -50 : -10, player.isDashing ? 50 : 10, -30, 20);
    player.velocity.mul(1 - player.friction, 1);
    player.position.add(player.velocity.x, player.velocity.y);

    Platform.instances.forEach(p => {
        checkCollision(player, p)
    });

    // points.forEach(p => {
    //     const playerPos = player.position;
    //     const pointPos = p.position;
    //     const magnitude = Math.sqrt(Math.pow(Math.abs(playerPos.x - pointPos.x), 2) + Math.pow(Math.abs(playerPos.y - pointPos.y), 2));
        
    //     if (magnitude < player.size.x - 10) {
    //         // Player collected point
    //         score += p.value;
    //         points.splice(points.indexOf(p), 1);
    //     }
    // });
}

var currCursorPos = new Vector();

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (settings.editing) drawGraph();

    Platform.instances.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.position.x + cameraOffset.x, p.position.y + cameraOffset.y, p.size.x, p.size.y);
    });

    Dialog.instances.forEach(d => {
        ctx.fillStyle = d.color;
        ctx.font = "24px Arial";
        ctx.fillText(d.text, d.position.x + cameraOffset.x, d.position.y + cameraOffset.y);
    });

    // points.forEach(p => {
    //     ctx.fillStyle = "#ff0";
    //     ctx.beginPath();
    //     ctx.ellipse(p.position.x + 5, p.position.y + 5, 10, 10, 0, 0, Math.PI * 2);
    //     ctx.closePath();
    //     ctx.fill();
    // });

    let playerSizeSquashX = Math.max(0, player.velocity.y);
    let playerSizeSquashY = player.velocity.x > 10 ? Math.abs(player.velocity.x) : 0;

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x - (Math.max(-8, -playerSizeSquashX) / 2) + cameraOffset.x, 
                 player.position.y - (Math.max(-8, -playerSizeSquashY) / 2) + cameraOffset.y, 
                 player.size.x + Math.max(-8, -playerSizeSquashX), 
                 player.size.y + Math.max(-8, -playerSizeSquashY));

    let offsetX = cameraOffset.x % EDITOR_GRID_SIZE;
    let offsetY = cameraOffset.y % EDITOR_GRID_SIZE;

    if (!settings.editing) return;

    // console.log(currMouseX + "\n" + currMouseY);

    ctx.strokeStyle = "orange";
    // ctx.strokeRect(Math.floor((currMouseX + canvas.width/2 - EDITOR_GRID_SIZE/2) / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE + offsetX /* + offsetX */, 
    //                Math.floor((currMouseY + canvas.height/2) / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE + EDITOR_GRID_SIZE/2 /* + offsetY */,
    //                EDITOR_GRID_SIZE,
    //                EDITOR_GRID_SIZE);
}


var lastDeltaTime = performance.now();
var deltaTime;
var frameStep = 0;

function loop() {
    // frameStep++;
    if (frameStep >= CONSOLE_CLEAR_THRESHOLD) {
        console.clear();
        frameStep = 0;
    }
    let currentDeltaTime = performance.now();
    deltaTime = (currentDeltaTime - lastDeltaTime);
    lastDeltaTime = currentDeltaTime;

    if (!paused) {
        player.stamina.value += STAMINA_RELOAD_SPEED;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        var targetCameraOffset = new Vector(
            -(player.position.x + player.size.x / 2) + canvas.width / 2,
            -(player.position.y + player.size.y / 2) + canvas.height / 2);
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * 0.1;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * 0.1;

        updatePhysics();
        draw();

        titleElement.innerHTML = `Score: ${score} | Framerate: ${Math.floor(1000/deltaTime)}`;
    }
    requestAnimationFrame(loop);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMouseX = ev.clientX - bb.left - canvas.width/2;
    currMouseY = ev.clientY - bb.top - canvas.height/2;
}

document.onkeydown = (ev) => {
    ev.preventDefault();
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
        default:
            null;
            break;
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key.toLowerCase()] = false;
}