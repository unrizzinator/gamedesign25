const titleElement = document.querySelector('.title');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.2;
const PADDLE_WIDTH = 20;
var settings = {
    framerate: 120,
    controls: {
        left: "a",
        right: "d"
    }
};
var timeScale = 1;
var paused = false;
var currMouseX = 0;
var currMouseY = 0;
var player = null;
var jumpHeight = 7.5;
var canJump = true;
var keyStates = {};

var projectiles = [];


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
        this.acceleration = 1;
        this.friction = 0.1;
        this.grounded = false;
        this.color = color ? color : "#f00";
        this.size = new Vector(20, 20);
        this.offset = new Vector(5, 20);
    }

    jump() {
        this.velocity.set(this.velocity.x, -jumpHeight);
    }
}

class Projectile {
    constructor(position, size, color) {
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color ? color : "#000";
        projectiles.push(this);
    }
}

function updateSetting(s, v) {
    if (!v) return;
    if (settings[s]) {
        settings[s] = v;
    }
}

function reset() {
    platforms = [];
    player = null;
    setup();
}

function pause() {
    paused = !paused;
}

function setup() {
    player = new Player(new Vector(50, 50), "#00f");
    for (let i = 0; i < 10; i++) {
        let p = new Projectile(new Vector(Math.random() * (canvas.width - 50), 50), new Vector(20, 20), "#f00");
        p.velocity.set(0, -Math.random() * 10);
    }
}

function updatePhysics() {
    player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration, 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration, 0);
    player.velocity.clamp(-10, 10, -10, 15);
    player.velocity.mul(1 - player.friction, 1);
    player.position.add(player.velocity.x, player.velocity.y);
    player.position.clamp(0, canvas.width - player.size.x, 0, canvas.height - player.size.y);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x, player.position.y, player.size.x, player.size.y);

    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.position.x, p.position.y, p.size.x, p.size.y);
    })

}

function loop() {
    setTimeout(() => {
        if (!paused) {
            updatePhysics();
            draw();
        }
        loop();
    }, (1000/settings.framerate) * timeScale);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    currMouseX = ev.layerX;
    currMouseY = ev.layerY;
}

document.onkeydown = (ev) => {
    keyStates[ev.key] = true;
    if (ev.key == " ") {
        if (!canJump) return;
        player.jump();
        canJump = false;
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key] = false;
    if (ev.key == " ") {
        canJump = true;
    }
}