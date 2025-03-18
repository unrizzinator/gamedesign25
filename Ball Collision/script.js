const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SCALE = 0.1;

var settings = {
    controls: {
        left:    "a",
        right:   "d",
        down:    "s",
        up:      "w",
        jump:    " "
    }
};

let cW = canvas.width = 1200;
let cH = canvas.height = 700;

let player;
var keyStates = {};

const fps = 170;
let lastTime = 0;
let targetFrameTime = 1000 / fps;

let allSphericalObjects = [];

async function init() {
    if (!navigator.gpu) {
        throw Error("WebGPU not supported.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("Couldn't request WebGPU adapter.");
    }

    const device = await adapter.requestDevice();
    console.log(device);
}

init()

class Player {
    constructor(position, radius, color) {
        this.position = position ? position : new Vector(cW/2, cH/2);
        this.velocity = new Vector();
        this.radius = radius ? radius : 10;
        this.color = color ? color : "#f00";
        this.density = 500;
        this.mass = (Math.PI * this.radius)**2 * this.density;
        this.restitution = 0;
        this.acceleration = 0.5;
        this.friction = 0.01;
        player = this;
        allSphericalObjects.push(this);
    }

    update() {
        this.velocity = this.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SCALE);
        if (keyStates[settings.controls.left]) this.velocity = this.velocity.add(-this.acceleration, 0);
        if (keyStates[settings.controls.right]) this.velocity = this.velocity.add(this.acceleration, 0);
        // if (keyStates[settings.controls.down]) this.velocity = this.velocity.add(0, this.acceleration);
        // if (keyStates[settings.controls.up]) this.velocity = this.velocity.add(0, -this.acceleration);
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
        this.velocity = this.velocity.clamp(-10, 10, -25, 10);
        this.velocity = this.velocity.mul(1 - this.friction, 1);
        this.position = this.position.addVector(this.velocity);
        if (this.position.y + this.radius > cH & this.velocity.y > 0) {
            this.velocity.y *= -1 * this.restitution;
            this.position.y = cH - this.radius;
        }
        if (this.position.y - this.radius < 0 & this.velocity.y < 0) {
            this.velocity.y = 0;
            this.position.y = this.radius;
        }
        if (this.position.x + this.radius > cW & this.velocity.x > 0) {
            this.velocity.x *= -1 * this.restitution;
            this.position.x = cW - this.radius;
        }
        if (this.position.x - this.radius < 0 & this.velocity.x < 0) {
            this.velocity.x *= -1 * this.restitution;
            this.position.x = this.radius;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.position.x, this.position.y, this.radius, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        // this.velocity.displayUnit(this.position, "#00f", 40);
    }

    jump() {
        this.velocity = new Vector(this.velocity.x, -7);
    }
}

class Ball {
    
    static balls = [];
    
    constructor(position, radius, color) {
        this.position = position ? position : new Vector((Math.random() * (cW - 100)) + 50, (Math.random() * (cH - 100)) + 50);
        this.velocity = new Vector();
        this.radius = radius ? radius : 10;
        this.color = color ? color : "black";
        this.density = 1;
        this.mass = (Math.PI * this.radius)**2 * this.density;
        this.restitution = 0.6;
        this.friction = 0.01;
        Ball.balls.push(this);
        allSphericalObjects.push(this);
    }

    static destroyAllInstances() {
        for (let i = 0; i < Ball.balls.length; i++) {
            let ball = Ball.balls[i];
            ball.toBeObliterated = true;
        }
    }

    destroy() {
        this.toBeObliterated = true;
    }

    update() {
        this.velocity = this.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SCALE);
        this.velocity = this.velocity.mul(1 - this.friction, 1);
        this.position = this.position.addVector(this.velocity);
        if (this.position.y + this.radius > cH & this.velocity.y > 0) {
            this.velocity.y *= -1 * this.restitution;
            this.position.y = cH - this.radius;
        }
        if (this.position.y - this.radius < 0 & this.velocity.y < 0) {
            this.velocity.y = 0;
            this.position.y = this.radius;
        }
        if (this.position.x + this.radius > cW & this.velocity.x > 0) {
            this.velocity.x *= -1;
            this.position.x = cW - this.radius;
        }
        if (this.position.x - this.radius < 0 & this.velocity.x < 0) {
            this.velocity.x *= -1;
            this.position.x = this.radius;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.position.x, this.position.y, this.radius, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();        
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
        // this.velocity.displayUnit(this.position, "#00f", 50);
    }
}

function ballCollisionCheck(b1, b2) {
    if (!b1 || !b2) return null;
    return (new Vector(b1.position.x - b2.position.x, b1.position.y - b2.position.y).magnitude() <= b1.radius + b2.radius);
}

function ballPenetrationResolution(b1, b2) {
    let distance = new Vector(b1.position.x, b1.position.y).subVector(b2.position);
    let depth = b1.radius + b2.radius - distance.magnitude();
    let resolution = distance.unit().mul(depth/2, depth/2);
    let totalMass = b1.mass + b2.mass;
    let massRatio = {
        b1: b1.mass/totalMass,
        b2: b2.mass/totalMass
    }
    b1.velocity = b1.velocity.addVector(resolution.mul(massRatio.b2, massRatio.b2));
    b2.velocity = b2.velocity.addVector(resolution.mul(-1 * b2.restitution, -1 * b2.restitution).mul(massRatio.b1, massRatio.b1));
}

function spawnBalls() {
    for (let i = 0; i < 15; i++) {
        new Ball(new Vector(Math.round(Math.random() * (cW - 100)) + 50, Math.round(Math.random() * 80) + 50), Math.round(Math.random() * 20) + 40, "#fff");
    }
}

function setup() {
    player = new Player(null, 50, "#f00");
    spawnBalls();
}

function update(t) {
    if (t - lastTime < targetFrameTime) {
        requestAnimationFrame(update);
        return;
    }
    lastTime = t;
    ctx.clearRect(0, 0, cW, cH);
    Ball.balls = Ball.balls.filter(c => !c.toBeObliterated);
    for (let i = 0; i < Ball.balls.length; i++) {
        let ball = Ball.balls[i];
        ball.update();
        ball.draw();
        // ball.position.connect(player.position, "#fff4");
    }
    for (let i = 0; i < allSphericalObjects.length; i++) { // Check for collisions between any spherical objects
        for (let j = i + 1; j < allSphericalObjects.length; j++) {
            // allSphericalObjects[i].position.connect(allSphericalObjects[j].position);
            if (ballCollisionCheck(allSphericalObjects[i], allSphericalObjects[j])) {
                ballPenetrationResolution(allSphericalObjects[i], allSphericalObjects[j]);
            }
        }
    }
    if (player) {
        player.update();
        player.draw();
    }

    requestAnimationFrame(update);
}

document.onkeydown = (ev) => {
    keyStates[ev.key.toLowerCase()] = true;
    switch (ev.key.toLowerCase()) {
        case "r":
            player.position = new Vector(cW/2, cH/2);
            player.velocity = new Vector();
            break;
        case "f":
            spawnBalls();
            break;
        case settings.controls.jump:
            player.jump()
            break;
        default:
            break;
    }
}

document.onkeyup = (ev) => {
    keyStates[ev.key.toLowerCase()] = false;
}

setup();
requestAnimationFrame(update);