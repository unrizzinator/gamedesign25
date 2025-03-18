class Dialog {

    static instances = [];

    constructor(text, color, position) {
        this.id = nextID;
        if (!text) return console.error("No text provided.");
        this.text = text;
        this.color = color ? color : "#fff";
        this.size = new Vector(ctx.measureText(this.text).width, ctx.measureText(this.text).fontBoundingBoxAscent + ctx.measureText(this.text).fontBoundingBoxDescent);
        this.position = position ? position : new Vector(cW / 2, cH / 2);
        this.zIndex = 97;
        Dialog.instances.push(this);
        objects.push(this);
        nextID++;
    }

    static clearInstances() {
        for (let i = 0; i < Dialog.instances.length; i++) {
            let o = Dialog.instances[i];
            o.toBeDestroyed = true;
        }
        Dialog.instances = Dialog.instances.filter(o => !o.toBeDestroyed);
    }

    destroy() {
        this.toBeDestroyed = true;
        Dialog.instances = Dialog.instances.filter(o => !o.toBeDestroyed);
    }
}