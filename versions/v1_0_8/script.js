const titleElement = document.querySelector('.title');
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const STAMINA_RELOAD_SPEED = 0.25;

var settings = {
    controls: {
        left: "a",
        right: "d",
        down: "s",
        up: "w",
        jump: " ",
        dash: "shift"
    },
    gravity: true
};

var backgroundColor = "#202020";
var timeScale = 1;
var paused = false;
var currMouseX = 0;
var currMouseY = 0;
var player = null;
var canJump = true;
var keyStates = {};
var platforms = [];
var points = [];
var score = 0;
var yScroll = 0;

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

    set(x, y) {
        this.x = x;
        this.y = y;
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
        this.velocity.set(this.velocity.x, -this.jumpHeight);
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
    constructor(position, value) {
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        points.push(this);
    }
}

class Platform {
    constructor(position, size, color) {
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        platforms.push(this);
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

function reset() {
    rainItems = [];
    platforms = [];
    player = null;
    setup();
}

function pause() {
    paused = !paused;
}

function setup() {
    player = new Player(new Vector(250, 100), "#aaa");
    new Platform(new Vector(0, canvas.height), new Vector(canvas.width, canvas.height), "#000");
    new Platform(new Vector(-100, 0), new Vector(100, canvas.height), "#000");
    new Platform(new Vector(canvas.width, 0), new Vector(100, canvas.height), "#000");
    new Platform(new Vector(0, 310), new Vector(300, 20), "#444");
    new Platform(new Vector(0, 150), new Vector(300, 20), "#444");
    new Platform(new Vector(300, 230), new Vector(300, 20), "#444");
    new Platform(new Vector(500, 250), new Vector(20, 100), "#444");
    new Platform(new Vector(200, 330), new Vector(20, 200), "#444");
    new Platform(new Vector(600, 200), new Vector(300, 80), "#444");

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

function checkCollision(player, rect) {
    let playerNextPos = {
        x: player.position.x + player.velocity.x,
        y: player.position.y + player.velocity.y
    };

    let collisionX = playerNextPos.x + player.size.x > rect.position.x &&
                     playerNextPos.x < rect.position.x + rect.size.x;

    let collisionY = playerNextPos.y + player.size.y > rect.position.y &&
                     playerNextPos.y < rect.position.y + rect.size.y;

    if (collisionX && collisionY) {
        let overlapX = Math.min(
            playerNextPos.x + player.size.x - rect.position.x,
            rect.position.x + rect.size.x - playerNextPos.x
        );

        let overlapY = Math.min(
            playerNextPos.y + player.size.y - rect.position.y,
            rect.position.y + rect.size.y - playerNextPos.y
        );

        if (overlapX < overlapY) {
            if (player.velocity.x > 0) {
                player.position.x = rect.position.x - player.size.x;
            } else if (player.velocity.x < 0) {
                player.position.x = rect.position.x + rect.size.x;
            }
            player.velocity.x = 0;
        } else {
            if (player.velocity.y > 0) {
                player.position.y = rect.position.y - player.size.y;
            } else if (player.velocity.y < 0) {
                player.position.y = rect.position.y + rect.size.y;
            }
            player.velocity.y = 0;
            player.isGrounded = (player.velocity.y === 0 && player.position.y === rect.position.y - player.size.y);
        }

        return true;
    }

    return false;
}

var cameraOffset = new Vector();

function updatePhysics() {
    if (settings.gravity) player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration, 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration, 0);
    player.velocity.clamp(player.isDashing ? -50 : -10, player.isDashing ? 50 : 10, -20, 20);
    player.velocity.mul(1 - player.friction, 1);
    player.position.add(player.velocity.x, player.velocity.y);

    platforms.forEach(p => {
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


    // BELOW IS CODE FOR BACKGROUND CANVAS. NOT THE GAME.
    // rainItems.forEach(r => {
    //     r.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    //     r.velocity.clamp(-20, 20, -50, 20);
    //     r.position.add(r.velocity.x, r.velocity.y);

    //     if (r.position.x < 0 && r.velocity.x < 0) r.velocity.x *= -1 * r.restitution;
    //     if (r.position.x + r.size.x > fullscreenCanvas.width && r.velocity.x > 0) r.velocity.x *= -1 * r.restitution;
    //     if (r.position.y < 0 && r.velocity.y < 0) r.velocity.y *= -1 * r.restitution;
    //     if (r.position.y + r.size.y > fullscreenCanvas.height && r.velocity.y > 0) r.velocity.y *= -1 * r.restitution;
    // });
}

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.position.x, p.position.y, p.size.x, p.size.y);
    });

    // points.forEach(p => {
    //     ctx.fillStyle = "#ff0";
    //     ctx.beginPath();
    //     ctx.ellipse(p.position.x + 5, p.position.y + 5, 10, 10, 0, 0, Math.PI * 2);
    //     ctx.closePath();
    //     ctx.fill();
    // });

    let playerSizeSquashX = Math.max(0, player.velocity.y);

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x - (Math.max(-8, -playerSizeSquashX) / 2), 
                 player.position.y, 
                 player.size.x + Math.max(-8, -playerSizeSquashX), 
                 player.size.y);
}


var lastDeltaTime = performance.now();
var deltaTime;
var frameStep = 0;
function loop() {
    frameStep++;
    if (frameStep >= CONSOLE_CLEAR_THRESHOLD) {
        console.clear();
        frameStep = 0;
    }
    let currentDeltaTime = performance.now();
    deltaTime = (currentDeltaTime - lastDeltaTime);
    lastDeltaTime = currentDeltaTime;
    if (!paused) {
        yScroll = player.position.y;
        updatePhysics();
        draw();
        player.stamina.value += STAMINA_RELOAD_SPEED;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        titleElement.innerHTML = `Score: ${score} | Framerate: ${Math.floor(1000/deltaTime)}`;
    }
    requestAnimationFrame(loop);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    currMouseX = ev.layerX;
    currMouseY = ev.layerY;
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
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key.toLowerCase()] = false;
}