class Platform {

    static instances = [];

    constructor(position, size, color, velocity, zIndex) {
        this.id = nextID;
        this.position = position ? position : new Vector();
        this.velocity = velocity ? velocity : new Vector();
        this.size = size;
        this.color = color ? color : "#444";
        this.zIndex = zIndex ? zIndex : 1;
        Platform.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Platform.instances.length; i++) {
            let o = Platform.instances[i];
            o.toBeDestroyed = true;
        }
        Platform.instances = Platform.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Platform.instances = Platform.instances.filter(o => !o.toBeDestroyed);
    }
}