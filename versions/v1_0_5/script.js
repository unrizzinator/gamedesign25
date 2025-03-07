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
var platforms = [];
var testPlatform = null;

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

class Test {
    constructor(position, size, color) {
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
        this.velocity = new Vector();
        this.size = size ? size : new Vector(100, 20);
        this.color = color ? color : "#000";
        this.rotation = 0;
        testPlatform = this;
    }

    spin() {
        let i = 0;
        function loop() {
            i++;
            setTimeout(() => {
                this.rotation++;
                if (i < 360) {
                    loop();
                }
            }, 2);
        }
    }
}

new Test(new Vector(canvas.width/2, canvas.height/2), new Vector(50, 20));

class Player {
    constructor(position, color) {
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
        this.velocity = new Vector();
        this.acceleration = .5;
        this.friction = 0.05;
        this.grounded = false;
        this.color = color ? color : "#f00";
        this.size = new Vector(20, 20);
        this.offset = new Vector(5, 20);
    }

    jump() {
        this.velocity.set(this.velocity.x, -jumpHeight);
    }
}

class Platform {
    constructor(position, size, color) {
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color ? color : "#444";
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
    player = new Player(new Vector(250, 100), "#000");
}

function toRadians(deg) {
    return (deg * Math.PI) / 180;
}

function updatePhysics() {
    player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration, 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration, 0);
    player.velocity.clamp(-10, 10, -10, 15);
    player.velocity.mul(1 - player.friction, 1);
    player.position.add(player.velocity.x, player.velocity.y);
    player.position.clamp(0, canvas.width - player.size.x, 0, canvas.height - player.size.y);//penits
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = testPlatform.color;
    ctx.rotate(toRadians(45));
    ctx.fillRect(testPlatform.position.x, testPlatform.position.y, testPlatform.size.x, testPlatform.size.y);
    ctx.rotate(toRadians(-45));

    // Draw player
    ctx.fillStyle = player.color;
    // ctx.fillRect(player.position.x, player.position.y, player.size.x, player.size.y);
    ctx.beginPath();
    ctx.ellipse(player.position.x + (player.size.x / 2), player.position.y + (player.size.y / 2), player.size.x/2, player.size.y/2, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

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