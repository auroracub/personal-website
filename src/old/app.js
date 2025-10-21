////////////////////////////////
// Imports                    //
////////////////////////////////

import * as THREE from "three";

import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader";
import { FontLoader } from "three/addons/loaders/FontLoader";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from "three/addons/controls/OrbitControls";
import * as TWEEN from "@tweenjs/tween.js"
import { PlanetBuilder } from "./planet"
// import { RGBELoader } from "three/addons/loaders/RGBELoader";

// import interMediumFont from "/fonts/Inter/static/Inter_24pt-Medium.ttf"

////////////////////////////////
// Globals                    //
////////////////////////////////

const DEBUG_MODE = false && process.env.NODE_ENV !== "production";
const labelOffset = 1.25;

let isWindowLoaded = false;
let canvas = document.querySelector("canvas.threejs")
let scene, camera, renderer, clock, controls;
let ambientLight, directionalLight;
let earth, moon;
let labels = [];

let previousTime = 0.0;
let cursor = new THREE.Vector2();
let controlScale = 1.0;

// let pmremGenerator;
// const fileLoader = new THREE.FileLoader();
const fontLoader = new FontLoader();
const ttfLoader = new TTFLoader();
const textureLoader = new THREE.TextureLoader();
// const rgbeLoader = new RGBELoader();
const controlsTweenGroup = new TWEEN.Group();

// const FONTS = {
//   // roboto: "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff",
//   // sacramento: "https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff",
//   // inter: window.location.origin + "/fonts/Inter/static/Inter_24pt-Bold.ttf",
//   // inter: "https://fonts.gstatic.com/s/inter/v19/UcCo3FwrK3iLTcviYwYZ90A2N58.woff2",
//   // reenieBeanie: "https://fonts.gstatic.com/s/reeniebeanie/v21/z7NSdR76eDkaJKZJFkkjuvWxXPq1qw.woff2"
// }

////////////////////////////////
// Window Events              //
////////////////////////////////

// Loading transition
window.addEventListener("load", function() {
    isWindowLoaded = true;
});

// Canvas resizing
window.addEventListener("resize", function() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // resize only when necessary
    if (canvas.width !== width || canvas.height !== height) {
        // 3rd parameter `false` to change the internal canvas size
        renderer.setSize(width, height, false);
        var aspectRatio = width / height;
        
        if (aspectRatio != camera.aspect) {
            camera.aspect = aspectRatio;
            camera.updateProjectionMatrix();
        }
    };
});

////////////////////////////////
// Input Events               //
////////////////////////////////

// Disable Middle Mouse (Scrolling)
document.body.onmousedown = (e) => {
    if (e.button === 1) return false;
}

// Mouse Move
document.addEventListener("mousemove", (e) => {
    cursor.set(e.clientX, e.clientY);
});

// Click
document.addEventListener("click", (e) => {
    let screenPos = new THREE.Vector2((e.clientX / window.innerWidth) * 2.0 - 1.0, ((window.innerHeight - e.clientY) / window.innerHeight) * 2.0 - 1.0)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPos, camera);

    const intersections = raycaster.intersectObjects([ earth.mesh, moon.mesh ]);
    const foundObject = intersections.length > 0;
    
    if (foundObject) {
        console.log("Target Changed")
        const intersection = intersections[0];
        const point = intersection.point;
        console.log(point);
        animateControlTarget(intersection.object);
    }
});

// const _VS = `
// varying vec3 v_Normal;
// void main() {
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
// }`;
// const _FS = `
// varying vec3 v_Normal;
// void main() {
//     gl_FragColor = vec4(0.4941, 0.7725, 1.0, 1.0);
// }`;

////////////////////////////////
// Init                       //
////////////////////////////////
{
    ////////////////////////////////
    // Camera                     //
    ////////////////////////////////
    
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100.0);
    // camera.position.y = 0.125;
    // camera.position.z = 4.0;
    camera.position.set(0.5, -2.5, 1.0);

    ////////////////////////////////
    // Renderer                   //
    ////////////////////////////////
    
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        // toneMapping: THREE.NeutralToneMapping,
        // toneMappingExposure: 0.5,
    });

    const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(maxPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    clock = new THREE.Clock();

    ////////////////////////////////
    // Controls                   //
    ////////////////////////////////

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.8;
    controls.enablePan = false;

    ////////////////////////////////
    // Scene                      //
    ////////////////////////////////

    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x415fa6); // Set clear color

    if (DEBUG_MODE) {
        scene.add(new THREE.GridHelper(100, 25));
        scene.add(new THREE.AxesHelper(2.0));
    }

    // Create Light
    ambientLight = new THREE.AmbientLight(new THREE.Color(0xad5d02), 1.0);
    directionalLight = new THREE.DirectionalLight(new THREE.Color(0xffe8a8), 2.0);
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Create Earth
    const earthAlbedo = textureLoader.load("images/surfaces/fabric-1/fabric-1-color.jpg");
    const earthNormal = textureLoader.load("images/surfaces/fabric-1/fabric-1-normgl.jpg");
    const earthDisplacement = textureLoader.load("images/surfaces/fabric-1/fabric-1-disp.jpg");
    const earthRoughness = textureLoader.load("images/surfaces/fabric-1/fabric-1-rough.jpg");
    const earthMaterial = new THREE.MeshStandardMaterial();
    // const earthMaterial = new THREE.ShaderMaterial({
    //         uniforms: {},
    //         vertexShader: _VS,
    //         fragmentShader: _FS
    //     });
    earthMaterial.map = earthAlbedo;
    earthMaterial.normalMap = earthNormal;
    earthMaterial.dispacementMap = earthDisplacement;
    earthMaterial.displacementScale = 1.0;
    earthMaterial.roughnessMap = earthRoughness;
    earthMaterial.roughness = 0.9;
    earthMaterial.color = new THREE.Color(0x7EC5FF);

    [ earthAlbedo, earthNormal, earthDisplacement, earthRoughness ].forEach(element => {
        element.repeat.set(8.0, 8.0);
        element.wrapS = THREE.RepeatWrapping;
        element.wrapT = THREE.RepeatWrapping;
    });

    const earthScale = 1.0;
    earth = new PlanetBuilder()
        .withGeometry(new THREE.SphereGeometry(1.0, 64, 64))
        .withMaterial(earthMaterial)
        .build()
        .addToScene(scene)
    earth.mesh.position.set(0.0, 0.0, 3.0);
    earth.mesh.scale.setScalar(earthScale);

    // Create Moon
    const moonAlbedo = textureLoader.load("images/surfaces/fabric-1/fabric-1-color.jpg");
    const moonNormal = textureLoader.load("images/surfaces/fabric-1/fabric-1-normgl.jpg");
    const moonDisplacement = textureLoader.load("images/surfaces/fabric-1/fabric-1-disp.jpg");
    const moonRoughness = textureLoader.load("images/surfaces/fabric-1/fabric-1-rough.jpg");
    const moonMaterial = new THREE.MeshStandardMaterial();
    moonMaterial.map = moonAlbedo;
    moonMaterial.normalMap = moonNormal;
    moonMaterial.dispacementMap = moonDisplacement;
    moonMaterial.displacementScale = 1.0;
    moonMaterial.roughnessMap = moonRoughness;
    moonMaterial.roughness = 0.9;
    moonMaterial.color = new THREE.Color(0xD9D9D9);

    [ moonAlbedo, moonNormal, moonDisplacement, moonRoughness ].forEach(element => {
        element.repeat.set(4.0, 4.0);
        element.wrapS = THREE.RepeatWrapping;
        element.wrapT = THREE.RepeatWrapping;
    });
    const moonScale = 0.2;
    moon = new PlanetBuilder()
        .withGeometry(new THREE.SphereGeometry(1.0, 24, 24))
        .withMaterial(moonMaterial) // new THREE.MeshBasicMaterial({ color: 0xD9D9D9 }))
        .build()
        .addToScene(scene)
    moon.mesh.position.set(earth.mesh.position.x + 1.5, earth.mesh.position.y + 4.5, earth.mesh.position.z - 8.0);
    moon.mesh.scale.setScalar(moonScale);

    // Create particles
    const getRandomParticlePos = (particleCount, area) => {
        const arrayLength = particleCount * 3;
        const arr = new Float32Array(arrayLength);
        for (let i = 0; i < arrayLength; i++) {
            arr[i] = (Math.random() * 2.0 - 1.0) * area;
        }
        return arr;
    };
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.25,
        map: textureLoader.load("images/particles/star-glow-white.png"),
        transparent: true
    });
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(getRandomParticlePos(512, 24.0), 3)
    );
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);


    // Add more objects here...


    // Create environment

    // const envMap = await rgbeLoader.loadAsync("images/environments/space_rich_multi_nebulae_1.hdr");
    // envMap.mapping = THREE.EquirectangularReflectionMapping;
    // scene.background = envMap;
    // scene.environment = envMap;

    // Set Control Target
    const initialTargetPosition = getTargetPosition(earth.mesh, labelOffset);
    controls.target = initialTargetPosition;
    camera.position.add(initialTargetPosition);
    camera.lookAt(initialTargetPosition);
    controls.update();
    setControlScale(earthScale);

    function getTargetPosition(object, offset) {
        const targetPosition = object.position.clone();
        targetPosition.y += object.scale.y * (Math.sign(offset) * 0.5 + offset);
        return targetPosition;
    }

    // Create Text
    ttfLoader.load("fonts/Inter/static/Inter_24pt-Bold.ttf", (json) => {
        const interBoldFont = fontLoader.parse(json);
        const baseFontSize = 0.25;
        const baseFontDepth = 0.05;

        // Earth Label
        {
            const textGeometry = new TextGeometry("Home", {
                font: interBoldFont,
                size: baseFontSize * earthScale,
                height: 1.0,
                depth: baseFontDepth * earthScale,
                curveSegments: 2,
                bevelEnabled: false
            });

            textGeometry.computeBoundingBox();
            const centerOffset = new THREE.Vector3();
            textGeometry.boundingBox.getCenter(centerOffset);
            textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            scene.add(textMesh);

            textMesh.position.copy(initialTargetPosition);
            textMesh.lookAt(camera.position);
            labels.push(textMesh);
        }

        // Moon Label
        {
            const textGeometry = new TextGeometry("About", {
                font: interBoldFont,
                size: baseFontSize * moonScale,
                height: 1.0,
                depth: baseFontDepth * moonScale,
                curveSegments: 2,
                bevelEnabled: false
            });

            textGeometry.computeBoundingBox();
            const centerOffset = new THREE.Vector3();
            textGeometry.boundingBox.getCenter(centerOffset);
            textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            scene.add(textMesh);

            textMesh.position.copy(getTargetPosition(moon.mesh, labelOffset));
            textMesh.lookAt(camera.position);
            labels.push(textMesh);
        }
    });
}

////////////////////////////////
// Update                     //
////////////////////////////////

let labelTrackPosition = camera.position.clone();
const labelTrackDamping = 5.0;

function runUpdateLoop() {
    const currentTime = clock.getElapsedTime();
    const deltaTime = currentTime - previousTime;

    ////////////////////////////////
    // Start Update Logic         //
    ////////////////////////////////

    controlsTweenGroup.update();
    controls.update();

    // Label Tracking

    labelTrackPosition.lerp(camera.position, labelTrackDamping * deltaTime);

    labels.forEach((label, _) => {
        label.lookAt(labelTrackPosition);
    });

    ////////////////////////////////
    // End Update Logic           //
    ////////////////////////////////

    renderer.render(scene, camera);
    window.requestAnimationFrame(runUpdateLoop);

    previousTime = currentTime;
}

////////////////////////////////
// Controls                   //
////////////////////////////////

function setControlScale(scale) {
    controlScale = scale;
    // controls.minDistance = 1.5 * scale;
    // controls.maxDistance = 12.0 * scale;
    controls.minDistance = 3.0 * scale;
    controls.maxDistance = controls.minDistance;
    // controls.maxTargetRadius = 10.0 * scale;
}

////////////////////////////////
// Scene-specific Logic       //
////////////////////////////////

function animateControlTarget(object) {
    const oldScale = controlScale;
    const newScale = object.scale.y;
    const targetPosition = object.position.clone();
    targetPosition.y += newScale * (0.5 + labelOffset);
    controlsTweenGroup.add(new TWEEN.Tween(controls.target)
        .to(targetPosition, 1500) // Target position and duration in milliseconds
        .easing(TWEEN.Easing.Quadratic.Out) // Optional easing function for smoother animation
        .onStart(() => {
            // controls.enabled = false;
        })
        .onUpdate((value, alpha) => {
            // camera.lookAt(controls.target);
            controls.target = value;
            setControlScale(THREE.MathUtils.lerp(oldScale, newScale, alpha));
        })
        .onComplete(() => {
            // controls.enabled = true;
        })
        .start())
}

runUpdateLoop();

////////////////////////////////
// Scene Load                 //
////////////////////////////////

function onSceneLoaded() {
    window.setTimeout(function() {
        const loader = document.getElementById("loader");
        document.getElementById("content").style.opacity = 1.0;
        document.getElementById("content").style.visibility = "visible";
        document.getElementById("loader").style.opacity = 0.0;
        
        // Optional: Remove the loader from the DOM after the transition
        loader.addEventListener("transitionend", function() {
            loader.remove();
        });
    }, 100.0);
}

const onWindowLoaded = () => {
    onSceneLoaded();

    // THREE.DefaultLoadingManager.onLoad = () => {
    //     // Cleanup from init here...

    //     onSceneLoaded();
    // };
}

if (!isWindowLoaded) {
    window.addEventListener("load", function() {
        isWindowLoaded = true;
        onWindowLoaded();
    });
} else {
    onWindowLoaded();
}
