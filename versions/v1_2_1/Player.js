class Player {
    constructor(position, color) {
        this.id = nextID;
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.velocity = new Vector();
        this.health = {
            min: 0,
            max: 100,
            value: 100
        }
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
        this.zone = null;
        this.zIndex = 100;
        nextID++;
    }

    jump() {
        if (!this.isGrounded) return;
        this.isGrounded = false;
        this.velocity.y > 0 ? this.velocity.set(this.velocity.x, -this.jumpHeight) : 
                              this.velocity = this.velocity.add(0, -this.jumpHeight);
    }

    dash() {
        if (this.stamina.value < DASH_STAMINA_COST || this.isDashing || this.velocity.x === 0) return;
        this.isDashing = true;
        this.stamina.value -= DASH_STAMINA_COST;
        this.velocity.x = this.velocity.x < 0 ? -20 : 20;
        this.velocity.clampX(-25, 25);
        dashGuideScale = 0;
        setTimeout(() => {
            this.isDashing = false;
        }, 200);
    }

    setSpawnpoint(v) {
        if (!v) return;
        spawnpoint = v;
    }
}