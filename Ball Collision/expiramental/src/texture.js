class Texture {
    
    constructor(texture, sampler) {
        this.texture = texture;
        this.sampler = sampler;
    }

    static async createTexture(device, image) {

        const texture = device.createTexture({
            size: { width: image.width, height: image.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });

        const data = await createImageBitmap(image);

        device.queue.copyExternalImageToTexture(
            { source: data },
            { texture: texture },
            { width: image.width, height: image.height }
        );

        const sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });
        return new Texture(texture, sampler);
    }

    static async createTextureFromURL(device, url) {
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url;
            image.onload = () => resolve(image);
            image.onerror = () => {
                console.log(`Failed to load image ${url}`);
                reject();
            }
        });

        const image = await promise;
        return Texture.createTexture(device, image);
    }
}