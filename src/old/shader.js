import * as THREE from 'three';

export default class ShaderLoader {
    #vertPath = ""
    #fragPath = ""

    constructor() {}

    withVert(shaderPath) {
        this.#vertPath = shaderPath;
    }

    withFrag(shaderPath) {
        this.#fragPath = shaderPath;
    }

    async load(fileLoader, onLoaded, uniform = {}) {
        let vertCode;
        let fragCode;

        const createShaderMaterial = function() {
            onLoaded(new THREE.ShaderMaterial({
                vertexShader: vertCode,
                fragmentShader: fragCode,
                uniform: uniform
            }))
        }

        if (vertPath != "") {
            fileLoader.load(
                this.#vertPath,
                function (data) {
                    vertCode = data;
                    // Check if both shaders are loaded before creating the material
                    if (fragCode) {
                        createShaderMaterial();
                    }
                },
                // onError callback (optional)
                function (err) {
                    console.error('An error occured while loading vertex shader: ', err);
                }
            );

        }

        if (fragPath != "") {
            fileLoader.load(
                this.#fragPath,
                function (data) {
                    fragCode = data;
                    // Check if both shaders are loaded before creating the material
                    if (vertCode) {
                        createShaderMaterial();
                    }
                },
                // onError callback (optional)
                function (err) {
                    console.error('An error occured while loading fragment shader: ', err);
                }
            );
        }
    }
}
