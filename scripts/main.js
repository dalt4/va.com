import '../styles/style.scss'
import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    LoadingManager,
    CubeTextureLoader,
    Group,
    MeshStandardMaterial,
    Mesh,
    TextureLoader,
    Vector3,
    Clock,
    Vector2,
    PointLight,
    PlaneGeometry,
} from 'three'

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

import {
    BloomEffect,
    EffectComposer,
    EffectPass,
    RenderPass,
    SMAAEffect,

} from "postprocessing";

document.querySelector('#app').innerHTML = `
 <div class="content">
    <nav>
        <a href="https://t.me/powerwebb" target="blank">telegram</a>
        <a href="https://wa.me/79160273719" target="blank">whatsapp</a>
        <a href="https://www.upwork.com/freelancers/~011a6124386f98c473?viewMode=1" target="blank">upwork</a>
    </nav>
    <h1>
        <span>V</span><span>a</span><span>s</span><span>i</span><span>l</span><span>i</span><span>y</span> <span>A</span><span>n</span><span>i</span><span>k</span><span>i</span><span>n</span>
    </h1>
    <p>3d visualization for websites</p>
    <a href="https://dalt4444.com/" class="sign" target="blank">©dalt4444, 2021</a>
</div>
<div class="container3d"></div>
`

let renderer,
    scene,
    camera;

// const T = THREE;

/**
 * Loads scene assets.
 *
 * @return {Promise} Returns loaded assets when ready.
 */

function load() {

    const assets = new Map();
    const loadingManager = new LoadingManager();

    const gltfLoader = new GLTFLoader(loadingManager);
    const ring = '../models/scene.glb';


    const cubeLoader = new CubeTextureLoader(loadingManager);
    const textureLoader = new TextureLoader(loadingManager);
    const starPath = '../img/star.png'
    const sidePaths = [
        '../img/px.png',
        '../img/nx.png',
        '../img/py.png',
        '../img/ny.png',
        '../img/pz.png',
        '../img/nz.png',
    ];

    return new Promise((resolve, reject) => {

        loadingManager.onError = reject;
        loadingManager.onProgress = (item, loaded, total) => {

            if(loaded === total) {

                resolve(assets);

            }

        };

        gltfLoader.load(ring, function(gltf) {

            assets.set("gltf-scene", gltf.scene);

        });

        let star = textureLoader.load(starPath)
        let skyBox = cubeLoader.load(sidePaths);

        loadingManager.onLoad = () => {
            assets.set("skyBox", skyBox);
            assets.set("star", star);
        }

        const searchImage = new Image(), areaImage = new Image();

        searchImage.addEventListener("load", function() {

            assets.set("smaa-search", this);
            loadingManager.itemEnd("smaa-search");

        });

        areaImage.addEventListener("load", function() {

            assets.set("smaa-area", this);
            loadingManager.itemEnd("smaa-area");

        });

        loadingManager.itemStart("smaa-search");
        loadingManager.itemStart("smaa-area");

        searchImage.src = SMAAEffect.searchImageDataURL;
        areaImage.src = SMAAEffect.areaImageDataURL;

    });

}

function initialize(assets) {

    let mainMirrorGroup,
        mirrorGroup,
        mirrorGroup2,
        mirrorGroup3,
        pointRed;

    let mouse = Vector2

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const container3d = document.querySelector('.container3d')

    const clock = new Clock();

    renderer = new WebGLRenderer({
        powerPreference: "high-performance",
        antialias: false,
        stencil: false,
        depth: false
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000);
    renderer.physicallyCorrectLights = true;
    window.innerWidth <= 1920 ? renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)) : ''
    container3d.appendChild(renderer.domElement);


    scene = new Scene();
    scene.environment = assets.get('skyBox')

    camera = new PerspectiveCamera(
        30,
        aspect,
        .1,
        500
    )
    camera.lookAt(scene.position);
    camera.position.z = 50

    //---------------------------------------------------------------------------------meshes-------------------------//

    mirrorGroup = assets.get('gltf-scene')
    mainMirrorGroup = new Group()

    mainMirrorGroup.add(mirrorGroup)

    mirrorGroup2 = mirrorGroup.clone()

    mirrorGroup2.scale.set(.945,.945,.945)

    mainMirrorGroup.add(mirrorGroup2)

    mirrorGroup3 = mirrorGroup.clone()

    mirrorGroup3.scale.set(.893,.893,.893)

    mainMirrorGroup.add(mirrorGroup3)

    scene.add(mainMirrorGroup)

    mainMirrorGroup.rotation.z = Math.PI*.25

    //------point red

    pointRed = new PointLight(0x0000ff, 150, 20, 2)

    scene.add(pointRed)

    let pg = new PlaneGeometry(100,100,1,1)
    let pm = new MeshStandardMaterial({
        color: 0xffffff,
        envMapIntensity: 0
    })
    let pl = new Mesh(pg, pm)
    pl.position.set(0,0,-10)
    scene.add(pl)



    //---------------------------------------------------------------------------------interactions-------------------//


let contentDiv = document.querySelector('.content')
    contentDiv.onmousemove = (function (e) {

        e.preventDefault();
        mouse.x = (e.clientX / document.documentElement.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - pageYOffset) / document.documentElement.clientHeight) * 2 + 1;

        let vector = new Vector3(mouse.x, mouse.y, 5);
        vector.unproject( camera );
        let dir = vector.sub( camera.position ).normalize();
        let distance = - camera.position.z / dir.z;
        let pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
        pointRed.position.copy(pos)
    })



    //++++++++++++++++++++++++postprocessing
    const composer = new EffectComposer(renderer);

    const smaaEffect = new SMAAEffect(
        assets.get("smaa-search"),
        assets.get("smaa-area")
    );




    const bloom = new BloomEffect({
        intensity: 1.2,
        luminanceThreshold: .0,
        kernelSize: 5,
        // luminanceSmoothing: .3
    })




    const renderPass = new RenderPass(scene, camera);
    const smaaPass = new EffectPass(camera, smaaEffect);
    const effectPass = new EffectPass(
        camera,
        // bloom,
    );

    effectPass.renderToScreen = true;

    composer.addPass(renderPass);
    composer.addPass(smaaPass);
    composer.addPass(effectPass);

    /**
     * Handles browser resizing.
     *
     * @private
     * @param {Event} event - An event.
     */

    window.addEventListener("resize", (function() {

        let id = 0;

        function handleResize(event) {


            const width = event.target.innerWidth;
            const height = event.target.innerHeight;

            composer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            id = 0;

        }

        return function onResize(event) {

            if(id === 0) {

                id = setTimeout(handleResize, 66, event);

            }

        };

    })());

    /**
     * The main render loop.
     *
     * @private
     * @param {DOMHighResTimeStamp} now - An execution timestamp.
     */

    (function render(now) {

        mainMirrorGroup.rotation.x += .02

        mirrorGroup2.rotation.x += .02
        mirrorGroup3.rotation.y += .02

        requestAnimationFrame(render);
        composer.render(clock.getDelta());

    })();

}

load().then(initialize).catch(console.error);
