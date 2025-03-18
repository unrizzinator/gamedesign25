// Things that are broken/need fixing currently:
// 1. Stats not effecting values such as stamina

// Notes for the future:
// 1. Separate script into multiple files for easier analyzing

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const theaterBG = document.querySelector('#tbg');

const GRAVITY_STRENGTH = 1.98;
const GRAVITY_SPEED_MULTIPLIER = 0.1;
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const CONSOLE_CLEAR_THRESHOLD = 200;
const DASH_STAMINA_COST = 100;
const AIR_STRAFING_SPEED_MULTIPLIER = 0.75;
const BASE_TIMELINE_FRAMERATE = 60;

let cW = canvas.width = GAME_WIDTH;
let cH = canvas.height = GAME_HEIGHT;

const cookie = {
    set(name, value) {
        document.cookie = `${name}=${(value).toString()}; expires="Fri, 01 Jan 2027 00:00:00 GMT;"`;
    },
    get(name) {
        const cookies = document.cookie.split("; ");
        const cookie = cookies.find(r => r.startsWith(name + "="))?.split("=")[1] || null;
        return cookie;
    },
    remove(name) {
        document.cookie = `${name}=""; expires="Fri, 01 Jan 1970 00:00:00 GMT; path=/"`;
    }
}

var settings = {
    controls: {
        left:    "a",
        right:   "d",
        down:    "s",
        up:      "w",
        jump:    " ",
        dash:    "shift",
        menu:    "m",
        reset:   "r",
        pause:   "p",
        gravity: "g",
        editor:  "e",
        debug:   "\\",
        delete:  "delete"
    },
    gravity: true,
    debug: false
};

var backgroundColor = "#101010";
var hasStarted = false;
var paused = false;
var gameFocused = false;
var player = null;
var keyStates = {};
var currHighScore = 0;
var coins = 0;
var score = 0;
var cameraSubject = null;
var dashLineSpan = 200;
var dashGuideScale = 1;
var zoneCoinMultiplier = 1;
var objects = [];

let _s3b98598 = cookie.get("upgrades");
var stats = _s3b98598 != null ? JSON.parse(_s3b98598) : {
    stamina: {
        name: "Stamina",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 5000,
            scale: 1.75,
        }
    },
    staminaRegenSpeed: {
        name: "Stamina Regeneration Speed",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 5000,
            scale: 1.8,
        }
    },
    coinMultiplier: {
        name: "Coin Multiplier",
        level: {
            max: 5,
            current: 0
        },
        cost: {
            base: 10000,
            scale: 1.85,
        }
    },
};

function requestStatUpgrade(el, stat) {
    if (!Object.keys(stats).includes(stat)) {
        Error(`Stat "${stat}" not found.`);
        return;
    }
    let s = stats[stat];
    let compoundedCost = s.cost.base * Math.pow(s.cost.scale, s.level.current)
    if (coins >= compoundedCost && s.level.current < s.level.max) {
        coins -= compoundedCost;
        s.level.current++;
    }

    cookie.set("upgrades", JSON.stringify(stats));

    let upgradeProgressElement = el.parentNode.querySelector('.upgradeLevel');
    upgradeProgressElement.style.width = `${(s.level.current/s.level.max) * 100}%`;
}

function goFullscreen() {
    if (!document.fullscreenElement) gameContainer.requestFullscreen();
    cW = canvas.width = window.outerWidth;
    cH = canvas.height = window.outerHeight;
    theaterBG.style.display = "block";
}
function round(n, p) {
    return Math.round(n * (10**p)) / (10**p);
}

function raycast(startPos, directionUnit, maxDistance, objects) {
    let endX = startPos.x + directionUnit.x * maxDistance;
    let endY = startPos.y + directionUnit.y * maxDistance;

    let closestHit = null;
    let minDist = maxDistance;

    for (let obj of objects) {
        let hit = checkLineIntersection(startPos, new Vector(endX, endY), obj);
        if (hit && hit.distance < minDist) {
            closestHit = hit;
            minDist = hit.distance;
        }
    }

    return closestHit || { position: new Vector(endX, endY), hit: false };
}

function checkLineIntersection(startPos, endPos, obj) {
    if (endPos.x > obj.position.x &&
        endPos.x < obj.position.x + obj.size.x &&
        endPos.y > obj.position.y &&
        endPos.y < obj.position.y + obj.size.y) {
            let distance = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
            return { position: endPos, distance: distance, hit: true, target: obj };
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

var currMousePos = new Vector();

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

canvas.onmousemove = (ev) => {
    const bb = canvas.getBoundingClientRect();
    currMousePos.x = ev.clientX - bb.left - cW/2;
    currMousePos.y = ev.clientY - bb.top - cH/2;
    if (editor.drawing) editor.updateDraw();
    if (editor.dragging) editor.updateMove();

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
                editor.startDraw();
                break;
            case 2:
                editor.startMove();
                break;
            default:
                break;
        }
    }
}

document.onmouseup = () => {
    if (editor.drawing) editor.stopDraw();
    if (editor.dragging) editor.stopMove();
}

document.onkeydown = (ev) => {
    if (ev.key != settings.controls.menu && !gameFocused) return;
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
        case settings.controls.menu:
            toggleMenu();
            break;
        case settings.controls.reset:
            reset();
            break;
        case settings.controls.pause:
            pause();
            break;
        case settings.controls.gravity:
            // toggleGravity();
            break;
        case settings.controls.editor:
            toggleEditor();
            break;
        case settings.controls.debug:
            toggleDebug();
            break;
        case settings.controls.delete:
            editor.destroy();
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

const coinsLastSaved = cookie.get("coins");
coins = coinsLastSaved ? Number.parseFloat(coinsLastSaved) : 0;
coinStatDisplay.textContent = coins.toLocaleString();