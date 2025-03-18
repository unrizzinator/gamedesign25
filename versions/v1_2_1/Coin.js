class Coin {
    static instances = [];

    constructor(position, value) {
        this.id = nextID;
        if (!position || !value) throw console.error("Missing an argument or two.");
        this.position = position;
        this.value = value ? value : 1;
        this.zIndex = 98;
        Point.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Coin.instances.length; i++) {
            let o = Coin.instances[i];
            o.toBeDestroyed = true;
        }
        Coin.instances = Coin.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Coin.instances = Coin.instances.filter(o => !o.toBeDestroyed);
    }
}