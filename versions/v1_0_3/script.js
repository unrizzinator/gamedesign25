const titleElement = document.querySelector('.title');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;


const PADDLE_WIDTH = 20;
var settings = {
    framerate: 120
};
var timeScale = 1;
var paused = false;

var ball, leftPaddle, rightPaddle = null;

class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }

    add(other) {
        this.x += other.x * timeScale;
        this.y += other.y * timeScale;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Ball {
    constructor(position, size, color) {
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color;
    }
}

class Paddle {
    constructor(isPlayer, height) {
        this.velocity = new Vector();
        this.height = height ? height : 100;
        this.position = isPlayer ? new Vector(0, (canvas.height / 2) - (this.size / 2)) : new Vector(canvas.width - PADDLE_WIDTH, (canvas.height / 2) - (this.size / 2));
        this.color = isPlayer ? "#00f" : "#f00";
    }
}

function updateSetting(s, v) {
    if (!v) return;
    if (settings[s]) {
        settings[s] = v;
    }
}

function reset() {
    ball, leftPaddle, rightPaddle = null;

}

function pause() {
    paused = !paused;
}

function setup() {
    ball = new Ball(new Vector(300, 200), 10, "#000");
    leftPaddle = new Paddle(true, 100);
    rightPaddle = new Paddle(false, 100);
}

function updatePhysics() {
    if (ball.position.x + ball.size > canvas.width) {ball.velocity.set(-ball.velocity.x, ball.velocity.y)};
    if (ball.position.y + ball.size > canvas.height) {ball.velocity.set(ball.velocity.x, -ball.velocity.y)};
    if (ball.position.x < 0) {ball.velocity.set(-ball.velocity.x, ball.velocity.y)};
    if (ball.position.y < 0) {ball.velocity.set(ball.velocity.x, -ball.velocity.y)};//penits

    ball.position.add(ball.velocity);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = leftPaddle.color;
    ctx.fillRect(leftPaddle.position.x, leftPaddle.position.y, PADDLE_WIDTH, leftPaddle.height);
    ctx.fillStyle = rightPaddle.color;
    ctx.fillRect(rightPaddle.position.x, rightPaddle.position.y, PADDLE_WIDTH, rightPaddle.height);

    ctx.beginPath();
    ctx.ellipse(ball.position.x, ball.position.y, ball.size, ball.size, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();    
}

function loop() {
    setTimeout(() => {
        if (!paused) {
            timeScale = 60/settings.framerate;
            updatePhysics();
            draw();
        }
        loop();
    }, 1000/settings.framerate);
}

setup();
loop();

canvas.onmousemove = (ev) => {
    
}

//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
//penits
