////////////////////////////////
// Imports                    //
////////////////////////////////

import * as Three from "three";
import * as Addons from "three/addons";
import * as Tween from "@tweenjs/tween.js"
import { Planet } from "./planet"
import GSAP from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

////////////////////////////////
// Globals                    //
////////////////////////////////

const DEBUG_MODE = false && process.env.NODE_ENV !== "production";
const labelOffset = 0.4;

let isWindowLoaded = false;
let canvas = <HTMLCanvasElement>document.querySelector("canvas.canvas");
// let width = window.innerWidth, height = window.innerHeight;
let rect: DOMRect;
let scene: Three.Scene, camera: Three.PerspectiveCamera, renderer: Three.WebGLRenderer, clock: Three.Clock, controls: Addons.OrbitControls;
let ambientLight: Three.AmbientLight, directionalLight: Three.DirectionalLight;
let earth: Planet, moon: Planet;
let labels: Array<Three.Object3D> = [];

let previousTime = 0.0;
let cursorPosition = new Three.Vector2();
// let controlScale = 1.0;
let lastClickPosition = new Three.Vector2();

const fontLoader = new Addons.FontLoader();
const ttfLoader = new Addons.TTFLoader();
const textureLoader = new Three.TextureLoader();
const controlsTweenGroup = new Tween.Group();
// const rgbeLoader = new RGBELoader();

let isHome = true;
let isFramed = true;
let homeObject: Three.Object3D
let currentObject: Three.Object3D;
let frameWidth = Math.min(window.innerWidth, window.innerHeight);
let framePercentage = 0.90;
let frameDistance = 1.0;

const FONTS = {
  interThin: "fonts/Inter/static/Inter_24pt-Thin.ttf",
  interThinItalic: "fonts/Inter/static/Inter_24pt-ThinItalic.ttf",
  interExtraLight: "fonts/Inter/static/Inter_24pt-ExtraLight.ttf",
  interExtraLightItalic: "fonts/Inter/static/Inter_24pt-ExtraLightItalic.ttf",
  interLight: "fonts/Inter/static/Inter_24pt-Light.ttf",
  interLightItalic: "fonts/Inter/static/Inter_24pt-LightItalic.ttf",
  interRegular: "fonts/Inter/static/Inter_24pt-Regular.ttf",
  interRegularItalic: "fonts/Inter/static/Inter_24pt-Italic.ttf",
  interMedium: "fonts/Inter/static/Inter_24pt-Medium.ttf",
  interMediumItalic: "fonts/Inter/static/Inter_24pt-MediumItalic.ttf",
  interSemiBold: "fonts/Inter/static/Inter_24pt-SemiBold.ttf",
  interSemiBoldItalic: "fonts/Inter/static/Inter_24pt-SemiBoldItalic.ttf",
  interBold: "fonts/Inter/static/Inter_24pt-Bold.ttf",
  interBoldItalic: "fonts/Inter/static/Inter_24pt-BoldItalic.ttf",
  interExtraBold: "fonts/Inter/static/Inter_24pt-ExtraBold.ttf",
  interExtraBoldItalic: "fonts/Inter/static/Inter_24pt-ExtraBoldItalic.ttf",
  interBlack: "fonts/Inter/static/Inter_24pt-Black.ttf",
  interBlackItalic: "fonts/Inter/static/Inter_24pt-BlackItalic.ttf",
  reenieBeanieRegular: "fonts/ReenieBeanie/ReenieBeanie-Regular.ttf"
}

////////////////////////////////
// DOM/Window Events          //
////////////////////////////////

function recalculateSize() {
    const width = canvas === null ? window.innerWidth : canvas.clientWidth;
    const height = canvas === null ? window.innerHeight : canvas.clientHeight;
    
    // resize only when necessary
    if (canvas.width !== width || canvas.height !== height) {
        // 3rd parameter `false` to change the internal canvas size
        renderer.setSize(width, height, false);
        var aspectRatio = width / height;
        
        if (aspectRatio != camera.aspect) {
            camera.aspect = aspectRatio;
            camera.updateProjectionMatrix();
            frameWidth = calculateFrameWidth();
            frameDistance = calculateFrameDistance(currentObject);
        }

        rect = renderer.domElement.getBoundingClientRect();
    };
}

// Loading transition
window.addEventListener("load", function() {
    isWindowLoaded = true;
});

// Canvas resizing
window.addEventListener("resize", recalculateSize);

document.addEventListener("DOMContentLoaded", () => {
    GSAP.registerPlugin(ScrollTrigger, SplitText);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    GSAP.ticker.add((time) => lenis.raf(time * 1000));
    GSAP.ticker.lagSmoothing(0);

    // const header1Split = new SplitText(".header-1 h1", {
    //     type: "chars",
    //     charsClass: "char"
    // });

    // header1Split.chars.forEach(
    //     (char) => (char.innerHTML = `<span>${char.innerHTML}</span>`)
    // )

    // const animOptions = { duration: 1.0, ease: "power3.out", stagger: 0.025 };

    // ScrollTrigger.create({
    //     trigger: ".overview",
    //     start: "75% bottom",
    //     onEnter: () =>
    //         GSAP.to(".header-1 h1 .char > span", {
    //             y: "0%",
    //             duration: animOptions.duration,
    //             ease: animOptions.ease,
    //             stagger: animOptions.stagger
    //         }),
    //     onLeaveBack: () =>
    //         GSAP.to(".header-1 h1 .char > span", {
    //             y: "100%",
    //             duration: animOptions.duration,
    //             ease: animOptions.ease,
    //             stagger: animOptions.stagger
    //         })
    // });
})


////////////////////////////////
// Input Events               //
////////////////////////////////

// Disable Middle Mouse (Scrolling)
document.body.onmousedown = (e) => {
    if (e.button === 1) return false;
}

// Mouse Move
document.addEventListener("mousemove", (e) => {
    cursorPosition.set(e.clientX, e.clientY);
});

// Click
document.addEventListener("click", (e) => {
    if (lastClickPosition.distanceToSquared(cursorPosition) > 0.05) isFramed = false;

    const screenPosition = new Three.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2.0 - 1.0,
        -((e.clientY - rect.top) / rect.height) * 2.0 + 1.0
    );
    const raycaster = new Three.Raycaster(); raycaster.setFromCamera(screenPosition, camera);
    const intersections = raycaster.intersectObjects([ earth.mesh, moon.mesh ]);

    // Intersection found
    if (intersections.length > 0) {
        const intersection = intersections[0];

        // Object found
        if (intersection !== null && intersection !== undefined) {
            console.log("Target Changed")
            const point = intersection.point; console.log(point);
            animateControlTarget(intersection.object);
        }
    }

    lastClickPosition.copy(cursorPosition);
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
    
    camera = new Three.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100.0);
    // camera.position.y = 0.125;
    // camera.position.z = 4.0;
    // camera.position.set(0.5, -2.5, 1.0);
    // camera.position.set(0.0, 0.0, 0.0);

    ////////////////////////////////
    // Renderer                   //
    ////////////////////////////////

    renderer = new Three.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setClearColor(0x000000, 0.0);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    // const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    // renderer.setPixelRatio(maxPixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = Three.PCFSoftShadowMap;
    renderer.outputColorSpace = Three.LinearSRGBColorSpace;
    renderer.toneMapping = Three.NoToneMapping; // Other options: THREE.NeutralToneMapping, Three.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0;

    clock = new Three.Clock();

    ////////////////////////////////
    // Controls                   //
    ////////////////////////////////

    controls = new Addons.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    // controls.minPolarAngle = 0.25;
    // controls.maxPolarAngle = 1.8;
    controls.minPolarAngle = Math.PI * 0.5;
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = false;

    ////////////////////////////////
    // Scene                      //
    ////////////////////////////////

    scene = new Three.Scene();
    // scene.background = new THREE.Color(0x415fa6); // Set clear color

    if (DEBUG_MODE) {
        scene.add(new Three.GridHelper(100, 25));
        scene.add(new Three.AxesHelper(2.0));
    }

    // Create Light
    ambientLight = new Three.AmbientLight(new Three.Color(0xffffff), 0.7); // 0xad5d02
    directionalLight = new Three.DirectionalLight(new Three.Color(0xffffff), 1.0); // 0xffe8a8
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(ambientLight);
    scene.add(directionalLight);

    const baseDisplacementScale = 0.02;

    // Create Earth
    const earthScale = 1.0;
    const earthAlbedo = textureLoader.load("images/surfaces/fabric-1/fabric-1-color.jpg");
    const earthNormal = textureLoader.load("images/surfaces/fabric-1/fabric-1-normgl.jpg");
    const earthDisplacement = textureLoader.load("images/surfaces/fabric-1/fabric-1-disp.jpg");
    const earthRoughness = textureLoader.load("images/surfaces/fabric-1/fabric-1-rough.jpg");
    const earthMaterial = new Three.MeshStandardMaterial();
    // const earthMaterial = new THREE.ShaderMaterial({
    //         uniforms: {},
    //         vertexShader: _VS,
    //         fragmentShader: _FS
    //     });
    earthMaterial.map = earthAlbedo;
    earthMaterial.normalMap = earthNormal;
    earthMaterial.displacementMap = earthDisplacement;
    earthMaterial.displacementScale = baseDisplacementScale * earthScale;
    earthMaterial.roughnessMap = earthRoughness;
    earthMaterial.roughness = 0.9;
    earthMaterial.color = new Three.Color(0x7EC5FF);

    [ earthAlbedo, earthNormal, earthDisplacement, earthRoughness ].forEach(element => {
        element.repeat.set(8.0, 8.0);
        element.wrapS = Three.RepeatWrapping;
        element.wrapT = Three.RepeatWrapping;
    });
    earth = new Planet(new Three.SphereGeometry(1.0, 64, 64), earthMaterial)
        .addToScene(scene)
    earth.mesh.position.set(0.0, 0.0, 3.0);
    earth.mesh.scale.setScalar(earthScale);

    // Create Moon
    const moonScale = 0.2;
    const moonAlbedo = textureLoader.load("images/surfaces/fabric-1/fabric-1-color.jpg");
    const moonNormal = textureLoader.load("images/surfaces/fabric-1/fabric-1-normgl.jpg");
    const moonDisplacement = textureLoader.load("images/surfaces/fabric-1/fabric-1-disp.jpg");
    const moonRoughness = textureLoader.load("images/surfaces/fabric-1/fabric-1-rough.jpg");
    const moonMaterial = new Three.MeshStandardMaterial();
    moonMaterial.map = moonAlbedo;
    moonMaterial.normalMap = moonNormal;
    moonMaterial.displacementMap = moonDisplacement;
    moonMaterial.displacementScale = baseDisplacementScale * moonScale;
    moonMaterial.roughnessMap = moonRoughness;
    moonMaterial.roughness = 0.9;
    moonMaterial.color = new Three.Color(0xD9D9D9);

    [ moonAlbedo, moonNormal, moonDisplacement, moonRoughness ].forEach(element => {
        element.repeat.set(4.0, 4.0);
        element.wrapS = Three.RepeatWrapping;
        element.wrapT = Three.RepeatWrapping;
    });
    moon = new Planet(new Three.SphereGeometry(1.0, 24, 24), moonMaterial)
        .addToScene(scene)
    moon.mesh.position.set(earth.mesh.position.x - 6.0, earth.mesh.position.y + 5.0, earth.mesh.position.z + 16.0);
    moon.mesh.scale.setScalar(moonScale);

    // Create particles
    const getRandomParticlePos = (particleCount: number, emitterRange: number) => {
        const arrayLength = particleCount * 3;
        const arr = new Float32Array(arrayLength);
        for (let i = 0; i < arrayLength; i++) {
            arr[i] = (Math.random() * 2.0 - 1.0) * emitterRange;
        }
        return arr;
    };
    const particlesMaterial = new Three.PointsMaterial({
        size: 0.25,
        map: textureLoader.load("images/particles/star-glow-white.png"),
        transparent: true
    });
    const particlesGeometry = new Three.BufferGeometry();
    particlesGeometry.setAttribute(
        "position",
        new Three.BufferAttribute(getRandomParticlePos(512, 24.0), 3)
    );
    const particlesMesh = new Three.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);


    // Add more objects here...


    // Create environment

    // const envMap = await rgbeLoader.loadAsync("images/environments/space_rich_multi_nebulae_1.hdr");
    // envMap.mapping = THREE.EquirectangularReflectionMapping;
    // scene.background = envMap;
    // scene.environment = envMap;

    // Set home object
    homeObject = earth.mesh

    // Set Control Target
    const initialTargetPosition = setControlTarget(earth.mesh, labelOffset);

    // setControlScale(homeObject.scale.x);
    // camera.position.set(0.0, 0.0, calculateFrameDistance(homeObject));
    setControlFrameDistance(calculateFrameDistance(homeObject));

    // const initialTargetPosition = getTargetPosition(earth.mesh, labelOffset);
    // controls.target = initialTargetPosition;
    // camera.position.add(initialTargetPosition);
    // camera.lookAt(initialTargetPosition);
    // controls.update();
    // setControlScale(earthScale);

    // Create Text
    ttfLoader.load(FONTS.interThin, (json) => {
        const interThinFont = fontLoader.parse(json);
        const baseFontSize = 0.15;
        const baseFontDepth = 0.03;

        // Earth Label
        {
            const textGeometry = new Addons.TextGeometry("Home", {
                font: interThinFont,
                size: baseFontSize * earthScale,
                depth: baseFontDepth * earthScale,
                curveSegments: 2,
                bevelEnabled: false
            });

            const centerOffset = new Three.Vector3();
            textGeometry.computeBoundingBox();
            textGeometry.boundingBox?.getCenter(centerOffset);
            textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

            const textMaterial = new Three.MeshBasicMaterial({ color: 0x000000 });
            const textMesh = new Three.Mesh(textGeometry, textMaterial);

            scene.add(textMesh);

            textMesh.position.copy(initialTargetPosition);
            textMesh.lookAt(camera.position);
            labels.push(textMesh);
        }

        // Moon Label
        {
            const textGeometry = new Addons.TextGeometry("About", {
                font: interThinFont,
                size: baseFontSize * moonScale,
                depth: baseFontDepth * moonScale,
                curveSegments: 2,
                bevelEnabled: false
            });

            const centerOffset = new Three.Vector3();
            textGeometry.computeBoundingBox();
            textGeometry.boundingBox?.getCenter(centerOffset);
            textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

            const textMaterial = new Three.MeshBasicMaterial({ color: 0x000000 });
            const textMesh = new Three.Mesh(textGeometry, textMaterial);

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

    if (!isTraveling) {
        setControlFrameDistance(calculateFrameDistance(currentObject));
    }

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

function calculateFrameWidth() {
    // return Math.min(Math.min(width, height), window.innerWidth * 0.5);
    return Math.min(rect.width, rect.height);
}

function calculateFrameDistance(object: Three.Object3D): number {
    const renderWidthPixels = renderer.getSize(new Three.Vector2).x;
    const desiredWidthPixels = frameWidth * framePercentage;
    const desiredWidthNDC = (desiredWidthPixels / renderWidthPixels) * 2.0;
    // Get the bounding box in world coordinates
    // const boundingBox = new Three.Box3().setFromObject(object);

    // let bbMin = boundingBox.min.clone();
    // let bbMax = boundingBox.max.clone();

    // Convert world coordinates to normalized device coordinates
    // bbMin.project(camera);
    // bbMax.project(camera);

    // console.log(frameWidth);
    
    // const angle = Math.atan(desiredWidthOnScreen / camera.near);
    // console.log(desiredWidthOnScreen * 0.5 / camera.near);
    // console.log(renderer.getSize(new Three.Vector2()).x);
    // Replace with bounding box later?
    // return (1.0 / Math.atan(camera.fov)) * (object.scale.x);

    return 2.0 * object.scale.x * desiredWidthNDC; // Remove object scale to disable relative scaling for all planets
}

// function setControlScale(scale: number) {
//     controlScale = scale;
//     // controls.minDistance = 3.0 * scale;
//     // controls.maxDistance = controls.minDistance;

//     // controls.minDistance = 1.5 * scale;
//     // controls.maxDistance = 12.0 * scale;
//     // controls.maxTargetRadius = 10.0 * scale;
// }

function setControlTarget(targetObject: Three.Object3D, verticalOffset: number): Three.Vector3 {
    const targetPosition = getTargetPosition(targetObject, verticalOffset);
    controls.target = targetPosition;
    //camera.position.add(targetPosition);
    camera.lookAt(targetPosition);
    controls.update();
    // setControlScale(targetObject.scale.y);
    currentObject = targetObject;

    return targetPosition;

    // const targetPosition = targetObject.position.clone();
    // controls.target = targetPosition;
    // camera.lookAt(targetPosition);
    // controls.update();
    // // setControlScale(targetObject.scale.y);
    // currentObject = targetObject;

    // return targetPosition;
}

function setControlFrameDistance(distance: number) {
    frameDistance = distance;
    controls.minDistance = distance;
    controls.maxDistance = distance;
}

function getTargetPosition(object: Three.Object3D, offset: number): Three.Vector3 {
    const targetPosition = object.position.clone();
    targetPosition.y += object.scale.y * (Math.sign(offset) * 0.5 + offset);
    return targetPosition;
    // return object.position.clone();
}

////////////////////////////////
// Scene-specific Logic       //
////////////////////////////////

let isTraveling = false;

function animateControlTarget(object: Three.Object3D, duration: number = 1500) {
    // const oldScale = controlScale;
    const oldFrameDistance = frameDistance;
    // const newScale = object.scale.y;
    const newFrameDistance = calculateFrameDistance(object);
    const targetPosition = getTargetPosition(object, labelOffset);
    // targetPosition.y += newScale * (0.5 + labelOffset);
    controlsTweenGroup.add(new Tween.Tween(controls.target)
        .to(targetPosition, duration) // Target position and duration in milliseconds
        .easing(Tween.Easing.Quadratic.Out) // Optional easing function for smoother animation
        .onStart(() => {
            // controls.enabled = false;
            isTraveling = true;
        })
        .onUpdate((value: Three.Vector3, alpha: number) => {
            // camera.lookAt(controls.target);
            controls.target = value;
            // setControlScale(Three.MathUtils.lerp(oldScale, newScale, alpha));
            setControlFrameDistance(Three.MathUtils.lerp(oldFrameDistance, newFrameDistance, alpha));
        })
        .onComplete(() => {
            // controls.enabled = true;
            isHome = object === homeObject;
            currentObject = object;
            console.log("isHome is " + isHome);
            isTraveling = false;
        })
        .start())
}

function onFrameClicked() {
    console.log("Framing scene...");
}

function onHomeClicked() {
    console.log("Going home...");
    animateControlTarget(homeObject);
}

////////////////////////////////
// Render                     //
////////////////////////////////

recalculateSize();
runUpdateLoop();

////////////////////////////////
// Scene Load                 //
////////////////////////////////

function onSceneLoaded() {
    window.setTimeout(function() {
        const loader = document.getElementById("loader");
        
        if (loader) {
            loader.style.opacity = "0.0";
            loader.addEventListener("transitionend", function() {
                loader.remove();
            });
        }

        const content = document.getElementById("content");
        
        if (content) {
            content.style.opacity = "1.0";
            content.style.visibility = "visible";
        }
    }, 100.0);
}

const onWindowLoaded = () => {
    onSceneLoaded();

    // Three.DefaultLoadingManager.onLoad = () => {
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
