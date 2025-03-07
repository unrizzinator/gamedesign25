const fullscreenCanvas = document.querySelector('canvas#fsc');
const ctx2 = fullscreenCanvas.getContext('2d');
const titleElement = document.querySelector('.title');
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const DWAYNE = document.querySelector('img#dwayne');
const DWAYNE_SMALL = document.querySelector('img#dwaynesmall');
const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.2;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;

var rainItems = [];

var settings = {
    framerate: 120,
    controls: {
        left: "a",
        right: "d",
        down: "s",
        up: "w"
    }
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

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
fullscreenCanvas.width = window.innerWidth;
fullscreenCanvas.height = window.innerHeight;

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

class Bruh {
    constructor(img, restitution) {
        this.position = new Vector(Math.random() < 0.5 ? 0 : fullscreenCanvas.width - 100, 20);
        this.velocity = new Vector(this.position.x < fullscreenCanvas.width / 2 ? 20 * Math.random() : -20  * Math.random(), 0);
        this.rotation = toRad(Math.random() * 360);
        this.size = new Vector(100, 100);
        this.image = img;
        this.restitution = restitution;
        rainItems.push(this);
    }
}

// (function(){
//     let i = 0;
//     let __dwayneLoop = setInterval(() => {
//         i++;
//         new Bruh(DWAYNE_SMALL, 1.5);
//         if (i > 50) {
//             clearInterval(__dwayneLoop);
//         }
//     }, 200);
// })();

class Player {
    constructor(position, color) {
        this.position = position ? position : new Vector(canvas.width / 2, canvas.height / 2);
        this.velocity = new Vector();
        this.jumpHeight = 10;
        this.acceleration = .6;
        this.friction = 0.02;
        this.grounded = false;
        this.color = color ? color : "#f00";
        this.size = new Vector(20, 20);
        this.offset = new Vector(5, 20);
    }

    jump() {
        this.velocity.set(this.velocity.x, -this.jumpHeight);
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
    player = new Player(new Vector(250, 100), "#0bf");
    new Platform(new Vector(300, 70), new Vector(300, 20), "#602060");
    new Platform(new Vector(0, 310), new Vector(300, 20), "#606060");
    new Platform(new Vector(0, 150), new Vector(300, 20), "#606060");
    new Platform(new Vector(300, 230), new Vector(300, 20), "#606060");
    new Platform(new Vector(500, 250), new Vector(20, 100), "#606060");
    new Platform(new Vector(200, 330), new Vector(20, 200), "#606060");
    new Platform(new Vector(600, 200), new Vector(300, 80), "#606060");
    new Platform(new Vector(0, canvas.height - 20), new Vector(canvas.width, 20), "#303030");

    // for (let i = 0; i < 10; i++) {
    //     new Point(new Vector(Math.random() * canvas.width, Math.random() * canvas.height), 1);
    // }
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function checkCollision(obj1, obj2) {
    return {
        x: obj1.position.x + obj1.size.x >= obj2.position.x &&
        obj1.position.x <= obj2.position.x + obj2.size.x,
        y: obj1.position.y + obj1.size.y >= obj2.position.y &&
        obj1.position.y <= obj2.position.y + obj2.size.y
    };
}

function updatePhysics() {
    player.velocity.add(0, GRAVITY_STRENGTH * GRAVITY_SPEED_MULTIPLIER);
    if (keyStates[settings.controls.left]) player.velocity.add(-player.acceleration, 0);
    if (keyStates[settings.controls.right]) player.velocity.add(player.acceleration, 0);
    // if (keyStates[settings.controls.down]) player.velocity.add(0, player.acceleration);
    // if (keyStates[settings.controls.up]) player.velocity.add(0, -player.acceleration);
    player.velocity.clamp(-10, 10, -20, 20);
    player.velocity.mul(1 - player.friction, 1);
    player.position.add(player.velocity.x, player.velocity.y);
    player.position.clamp(0, canvas.width - player.size.x, 0, canvas.height - player.size.y);//penits

    let playerGroundCollisions = 0;
    platforms.forEach(p => {

        if (platforms.indexOf(p) != 0) return;

        let isColliding = checkCollision(player, p);
        console.log(isColliding);

        // remove line below once collisions are re-done
        playerGroundCollisions++;
    });
    if (playerGroundCollisions > 0) {
        canJump = true;
    }

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
    ctx2.clearRect(0, 0, fullscreenCanvas.width, fullscreenCanvas.height);

    platforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.position.x, p.position.y, p.size.x, p.size.y);
    });

    points.forEach(p => {
        ctx.fillStyle = "#ff0";
        ctx.beginPath();
        ctx.ellipse(p.position.x + 5, p.position.y + 5, 10, 10, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x, player.position.y, player.size.x, player.size.y);
    // ctx.beginPath();
    // ctx.ellipse(player.position.x + (player.size.x / 2), player.position.y + (player.size.y / 2), player.size.x/2, player.size.y/2, 0, 0, Math.PI * 2);
    // ctx.closePath();
    // ctx.fill();

    rainItems.forEach(r => {
        ctx2.drawImage(r.image, r.position.x, r.position.y);
    });

}

function loop() {
    setTimeout(() => {
        if (!paused) {
            updatePhysics();
            draw();
            titleElement.innerHTML = `Score: ${score} | Framerate: 120`;
        }
        loop();
    }, 1000/settings.framerate);
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
    // canJump = true;
}

document.onresize = () => {
    fullscreenCanvas.width = window.innerWidth;
    fullscreenCanvas.height = window.innerHeight;
}