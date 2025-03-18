var cameraOffset = new Vector();

let difficultyZones = [];
setTimeout(() => {
    difficultyZones = [
        new Zone("Easy", new Vector(-1000, -5000), new Vector(2000, 5000), {coinMultiplier: 1, platformWidth: 100, platformSpeed: {min: -0.5, max: 0.5}}, false, "#0f02"),
        new Zone("Medium", new Vector(-1000, -15000), new Vector(2000, 10000), {coinMultiplier: 2, platformWidth: 70, platformSpeed: {min: -0.75, max: 0.75}}, false, "#ff02"),
        new Zone("Hard", new Vector(-1000, -30000), new Vector(2000, 15000), {coinMultiplier: 4, platformWidth: 60, platformSpeed: {min: -0.75, max: 0.75}}, false, "#f002"),
        new Zone("Insanity", new Vector(-1000, -50000), new Vector(2000, 20000), {coinMultiplier: 6, platformWidth: 50, platformSpeed: {min: -0.9, max: 0.9}}, false, "#80f2")
    ];
}, 20);

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
                player.position = player.position.add(rect.velocity.x, rect.velocity.y);
            } else if (rect instanceof Checkpoint) {
                player.velocity.y = 0;
                player.setSpawnpoint(rect.position.add(rect.size.x/2, rect.size.y/2));
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

    for (let i = 0; i < Zone.zones.length; i++) {
        let zone = Zone.zones[i];
        if (zone.checkFor(player)) {
            if (zone.attributes.coinMultiplier) {
                zoneCoinMultiplier = zone.attributes.coinMultiplier;
            }
        }
    }

    for (let p of Platform.instances) {
        p.position = p.position.addVector(p.velocity);
        if (p.velocity.y != 0 && p.position.y > 0) {
            p.destroy();
        }
        if (p.velocity.x != 0 && ((p.position.x < -300 && p.velocity.x < 0) || (p.position.x + p.size.x > 300 && p.velocity.x > 0))) {
            p.velocity.x = -p.velocity.x;
        }
        checkCollision(player, p);
    }

    for (let c of Checkpoint.instances) {
        checkCollision(player, c);
    }

    for (let zone of Zone.zones) {
        let entities = zone.getEntities();
        if (zone.identifier == "spawn") {
            for (let entity of entities) {
                entity.size.x = 50;
                entity.size.y = 50;
            }
        }
    }
}

function draw() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cW, cH);

    ctx.fillStyle = "#ffffff40";
    ctx.font = "120px code";
    let st = score.toString();
    for (let i = 0; i < st.length; i++) {
        ctx.fillText(st.charAt(i), 50, 120 + (i*120));
    }

    if (!editor.editing) {
        ctx.fillStyle = "#fff6";
        ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillRect(player.position.x + cameraOffset.x + (dashLineSpan * dashGuideScale + 10), player.position.y + cameraOffset.y, 2, 20);
        ctx.fillStyle = "#fff2";
        for (let i = 0; i < 9; i++) {
            ctx.fillRect(player.position.x + cameraOffset.x - (dashLineSpan * dashGuideScale - 10) + (((dashLineSpan * dashGuideScale * 2)/8)*i), player.position.y + cameraOffset.y + 5, 1, 10);
        }
    }

    // if (editor.editing)
    drawGraph();

    for (let i = objects.length - 1; i > 0; i--) {
        let o = objects[i];
        if (o instanceof Platform) {
            ctx.fillStyle = o.color;
            ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y);
        } else if (o instanceof Checkpoint) {
            ctx.fillStyle = o.color;
            ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y);
        } else if (o instanceof Dialog) {
            ctx.fillStyle = o.color;
            ctx.font = "24px Arial";
            ctx.fillText(o.text, o.position.x + cameraOffset.x, o.position.y + cameraOffset.y);
        } else if (o instanceof Zone) {
            if (o.visible) {
                ctx.fillStyle = o.color;
                ctx.fillRect(o.position.x + cameraOffset.x, o.position.y + cameraOffset.y, o.size.x, o.size.y); 
            }
        }   
    }

    let playerSizeSquashX = Math.max(0, player.velocity.y);
    let playerSizeSquashY = Math.abs(player.velocity.x) > 10 ? Math.abs(player.velocity.x) : 0;

    ctx.fillStyle = player.color;
    ctx.fillRect(player.position.x - (Math.max(-8, -playerSizeSquashX) / 2) + cameraOffset.x, 
                 player.position.y - (Math.max(-8, -playerSizeSquashY) / 2) + cameraOffset.y, 
                 player.size.x + Math.max(-8, -playerSizeSquashX), 
                 player.size.y + Math.max(-8, -playerSizeSquashY));

    ctx.fillStyle = "#08f";
    ctx.fillRect(0, cH - 5, (player.stamina.value/player.stamina.max)*cW, 5);

    if (settings.debug) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(40, 40, 200, 150);
        ctx.fillStyle = "white";
        ctx.font = "18px code";
        ctx.fillText(`Vel x: ${round(player.velocity.x, 2)}`, 50, 68);
        ctx.fillText(`Vel y: ${round(player.velocity.y, 2)}`, 50, 104);
        ctx.fillText(`Pos x: ${round(player.position.x, 2)}`, 50, 140);
        ctx.fillText(`Pos y: ${round(player.position.y, 2)}`, 50, 176);

        let centerOfPlayer = player.position.addVector(player.size.mul(0.5, 0.5));
        ctx.lineWidth = 3;
        new Vector(0, -1).normal().displayUnit(centerOfPlayer, "#f00", 120);
        player.velocity.normal().displayUnit(centerOfPlayer, "#08f", 50);
        player.velocity.displayUnit(centerOfPlayer, "#6f6", 100);
        player.velocity.display(centerOfPlayer, "#f88", 10);

        let newRay = raycast(centerOfPlayer, new Vector(0, 1), 100, Platform.instances);
        if (newRay.hit) {
            centerOfPlayer.addVector(cameraOffset).connect(newRay.position.addVector(cameraOffset), "#fff");
        }
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

    ctx.fillStyle = "#fff";
}

var lastDeltaTime = performance.now();

function loop(t) {
    deltaTime = (t - lastDeltaTime)/1000;
    deltaTime = Math.min(deltaTime, 0.016) * 120;
    lastDeltaTime = t;

    score = Math.floor(Math.abs(player.position.y + 20) / 10);
    if (score > 25 && score - currHighScore > 0) {
        coins += (score - currHighScore) * zoneCoinMultiplier;
        cookie.set("coins", coins);
        cookie.set("highscore", score);
        currHighScore = score;
    }
    coinStatDisplay.textContent = coins.toLocaleString();
    healthStatDisplay.textContent = Math.round(player.health.value);
    staminaStatDisplay.textContent = Math.round(player.stamina.value);

    objects = objects.filter(o => !o.toBeDestroyed);

    if (!paused && deltaTime) {
        if (!player) return;
        if (!cameraSubject) cameraSubject = player;
        player.stamina.value += 1 * Math.max(1, (stats.staminaRegenSpeed.level.current)) * deltaTime;
        player.stamina.value = clamp(player.stamina.value, player.stamina.min, player.stamina.max);
        dashGuideScale = player.stamina.value/player.stamina.max;
        if (player.stamina.value >= DASH_STAMINA_COST) dashGuideScale = 1;
        var targetCameraOffset = new Vector(
            -(cameraSubject.position.x + cameraSubject.size.x / 2) + cW / 2,
            -(cameraSubject.position.y + cameraSubject.size.y / 2) + cH / 2);
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * 0.03;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * 0.1;

        updatePhysics(deltaTime);
        draw();
    }
    requestAnimationFrame(loop);
}

function start() {
    exitWindow();
    hasStarted = true;
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 1;
    staminaStat.style.opacity = 1;
}

function cleanup() {
    Bouncepad.clearInstances();
    Checkpoint.clearInstances();
    Coin.clearInstances();
    Dialog.clearInstances();
    Platform.clearInstances();
    Zone.clearInstances();
}

function reset() {
    cleanup();
    setup();
    cameraSubject = player;
}

function pause() {
    paused = !paused;
}

let spawnpoint = new Vector(0, -120);

function setup() {
    player = new Player(spawnpoint.add(-10, -20), "#fff");
    cameraSubject = player;
    
    // Floor
    new Platform(new Vector(-(Number.MAX_SAFE_INTEGER/2), 0), new Vector(Number.MAX_SAFE_INTEGER, cH), "#0a0a0a", null, 2);

    // Walls
    new Platform(new Vector(-2000 - 100, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");
    new Platform(new Vector(2000, -Number.MAX_SAFE_INTEGER/4), new Vector(100, Number.MAX_SAFE_INTEGER/2), "#fff0");

    // Falling platforms
    for (let i = 0; i < difficultyZones.length; i++) {
        const zone = difficultyZones[i];
        for (let i = 1; i <= Math.round(zone.size.y) / 80; i++) {
            new Platform(new Vector((Math.random() * 800) - 400, zone.position.y + zone.size.y - (i * 80)), 
            new Vector(zone.attributes.platformWidth, 10), "#fff", 
            new Vector((Math.random() * (zone.attributes.platformSpeed.max - zone.attributes.platformSpeed.min)) + zone.attributes.platformSpeed.min));
        }
    }

    objects = objects.sort((a, b) => a.zIndex - b.zIndex);

    editor.editing = false;
    editor.unload();
}

setTimeout(() => {
    setup();
    loop();
}, 12);