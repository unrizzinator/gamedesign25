class Zone {
    static zones = [];
    entities = [];

    constructor(identifier, position, size, attributes, visible, color) {
        this.identifier = identifier;
        this.position = position;
        this.size = size;
        this.attributes = attributes ? attributes : {};
        this.visible = visible ? visible : false;
        this.color = color ? color : "#f002";
        this.zIndex = 99;
        Zone.zones.push(this);
        objects.push(this);
    }

    getEntities() {
        let _entities = [];
        if (this.checkFor(player)) _entities.push(player);
        this.entities = _entities;
        return this.entities;
    }

    setVisible(state) {
        if (typeof state != Boolean) return;
        this.visible = state;
    }
    
    destroy() {
        this.toBeDestroyed = true;
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }

    checkFor(obj) {
        if (!obj) return console.error("An object wasn't provided.");
        if (!obj.position || !obj.size) return console.error("Object provided doesn't hold a position and/or size.");
        if (obj.position.x + obj.size.x / 2 > this.position.x &&
            obj.position.x + obj.size.x / 2 < this.position.x + this.size.x &&
            obj.position.y + obj.size.y / 2 > this.position.y &&
            obj.position.y + obj.size.y / 2 < this.position.y + this.size.y
        ) {
            return true;
        }
        return false;
    }

    static getZoneById(identifier) {
        for (let zone of Zone.zones) {
            if (zone.identifier == identifier) return zone;
        }
        return null;
    }

    static clearInstances() {
        for (let i = 0; i < Zone.zones.length; i++) {
            let o = Zone.zones[i];
            o.toBeDestroyed = true;
        }
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Zone.zones = Zone.zones.filter(o => !o.toBeDestroyed);
    }
}