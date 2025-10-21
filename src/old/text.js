// import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export default function loadText(fontLoader, text, size, height, fontPath, callback) {
    fontLoader.load(fontPath, function (font) {
        callback(new TextGeometry(text, {
            font: font,
            size: size, // 0.3,
            height: height, // 0.25,
            depth: 0.02,
            curveSegments: 4,
            bevelEnabled: false
        }));

        // 'https://esm.sh/@compai/font-lato/data/typefaces/normal-900.json'

        // textGeo.center();
        // const textMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        // const textMesh = new THREE.Mesh(textGeo, textMat);
        // textMesh.position.set(0.0, 3.5, 0.0);
        // // textMesh.castShadow = true;
        // earthMesh.add(textMesh);
        // // textMesh.lookAt(camera.position)
    });
}
