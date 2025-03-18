const fps = 170;
let lastTime = 0;
let targetFrameTime = 1000 / fps;

let cW, cH;

async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}

let shaderCode;
loadShader("./shaders/shader.wgsl").then((data) => {
    shaderCode = data;
});

class Renderer {

    context = null;
    device = null;
    pipeline = null;
    positionBuffer = null;
    colorsBuffer = null;
    textureCoordinatesBuffer = null;
    textureBindBuffer = null;

    testTexture = null;

    constructor() {}

    async init() {
        const canvas = document.querySelector('canvas');
        this.context = canvas.getContext('webgpu');

        if (!this.context) return Error("WebGPU not supported.");
        cW = canvas.width = 800;
        cH = canvas.height = 600;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return Error("Error getting adapter.");

        this.device = await adapter.requestDevice();

        this.context.configure({
            device: this.device,
            format: navigator.gpu.getPreferredCanvasFormat()
        });

        this.testTexture = await Texture.createTextureFromURL(this.device, "src/img/db.png");

        this.prepareModel();

        const geometry = new QuadGeometry();
        this.positionBuffer = this.createBuffer(new Float32Array(geometry.positions));
        this.colorsBuffer = this.createBuffer(new Float32Array(geometry.colors));
        this.textureCoordinatesBuffer = this.createBuffer(new Float32Array(geometry.textureCoordinates));
    }

    createBuffer(data) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }

    prepareModel() {
        const shaderModule = this.device.createShaderModule({
            code: shaderCode
        });

        const positionBufferLayout = {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
                {
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x2"
                }
            ],
            stepMode: "vertex"
        }

        const colorBufferLayout = {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
                {
                    shaderLocation: 1,
                    offset: 0,
                    format: "float32x3"
                }
            ],
            stepMode: "vertex"
        }

        const textureCoordinatesLayout = {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
                {
                    shaderLocation: 2,
                    offset: 0,
                    format: "float32x2"
                }
            ],
            stepMode: "vertex"
        }

        const vertexState = {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [
                positionBufferLayout,
                colorBufferLayout,
                textureCoordinatesLayout
            ]
        }

        const fragmentState = {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add"
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add"
                        },
                    }
                }
            ]
        }

        const textureBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                textureBindGroupLayout
            ]
        });

        this.textureBindGroup = this.device.createBindGroup({
            layout: textureBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.testTexture.sampler
                },
                {
                    binding: 1,
                    resource: this.testTexture.texture.createView()
                }
            ]
        });

        this.pipeline = this.device.createRenderPipeline({
            vertex: vertexState,
            fragment: fragmentState,
            primitive: {
                topology: "triangle-list"
            },
            layout: pipelineLayout,
        });
    }

    draw() {

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.09, g: 0.09, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        }
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        // Draw stuff here
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setVertexBuffer(0, this.positionBuffer);
        passEncoder.setVertexBuffer(1, this.colorsBuffer);
        passEncoder.setVertexBuffer(2, this.textureCoordinatesBuffer);
        passEncoder.setBindGroup(0, this.textureBindGroup);
        passEncoder.draw(6);

        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
        
    }
}

const renderer = new Renderer();
renderer.init()
    .then(() => renderer.draw());

function update(t) {
    if (t - lastTime < targetFrameTime) {
        requestAnimationFrame(update);
        return;
    }
    lastTime = t;

    // renderer.draw();
    requestAnimationFrame(update);
}

requestAnimationFrame(update);