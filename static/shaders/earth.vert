#version 310 es

layout(location = 0) in vec3 position;

layout(set = 0, binding = 0) uniform uniformBlock {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
};

// varying vec2 vertexUV;
// varying vec3 vertexNormal;

void main() {
    // vertexUV = uv;
    // vertexNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
