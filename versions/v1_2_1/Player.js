var stats = {};

setTimeout(() => {
    let _s3b98598 = cookie.get("upgrades");
    stats = _s3b98598 != null ? JSON.parse(_s3b98598) : {
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
    }
}, 10);

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