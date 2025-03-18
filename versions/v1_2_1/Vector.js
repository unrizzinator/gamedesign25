class Vector {
    constructor(x, y) {
        this.x = x ? x : 0;
        this.y = y ? y : 0;
    }

    add(x, y) {
        return new Vector(this.x + x, this.y + y);
    }

    addVector(other) {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    sub(x, y) {
        return new Vector(this.x - x, this.y - y);
    }

    subVector(other) {
        return new Vector(this.x -other.x, this.y - other.y);
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    abs() {
        new Vector(Math.abs(this.x), Math.abs(this.y));
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    unit() {
        return new Vector(this.x/this.magnitude(), this.y/this.magnitude());
    }

    normal() {
        return new Vector(-this.y, this.x).unit();
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    clamp(minX, maxX, minY, maxY) {
        return new Vector(Math.max(minX, Math.min(this.x, maxX)), Math.max(minY, Math.min(this.y, maxY)));
    }

    clampX(minX, maxX) {
        return new Vector(Math.max(minX, Math.min(this.x, maxX)), this.y);
    }

    clampY(minY, maxY) {
        return new Vector(this.x, Math.max(minY, Math.min(this.y, maxY)));
    }

    mul(scalarX, scalarY) {
        return new Vector(this.x * scalarX, this.y * scalarY);
    }

    display(p, c, s) {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(p.x + cameraOffset.x, p.y + cameraOffset.y);
        ctx.lineTo(p.x + cameraOffset.x + this.x * s, p.y + cameraOffset.y + this.y * s);
        ctx.stroke();
    }

    displayUnit(p, c, l) {
        let ue = this.unit().mul(l, l);
        let origin = p.addVector(cameraOffset);
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + ue.x, origin.y + ue.y);
        ctx.stroke();
    }

    connect(v, c) {
        if (!v) return;
        ctx.strokeStyle = c ? c : "#09f";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
    }
}