const titleElement = document.querySelector('.title');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

var OBJECT_LIMIT = 5000;
var purgeCount = 0;
var settings = {
    framerate: 120
};
var paused = false;
var objects = [];

class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }

    add(other) {
        this.x += other.x;
        this.y += other.y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Square {
    constructor(position, size, color) {
        this.type = "square";
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color;
        objects.push(this);
    }
}

class Circle {
    constructor(position, size, color) {
        this.type = "circle";
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.size = size;
        this.color = color;
        objects.push(this);
    }
}

function pause() {
    paused = !paused;
    if (!paused) {
        objects.forEach(o => {
            o.velocity = new Vector(-o.velocity.x, -o.velocity.y);
        });
    }
}

function purge() {
    purgeCount++;
    objects.splice(50);
}

function setup() {
    let newSquare = new Square(new Vector(100, 50), 50, "#000");
    newSquare.velocity.set(6, 3);
    for (let i = 0; i < 100; i++) {
        let newCircle = new Circle(new Vector(300, 200), 10, `hsl(${Math.random() * 360}, 100%, 50%)`);
        newCircle.velocity.set((Math.random() * 20) - 10, (Math.random() * 20) - 10);
    }
}

// function updatePhysics() {
//     objects.forEach(o => {
//         if (o.position.x + o.size > canvas.width) {o.velocity.set(-o.velocity.x, o.velocity.y)};
//         if (o.position.y + o.size > canvas.height) {o.velocity.set(o.velocity.x, -o.velocity.y)};
//         // Because the way the circle is drawn, we have to seperate it 
//         // from the square in how the position is calculated
//         if (o.type == "circle") {
//             if (o.position.x - o.size < 0) {o.velocity.set(-o.velocity.x, o.velocity.y); o.size};
//             if (o.position.y - o.size < 0) {o.velocity.set(o.velocity.x, -o.velocity.y)};
//         } else if (o.type == "square") {
//             if (o.position.x < 0) {o.velocity.set(-o.velocity.x, o.velocity.y); o.size};
//             if (o.position.y < 0) {o.velocity.set(o.velocity.x, -o.velocity.y)};
//         }

//         o.position.add(o.velocity);
//     });
// }

function updatePhysics() {
    objects.forEach(o => {
        if (o.position.x + o.size > canvas.width) {o.velocity.set(-o.velocity.x, o.velocity.y)};
        if (o.position.y + o.size > canvas.height) {o.velocity.set(o.velocity.x, -o.velocity.y)};
        // Because the way the circle is drawn, we have to seperate it 
        // from the square in how the position is calculated
        if (o.type == "circle") {
            if (o.position.x - o.size < 0) {
                o.velocity.set(-o.velocity.x, o.velocity.y);
                let dupe = new Circle(new Vector(canvas.width / 2, canvas.height / 2), 10, `hsl(${Math.random() * 360}, 100%, 50%)`);
                dupe.velocity.set((Math.random() * 20) - 10, (Math.random() * 20) - 10);
            };
            if (o.position.y - o.size < 0) {o.velocity.set(o.velocity.x, -o.velocity.y)};
        } else if (o.type == "square") {
            if (o.position.x < 0) {o.velocity.set(-o.velocity.x, o.velocity.y);};
            if (o.position.y < 0) {o.velocity.set(o.velocity.x, -o.velocity.y)};
        }

        o.position.add(o.velocity);
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.strokeStyle = o.color;
        if (o.type == "square") {
            ctx.fillRect(o.position.x, o.position.y, o.size, o.size);
        } else if (o.type == "circle") {
            ctx.beginPath();
            ctx.ellipse(o.position.x, o.position.y, o.size, o.size, 0, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
    });
}

function updateSetting(s, v) {
    if (!v) return;
    if (settings[s]) {
        settings[s] = v;
    }
}

function loop() {
    setTimeout(() => {
        if (!paused) {
            titleElement.innerText = `Object count: ${objects.length} | Purges: ${purgeCount} | Limit: ${OBJECT_LIMIT}`;
            if (objects.length > OBJECT_LIMIT) {
                purge();
                OBJECT_LIMIT *= 1.5;
            }
            updatePhysics();
            draw();
        }
        loop();
    }, 1000/settings.framerate);
}

setup();
loop();