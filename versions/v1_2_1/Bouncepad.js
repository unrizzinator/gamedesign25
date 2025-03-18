class Bouncepad {

    static instances = [];

    constructor(position, power, size, color) {
        this.id = nextID;
        this.position = position ? position : new Vector();
        this.velocity = new Vector();
        this.power = power ? Math.max(0, power) : 10;
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = 95;
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Bouncepad.instances.length; i++) {
            let o = Bouncepad.instances[i];
            o.toBeDestroyed = true;
        }
        Bouncepad.instances = Bouncepad.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Bouncepad.instances = Bouncepad.instances.filter(o => !o.toBeDestroyed);
    }
}