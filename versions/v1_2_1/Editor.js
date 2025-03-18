var nextID = 0;

var editor = {
    panel: document.querySelector('#gameEditor'),
    editing: false,
    drawing: false,
    dragging: false,
    modes: ["select", "draw", "move"],
    mode: 0,
    activeObject: null,
    gridSize: 100,
    setMode(i) {
        this.mode = i;
        this.panel.querySelector('[editor-mode]').textContent = `Mode (${this.modes[this.mode]})`;
    },
    apply() {
        if (!this.activeObject) return;
        this.activeObject.position.x = Number.parseInt(this.panel.querySelector('#objectPosX ').value);
        this.activeObject.position.y = Number.parseInt(this.panel.querySelector('#objectPosY ').value);
        this.activeObject.size.x     = Number.parseInt(this.panel.querySelector('#objectSizeX').value);
        this.activeObject.size.y     = Number.parseInt(this.panel.querySelector('#objectSizeY').value);
    },
    translate(d) {
        switch (d) {
            case 0:
                this.activeObject.position.x -= editor.gridSize;
                break;
            case 1:
                this.activeObject.position.x += editor.gridSize;
                break;
            case 2:
                this.activeObject.position.y -= editor.gridSize;
                break;
            case 3:
                this.activeObject.position.y += editor.gridSize;
                break;
            default:
                break;
        }
        this.getObjectInfo();
    },
    setActiveObject(o) {
        if (!o) return;
        this.activeObject = o;
        this.getObjectInfo();
    },
    clearActiveObject() {
        this.activeObject = null;
        this.panel.querySelector('#objectId   ').value = null;
        this.panel.querySelector('#objectPosX ').value = null;
        this.panel.querySelector('#objectPosY ').value = null;
        this.panel.querySelector('#objectSizeX').value = null;
        this.panel.querySelector('#objectSizeY').value = null;
    },
    getObjectInfo() {
        if (!this.activeObject) return;
        this.panel.querySelector('#objectId   ').value = this.activeObject.id;
        this.panel.querySelector('#objectPosX ').value = this.activeObject.position.x;
        this.panel.querySelector('#objectPosY ').value = this.activeObject.position.y;
        this.panel.querySelector('#objectSizeX').value = this.activeObject.size.x;
        this.panel.querySelector('#objectSizeY').value = this.activeObject.size.y;
    },
    getObjectById(n) {
        for (let o of objects) {
            if (o.id == n) return o;
        }
        return null;
    },
    changeMode() {
        this.mode++;
        if (this.mode > this.modes.length - 1) this.mode = 0;
        this.clearActiveObject();
        this.panel.querySelector('[editor-mode]').textContent = `Mode (${this.modes[this.mode]})`;
    },
    updateDraw() {
        if (!this.drawing || !this.activeObject) return;
        this.activeObject.size = new Vector(Math.round((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize - this.activeObject.position.x, 
                                            Math.round((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize - this.activeObject.position.y);
    },
    startDraw() {
        if (this.mode != 1 || this.drawing) return;
        this.drawing = true;
        editor.activeObject = new Platform(new Vector(Math.floor((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize, Math.floor((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize), new Vector(20, 20), "#fff");
    },
    stopDraw() {
        if (this.mode != 1 || !this.drawing) return;
        this.drawing = false;
    },
    updateMove() {
        if (!this.dragging || !this.activeObject) return;
        this.activeObject.position = new Vector(Math.round((currMousePos.x - cameraOffset.x + cW/2) / this.gridSize) * this.gridSize - this.activeObject.position.x, 
                                                Math.round((currMousePos.y - cameraOffset.y + cH/2) / this.gridSize) * this.gridSize - this.activeObject.position.y);
        console.log('Moving');
    },
    startMove() {
        if (this.mode != 2 || this.dragging) return;
        this.drawing = true;
        editor.setActiveObject(getObjectAtMouse());
    },
    stopMove() {
        if (this.mode != 2 || !this.dragging) return;
        this.drawing = false;
        editor.clearActiveObject();
        console.log('Move end');
    },
    destroy() {
        if (!this.activeObject) return;
        this.activeObject.destroy();
        this.clearActiveObject();
    },
    load() {
        this.panel.style.display = "grid";
        this.setMode(0);
    },
    unload() {
        this.panel.style.display = "none";
        this.clearActiveObject();
    }
}

function drawGraph() {
    ctx.fillStyle = "#40404040";
    for (let _x = 0; _x < Math.floor(cW + 50 / editor.gridSize); _x++) {
        let offset = cameraOffset.x % editor.gridSize;
        ctx.fillRect((_x * editor.gridSize) + offset, 0, 1, cH);
    }
    for (let _y = 0; _y < Math.floor(cH / editor.gridSize); _y++) {
        let offset = cameraOffset.y % editor.gridSize;
        ctx.fillRect(0, (_y * editor.gridSize) + offset, cW, 1);
    }
}

function getObjectAtMouse() {
    var pc = new Vector(currMousePos.x, currMousePos.y);
        pc = pc.subVector(cameraOffset);
        pc = pc.add(cW/2, cH/2);
    for (let o of objects) {
        if (o.type == "Platform" || o.type == "Bouncepad") {
            if (pc.x > o.position.x && pc.x < o.position.x + o.size.x &&
                pc.y > o.position.y && pc.y < o.position.y + o.size.y) {
                    return o;
            }
        }
    }
    return null;
}