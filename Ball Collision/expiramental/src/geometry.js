class QuadGeometry {
    
    positions = [];
    colors = [];
    textureCoordinates = [];
    
    constructor() {
        this.positions = [
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0,
        ];

        this.colors = [
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
            1.0, 0.0, 0.0,
            0.0, 0.0, 1.0,
            0.0, 1.0, 0.0,
        ];

        this.textureCoordinates = [
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0,
            // 1.0, 0.0,
            // 0.0, 1.0,
            // 1, 1,
        ];
    }   
}