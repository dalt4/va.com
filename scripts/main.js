import '../styles/style.scss'
import {gsap} from "gsap";
import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    LoadingManager,
    Group,
    Mesh,
    Vector3,
    Clock,
    Vector2,
    PointLight,
    PlaneGeometry,
    MeshPhysicalMaterial,
    PMREMGenerator,
    DoubleSide,
    ACESFilmicToneMapping,
} from 'three'

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

import {
    BloomEffect,
    EffectComposer,
    EffectPass,
    RenderPass,
    SMAAEffect,

} from "postprocessing";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader";

document.querySelector('#app').innerHTML = `

  <a href="https://www.youtube.com/user/dalt4444" target="blank" class="youtube"><span>youtube channel</span></a>
  <nav>
      <a href="https://t.me/powerwebb" target="blank">telegram</a>
<!--      <a href="mailto:">dalt4@yandex.ru</a>-->
      <a href="https://three-js.ru/" target="_blank">showroom</a>
<!--      <a href="https://www.upwork.com/freelancers/~011a6124386f98c473?viewMode=1" target="blank">upwork</a>-->
  </nav>
  <div class="main-title">
      <h1>
          <span>V</span><span>a</span><span>s</span><span>i</span><span>l</span><span>i</span><span>y</span> <span>A</span><span>n</span><span>i</span><span>k</span><span>i</span><span>n</span>
      </h1>
      <p>3d visualization for websites</p>
  </div>
  
  <div class="container3d"></div>
`
{

    let youtube = document.querySelector('.youtube')
    let span = youtube.querySelector('span')
    let t1 = gsap.timeline({paused: true})
    t1.to(span, {
        x: '110%',
        letterSpacing: '.02em',
        duration: .6
    })
    t1.to(span, {
        opacity: 1,
        duration: .4,
        delay: .2
    }, '<')
    youtube.onmouseenter = () => t1.play()
    youtube.onmouseleave = () => t1.reverse()

}

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

    gltfLoader.load('../models/scene.glb', gltf => {
        assets.set('ring', gltf.scene)
    })


    const rgbeLoader = new RGBELoader(loadingManager)
    rgbeLoader
      .setPath(`/img/`)
      .load('brown_photostudio_06_1k.hdr', t => {
          assets.set('environment', t)
      })

    return new Promise((resolve, reject) => {

        loadingManager.onError = reject;
        loadingManager.onProgress = (item, loaded, total) => {

            if(loaded === total) {

                resolve(assets);

            }

        };


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
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.exposure = .5


    scene = new Scene();
    scene.environment = new PMREMGenerator(renderer).fromCubemap(assets.get('environment')).texture

    camera = new PerspectiveCamera(
        30,
        aspect,
        .1,
        500
    )
    camera.lookAt(scene.position);
    camera.position.z = 50

    //---------------------------------------------------------------------------------meshes-------------------------//

    mirrorGroup = assets.get('ring')
    mirrorGroup.traverse(node => {
        if(node.material) {
            node.material = new MeshPhysicalMaterial({
                color: 'white',
                metalness: .8,
                roughness: .1,
                envMapIntensity: .7,
                side: DoubleSide,
                clearcoat: true,
                clearcoatRoughness: 0
            })
            node.material.needsUpdate = true
        }
    })
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
    let pm = new MeshPhysicalMaterial({
        color: 0xffffff,
        envMapIntensity: 0
    })
    let pl = new Mesh(pg, pm)
    pl.position.set(0,0,-10)
    scene.add(pl)



    //---------------------------------------------------------------------------------interactions-------------------//


    document.body.onmousemove = (function (e) {

        e.preventDefault();
        mouse.x = (e.clientX / document.documentElement.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - scrollY) / document.documentElement.clientHeight) * 2 + 1;

        let vector = new Vector3(mouse.x, mouse.y, .5);
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

    const Bloom = new BloomEffect({
        luminanceThreshold: .90,
        intensity: 1,
        mipmapBlur: true,
        radius: .5,
        resolutionScale: 1
    });


    const renderPass = new RenderPass(scene, camera);
    const smaaPass = new EffectPass(camera, smaaEffect);
    const effectPass = new EffectPass(
        camera,
        Bloom
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

    (function render() {

        mainMirrorGroup.rotation.x += .015
        mirrorGroup.rotation.z += .015
        mirrorGroup2.rotation.x += .015
        mirrorGroup3.rotation.y += .015

        requestAnimationFrame(render);
        composer.render(clock.getDelta());

    })();

}

load().then(initialize).catch(console.error);
