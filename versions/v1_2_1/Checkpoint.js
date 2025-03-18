class Checkpoint {

    static instances = [];

    constructor(position, size) {
        this.id = nextID;
        this.position = position ? position : new Vector();
        this.size = size;
        this.color = "#f09";
        this.zIndex = 96;
        Checkpoint.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Checkpoint.instances.length; i++) {
            let o = Checkpoint.instances[i];
            o.toBeDestroyed = true;
        }
        Checkpoint.instances = Checkpoint.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Checkpoint.instances = Checkpoint.instances.filter(o => !o.toBeDestroyed);
    }
}