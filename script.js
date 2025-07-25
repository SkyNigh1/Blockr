class Visualizer3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.model = null;
        this.voxelMesh = null;
        this.isVoxelMode = false;
        this.voxelResolution = 20;
        this.voxelColor = 0xa7aedc;
        this.currentWorker = null;
        this.debounceTimeout = null;
        this.modelScale = 1.0;
        this.baseScale = 1.0;
        this.voxelData = null;
        this.loaders = {
            gltf: new THREE.GLTFLoader(),
            obj: new THREE.OBJLoader(),
            stl: new THREE.STLLoader()
        };
        this.elements = {
            modelInput: document.getElementById('modelInput'),
            toggleMode: document.getElementById('toggleMode'),
            resetScene: document.getElementById('resetScene'),
            rotateX: document.getElementById('rotateX'),
            rotateY: document.getElementById('rotateY'),
            rotateZ: document.getElementById('rotateZ'),
            scaleUp: document.getElementById('scaleUp'),
            scaleDown: document.getElementById('scaleDown'),
            resetPosition: document.getElementById('resetPosition'),
            voxelSlider: document.getElementById('voxelSlider'),
            voxelRes: document.getElementById('voxelRes'),
            voxelResValue: document.getElementById('voxelResValue'),
            voxelColor: document.getElementById('voxelColor'),
            exportSchem: document.getElementById('exportSchem'),
            modelStatus: document.getElementById('modelStatus'),
            progress: document.getElementById('progress'),
            progressPercent: document.getElementById('progressPercent'),
            progressFill: document.querySelector('#progress .progress-fill'),
            error: document.getElementById('error')
        };
        this.updateModelStatus('waiting');
        console.log('Visualizer3D constructor: DOM elements initialized:', Object.keys(this.elements).filter(k => this.elements[k]));
    }

    init() {
        console.log('Initializing Visualizer3D...');
        this.setupRenderer();
        this.setupCamera();
        this.setupLighting();
        this.setupControls();
        this.setupAxes();
        this.setupEventListeners();
        this.animate();
        const interfaceElement = document.getElementById('interface');
        if (interfaceElement) {
            interfaceElement.style.display = 'block';
            interfaceElement.style.visibility = 'visible';
            interfaceElement.style.opacity = '1';
            console.log('Interface visibility confirmed.');
        } else {
            console.error('Interface element (#interface) not found in DOM.');
            this.showError('Interface elements missing. Please check HTML structure.');
        }
    }

    setupRenderer() {
        try {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x000000, 0); // Transparent background
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            const canvasContainer = document.getElementById('canvas-container') || document.body;
            canvasContainer.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.position = 'fixed';
            this.renderer.domElement.style.top = '0';
            this.renderer.domElement.style.left = '0';
            this.renderer.domElement.style.zIndex = '1';
            this.renderer.domElement.style.background = 'transparent';
            this.renderer.domElement.style.pointerEvents = 'auto';
            console.log('Renderer initialized:', {
                size: { width: window.innerWidth, height: window.innerHeight },
                canvasAttached: !!canvasContainer.contains(this.renderer.domElement),
                webGLContext: !!this.renderer.getContext()
            });
        } catch (err) {
            console.error('Renderer setup failed:', err);
            this.showError('Failed to initialize WebGL renderer: ' + err.message);
        }
    }

    setupCamera() {
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        console.log('Camera initialized:', {
            position: this.camera.position.toArray(),
            fov: this.camera.fov,
            aspect: this.camera.aspect,
            near: this.camera.near,
            far: this.camera.far
        });
    }

    setupLighting() {
        const lights = [
            { position: [10, 10, 10], intensity: 0.5 },
            { position: [-10, 10, -10], intensity: 0.3 },
            { position: [-10, 10, 10], intensity: 0.5 },
            { position: [10, 10, -10], intensity: 0.3 }
        ];
        lights.forEach(({ position, intensity }, index) => {
            const light = new THREE.DirectionalLight(0xffffff, intensity);
            light.position.set(...position);
            light.castShadow = true;
            light.shadow.mapSize.set(4, 4);
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 50;
            this.scene.add(light);
            console.log(`Light ${index + 1} added:`, { position, intensity });
        });
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        console.log('Ambient light added:', { color: 0x404040, intensity: 0.5 });
    }

    setupControls() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.update();
        console.log('OrbitControls initialized:', {
            damping: this.controls.enableDamping,
            dampingFactor: this.controls.dampingFactor
        });
    }

    setupAxes() {
        this.axesHelper = new THREE.AxesHelper(5);
        this.axesHelper.visible = true;
        this.scene.add(this.axesHelper);
        console.log('AxesHelper added:', {
            visible: this.axesHelper.visible,
            scale: this.axesHelper.scale.toArray()
        });
    }

    setupEventListeners() {
        if (!this.elements.modelInput || !this.elements.toggleMode || !this.elements.exportSchem || !this.elements.modelStatus) {
            console.error('Required DOM elements missing:', this.elements);
            this.showError('Interface elements missing. Please check HTML structure.');
            return;
        }
        this.elements.modelInput.addEventListener('change', (e) => {
            console.log('Model input change:', e.target.files[0]?.name);
            this.loadModel(e);
        });
        this.elements.toggleMode.addEventListener('click', () => {
            console.log('Toggling view mode:', { current: this.isVoxelMode });
            this.toggleViewMode();
        });
        this.elements.resetScene.addEventListener('click', () => {
            console.log('Resetting scene...');
            this.resetScene();
        });
        this.elements.rotateX.addEventListener('click', () => this.rotateModel('x'));
        this.elements.rotateY.addEventListener('click', () => this.rotateModel('y'));
        this.elements.rotateZ.addEventListener('click', () => this.rotateModel('z'));
        this.elements.scaleUp.addEventListener('click', () => this.scaleModel(1.1));
        this.elements.scaleDown.addEventListener('click', () => this.scaleModel(0.9));
        this.elements.resetPosition.addEventListener('click', () => {
            console.log('Resetting model position...');
            this.resetModelPosition();
        });
        this.elements.voxelRes.addEventListener('input', (e) => this.updateVoxelResolution(e));
        this.elements.voxelColor.addEventListener('input', (e) => this.updateVoxelColor(e));
        this.elements.exportSchem.addEventListener('click', () => {
            console.log('Exporting schematic...');
            this.exportToSchematic();
        });
        window.addEventListener('resize', () => this.handleResize());
        console.log('Event listeners set up.');
    }

    loadModel(event) {
        const file = event.target.files[0];
        if (!file) {
            console.warn('No file selected.');
            this.showError('Aucun fichier sélectionné.');
            this.updateModelStatus('waiting');
            return;
        }

        this.updateModelStatus('loading');
        this.clearError();
        console.log('Loading model:', { name: file.name, size: file.size, type: file.type });

        const fileName = file.name.toLowerCase();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
                    this.loaders.gltf.parse(e.target.result, '', (gltf) => {
                        console.log('GLTF/GLB loaded:', { scene: gltf.scene });
                        this.processModel(gltf.scene);
                        this.updateModelStatus('loaded');
                    }, (error) => {
                        throw new Error('Erreur lors du parsing GLTF/GLB : ' + error.message);
                    });
                } else if (fileName.endsWith('.obj')) {
                    const objData = e.target.result;
                    const obj = this.loaders.obj.parse(objData);
                    if (!obj.children.length && !obj.isMesh) {
                        throw new Error('Aucun mesh trouvé dans le fichier OBJ.');
                    }
                    console.log('OBJ loaded:', { object: obj });
                    this.processModel(obj);
                    this.updateModelStatus('loaded');
                } else if (fileName.endsWith('.stl')) {
                    const geometry = this.loaders.stl.parse(e.target.result);
                    if (!geometry.attributes.position) {
                        throw new Error('Géométrie STL invalide.');
                    }
                    geometry.computeVertexNormals();
                    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                    const mesh = new THREE.Mesh(geometry, material);
                    console.log('STL loaded:', { mesh });
                    this.processModel(mesh);
                    this.updateModelStatus('loaded');
                } else {
                    throw new Error('Format de fichier non supporté. Utilisez .gltf, .glb, .obj ou .stl.');
                }
            } catch (err) {
                console.error('Erreur lors du chargement du modèle :', err);
                this.showError('Erreur lors du chargement du modèle : ' + err.message);
                this.updateModelStatus('waiting');
            }
        };
        reader.onerror = () => {
            console.error('Erreur de lecture du fichier :', reader.error);
            this.showError('Erreur de lecture du fichier : ' + reader.error.message);
            this.updateModelStatus('waiting');
        };
        if (fileName.endsWith('.obj')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    processModel(loadedModel) {
        if (this.model) {
            this.scene.remove(this.model);
            console.log('Previous model removed from scene.');
        }
        if (this.voxelMesh) {
            this.scene.remove(this.voxelMesh);
            this.voxelMesh = null;
        }

        this.model = loadedModel;
        let meshCount = 0;
        let hasValidGeometry = false;
        this.model.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                child.castShadow = true;
                child.receiveShadow = true;
                if (!child.material || child.material.type === 'MeshBasicMaterial') {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                }
                if (child.geometry && !child.geometry.attributes.normal) {
                    try {
                        child.geometry.computeVertexNormals();
                        console.log('Computed vertex normals for mesh:', child.name || 'unnamed');
                    } catch (err) {
                        console.warn('Erreur lors du calcul des normales:', err);
                    }
                }
                if (child.geometry?.attributes.position) {
                    hasValidGeometry = true;
                    console.log('Mesh with valid geometry found:', {
                        name: child.name || 'unnamed',
                        vertexCount: child.geometry.attributes.position.count
                    });
                } else {
                    console.warn('Mesh sans positions détecté:', child.name || 'unnamed');
                }
            }
        });

        if (!hasValidGeometry) {
            console.error('No valid geometry found in model.');
            this.showError('Aucun mesh valide trouvé dans le modèle.');
            this.updateModelStatus('waiting');
            return;
        }

        console.log('Model processed:', { meshCount, hasValidGeometry });

        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.0001);

        this.baseScale = 2 / maxDim;
        this.modelScale = 1.0;

        this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
        this.model.position.sub(center.multiplyScalar(this.baseScale));
        this.model.position.set(0, 0, 0);

        const cameraDistance = maxDim * this.baseScale * 2.5;
        this.camera.position.set(0, cameraDistance * 0.5, cameraDistance);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.scene.add(this.model);
        console.log('Model added to scene:', {
            position: this.model.position.toArray(),
            scale: this.model.scale.toArray(),
            boundingBox: { min: box.min.toArray(), max: box.max.toArray() }
        });

        if (this.isVoxelMode) {
            this.updateVoxelModel();
        } else {
            this.model.visible = true;
        }

        this.axesHelper.scale.set(1, 1, 1);
        this.axesHelper.visible = true;
        console.log('AxesHelper updated:', { visible: this.axesHelper.visible });

        this.renderer.render(this.scene, this.camera); // Force immediate render
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    scaleModel(factor) {
        if (!this.model) {
            console.warn('No model to scale.');
            return;
        }

        this.modelScale *= factor;
        this.model.scale.set(
            this.baseScale * this.modelScale,
            this.baseScale * this.modelScale,
            this.baseScale * this.modelScale
        );

        if (this.isVoxelMode && this.voxelMesh) {
            this.model.visible = true;
            this.updateVoxelModel();
            setTimeout(() => {
                if (this.model) this.model.visible = false;
            }, 100);
        }

        console.log('Model scaled:', { modelScale: this.modelScale });
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    toggleViewMode() {
        this.isVoxelMode = !this.isVoxelMode;
        this.elements.voxelSlider.classList.toggle('hidden', !this.isVoxelMode);
        this.elements.toggleMode.textContent = this.isVoxelMode ? 'Revenir au modèle' : 'Passer en mode voxel';
        console.log('View mode toggled:', { isVoxelMode: this.isVoxelMode });

        if (this.model) {
            this.model.visible = !this.isVoxelMode;
            if (this.isVoxelMode) {
                this.updateVoxelModel();
            } else if (this.voxelMesh) {
                this.scene.remove(this.voxelMesh);
                this.voxelMesh = null;
                this.voxelData = null;
                console.log('Voxel mesh removed, voxel data cleared.');
            }
        }
        this.renderer.render(this.scene, this.camera); // Force render
        this.updateExportButton();
        this.ensureInterfaceVisibility();
    }

    rotateModel(axis) {
        if (!this.model) {
            console.warn('No model to rotate.');
            return;
        }
        this.model.rotation[axis] += Math.PI / 4;
        if (this.isVoxelMode) {
            this.model.visible = true;
            this.updateVoxelModel();
            setTimeout(() => {
                if (this.model) this.model.visible = false;
            }, 100);
        }
        console.log(`Model rotated on ${axis}-axis:`, this.model.rotation[axis]);
        this.renderer.render(this.scene, this.camera); // Force render
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    resetModelPosition() {
        if (!this.model) {
            console.warn('No model to reset position.');
            return;
        }

        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        this.model.position.sub(center); // Déplace le modèle pour que son centre soit à (0, 0, 0)

        if (this.isVoxelMode && this.voxelMesh) {
            this.model.visible = true;
            this.updateVoxelModel();
            setTimeout(() => {
                if (this.model) this.model.visible = false;
            }, 100);
        }

        // Réinitialise la cible des contrôles et repositionne la caméra
        this.controls.target.set(0, 0, 0);
        const distance = this.camera.position.distanceTo(this.controls.target); // Distance actuelle
        const offset = new THREE.Vector3(0, distance * 0.5, distance); // Recalcule une position cohérente
        this.camera.position.copy(offset);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        this.controls.update();

        console.log('Model position reset:', { newPosition: this.model.position.toArray(), center: center.toArray(), cameraPosition: this.camera.position.toArray() });
        this.renderer.render(this.scene, this.camera); // Force render
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    updateVoxelResolution(event) {
        this.voxelResolution = parseInt(event.target.value);
        this.elements.voxelResValue.textContent = this.voxelResolution;
        console.log('Voxel resolution updated:', this.voxelResolution);
        if (this.isVoxelMode && this.model) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => this.updateVoxelModel(), 300);
        }
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    updateVoxelColor(event) {
        this.voxelColor = parseInt(event.target.value.replace('#', '0x'));
        if (this.isVoxelMode && this.voxelMesh) {
            this.voxelMesh.material.color.set(this.voxelColor);
            console.log('Voxel color updated:', this.voxelColor);
            this.renderer.render(this.scene, this.camera); // Force render
        }
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    resetScene() {
        if (this.model) this.scene.remove(this.model);
        if (this.voxelMesh) this.scene.remove(this.voxelMesh);
        if (this.currentWorker) {
            this.currentWorker.terminate();
            this.currentWorker = null;
        }
        this.model = null;
        this.voxelMesh = null;
        this.voxelData = null;
        this.isVoxelMode = false;
        this.modelScale = 1.0;
        this.baseScale = 1.0;
        this.elements.toggleMode.textContent = 'Passer en mode voxel';
        this.elements.voxelSlider.classList.add('hidden');
        this.elements.progress.classList.add('hidden');
        this.elements.progressPercent.textContent = '0%';
        this.elements.progressFill.style.width = '0%';
        this.elements.error.classList.add('hidden');
        this.elements.modelInput.value = '';
        this.elements.voxelRes.value = 20;
        this.elements.voxelResValue.textContent = '20';
        this.elements.voxelColor.value = '#aaaaaa';
        this.camera.position.set(0, 0, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.axesHelper.visible = true;
        this.updateModelStatus('waiting');
        console.log('Scene reset.');
        this.renderer.render(this.scene, this.camera); // Force render
        this.ensureInterfaceVisibility();
        this.updateExportButton();
    }

    updateVoxelModel() {
        if (!this.model) {
            console.warn('Aucun modèle chargé pour la voxelisation.');
            this.showError('Aucun modèle chargé pour la voxelisation.');
            this.updateExportButton();
            return;
        }
        if (this.voxelMesh) {
            this.scene.remove(this.voxelMesh);
            this.voxelMesh = null;
        }

        if (this.currentWorker) {
            this.currentWorker.terminate();
            this.currentWorker = null;
        }

        console.log('Starting voxelization...');
        this.elements.progress.classList.remove('hidden');
        this.elements.progress.classList.add('visible');
        this.elements.progressPercent.textContent = '0%';
        this.elements.progressFill.style.width = '0%';
        this.elements.exportSchem.disabled = true;

        this.currentWorker = new Worker(URL.createObjectURL(new Blob([`
            importScripts('https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js');
            importScripts('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/utils/BufferGeometryUtils.js');

            self.onmessage = function(e) {
                const { voxelResolution, box, triangles } = e.data;
                console.log('Worker received:', { voxelResolution, box, triangleCount: triangles.length });

                const maxDim = Math.max(box.size.x, box.size.y, box.size.z);
                const voxelSize = maxDim / voxelResolution;
                const resX = Math.ceil(box.size.x / voxelSize) || 1;
                const resY = Math.ceil(box.size.y / voxelSize) || 1;
                const resZ = Math.ceil(box.size.z / voxelSize) || 1;

                const grid = new Array(resX).fill().map(() =>
                    new Array(resY).fill().map(() => new Array(resZ).fill(false))
                );
                let voxelCount = 0;
                let processedVoxels = 0;
                const totalVoxels = resX * resY * resZ;
                const voxelPositions = [];

                for (const triangle of triangles) {
                    const { v0, v1, v2 } = triangle;
                    const minX = Math.max(0, Math.floor((Math.min(v0.x, v1.x, v2.x) - box.min.x) / voxelSize));
                    const maxX = Math.min(resX - 1, Math.ceil((Math.max(v0.x, v1.x, v2.x) - box.min.x) / voxelSize));
                    const minY = Math.max(0, Math.floor((Math.min(v0.y, v1.y, v2.y) - box.min.y) / voxelSize));
                    const maxY = Math.min(resY - 1, Math.ceil((Math.max(v0.y, v1.y, v2.y) - box.min.y) / voxelSize));
                    const minZ = Math.max(0, Math.floor((Math.min(v0.z, v1.z, v2.z) - box.min.z) / voxelSize));
                    const maxZ = Math.min(resZ - 1, Math.ceil((Math.max(v0.z, v1.z, v2.z) - box.min.z) / voxelSize));

                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                if (!grid[x][y][z]) {
                                    const voxelMin = {
                                        x: box.min.x + x * voxelSize,
                                        y: box.min.y + y * voxelSize,
                                        z: box.min.z + z * voxelSize
                                    };
                                    const voxelMax = {
                                        x: voxelMin.x + voxelSize,
                                        y: voxelMin.y + voxelSize,
                                        z: voxelMin.z + voxelSize
                                    };
                                    if (triangleIntersectsAABB(v0, v1, v2, voxelMin, voxelMax)) {
                                        grid[x][y][z] = true;
                                        voxelCount++;
                                        voxelPositions.push({ x, y, z });
                                    }
                                    processedVoxels++;
                                    if (processedVoxels % 1000 === 0) {
                                        self.postMessage({ progress: Math.min(100, (processedVoxels / totalVoxels) * 100) });
                                    }
                                }
                            }
                        }
                    }
                }

                console.log('Worker: Voxel count:', voxelCount);
                if (voxelCount === 0) {
                    self.postMessage({ error: 'Aucun voxel généré dans le Worker.' });
                    return;
                }

                const geometries = [];
                const maxGeometriesPerBatch = 1000;
                let currentBatch = [];

                for (let x = 0; x < resX; x++) {
                    for (let y = 0; y < resY; y++) {
                        for (let z = 0; z < resZ; z++) {
                            if (grid[x][y][z]) {
                                const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
                                geometry.translate(
                                    box.min.x + (x + 0.5) * voxelSize,
                                    box.min.y + (y + 0.5) * voxelSize,
                                    box.min.z + (z + 0.5) * voxelSize
                                );
                                currentBatch.push(geometry);
                                if (currentBatch.length >= maxGeometriesPerBatch) {
                                    const mergedBatch = THREE.BufferGeometryUtils.mergeBufferGeometries(currentBatch);
                                    if (mergedBatch.attributes.position) {
                                        geometries.push(mergedBatch);
                                    } else {
                                        console.warn('Worker: Merged batch has no position attribute.');
                                    }
                                    currentBatch = [];
                                }
                            }
                        }
                    }
                }

                if (currentBatch.length > 0) {
                    const mergedBatch = THREE.BufferGeometryUtils.mergeBufferGeometries(currentBatch);
                    if (mergedBatch.attributes.position) {
                        geometries.push(mergedBatch);
                    } else {
                        console.warn('Worker: Final merged batch has no position attribute.');
                    }
                }

                self.postMessage({ progress: 100 });

                if (geometries.length === 0) {
                    self.postMessage({ error: 'Aucune géométrie générée dans le Worker.' });
                    return;
                }

                let finalGeometry;
                try {
                    finalGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
                    finalGeometry.computeVertexNormals();
                } catch (err) {
                    self.postMessage({ error: 'Erreur lors de la fusion des géométries : ' + err.message });
                    return;
                }

                if (!finalGeometry.attributes.position || finalGeometry.attributes.position.count === 0) {
                    self.postMessage({ error: 'Aucune géométrie valide générée dans le Worker.' });
                    return;
                }

                console.log('Worker: Final geometry stats:', {
                    positionCount: finalGeometry.attributes.position.count,
                    indicesCount: finalGeometry.index ? finalGeometry.index.count : 0,
                    normalsCount: finalGeometry.attributes.normal ? finalGeometry.attributes.normal.count : 0
                });

                self.postMessage({
                    positions: finalGeometry.attributes.position.array,
                    indices: finalGeometry.index ? finalGeometry.index.array : [],
                    normals: finalGeometry.attributes.normal ? finalGeometry.attributes.normal.array : [],
                    voxelCount,
                    voxelPositions,
                    boundingBox: box,
                    complete: true
                });

                function triangleIntersectsAABB(v0, v1, v2, min, max) {
                    const center = {
                        x: (min.x + max.x) * 0.5,
                        y: (min.y + max.y) * 0.5,
                        z: (min.z + max.z) * 0.5
                    };
                    const extents = {
                        x: (max.x - min.x) * 0.5,
                        y: (max.y - min.y) * 0.5,
                        z: (max.z - min.z) * 0.5
                    };

                    const v0p = { x: v0.x - center.x, y: v0.y - center.y, z: v0.z - center.z };
                    const v1p = { x: v1.x - center.x, y: v1.y - center.y, z: v1.z - center.z };
                    const v2p = { x: v2.x - center.x, y: v2.y - center.y, z: v2.z - center.z };

                    const e0 = { x: v1p.x - v0p.x, y: v1p.y - v0p.y, z: v1p.z - v0p.z };
                    const e1 = { x: v2p.x - v0p.x, y: v2p.y - v0p.y, z: v2p.z - v0p.z };

                    const minX = Math.min(v0p.x, v1p.x, v2p.x);
                    const maxX = Math.max(v0p.x, v1p.x, v2p.x);
                    if (minX > extents.x || maxX < -extents.x) return false;

                    const minY = Math.min(v0p.y, v1p.y, v2p.y);
                    const maxY = Math.max(v0p.y, v1p.y, v2p.y);
                    if (minY > extents.y || maxY < -extents.y) return false;

                    const minZ = Math.min(v0p.z, v1p.z, v2p.z);
                    const maxZ = Math.max(v0p.z, v1p.z, v2p.z);
                    if (minZ > extents.z || maxZ < -extents.z) return false;

                    const normal = {
                        x: e0.y * e1.z - e0.z * e1.y,
                        y: e0.z * e1.x - e0.x * e1.z,
                        z: e0.x * e1.y - e0.y * e1.x
                    };
                    const d = Math.max(
                        Math.abs(Math.min(v0p.x * normal.x + v0p.y * normal.y + v0p.z * normal.z)),
                        Math.abs(Math.max(v0p.x * normal.x + v0p.y * normal.y + v0p.z * normal.z))
                    );
                    const r = extents.x * Math.abs(normal.x) + extents.y * Math.abs(normal.y) + extents.z * Math.abs(normal.z);
                    return d <= r;
                }
            };
        `], { type: 'application/javascript' })));

        try {
            const box = new THREE.Box3().setFromObject(this.model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
            const voxelSize = maxDim / this.voxelResolution;
            const resX = Math.ceil(size.x / voxelSize) || 1;
            const resY = Math.ceil(size.y / voxelSize) || 1;
            const resZ = Math.ceil(size.z / voxelSize) || 1;

            if ((resX * resY * resZ) > 512 * 512 * 512) {
                console.warn('Voxel resolution too high:', { resX, resY, resZ });
                this.showError('Résolution trop élevée. Maximum 512 par dimension.');
                this.elements.progress.classList.add('hidden');
                this.elements.progress.classList.remove('visible');
                this.elements.progressFill.style.width = '0%';
                this.updateExportButton();
                return;
            }

            const triangles = [];
            this.model.traverse((child) => {
                if (child.isMesh && child.geometry.isBufferGeometry) {
                    const pos = child.geometry.attributes.position;
                    const indices = child.geometry.index ? child.geometry.index.array : null;
                    const matrix = child.matrixWorld;
                    for (let i = 0; i < (indices ? indices.length : pos.count); i += 3) {
                        const idx = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2];
                        const v0 = new THREE.Vector3().fromBufferAttribute(pos, idx[0]).applyMatrix4(matrix);
                        const v1 = new THREE.Vector3().fromBufferAttribute(pos, idx[1]).applyMatrix4(matrix);
                        const v2 = new THREE.Vector3().fromBufferAttribute(pos, idx[2]).applyMatrix4(matrix);
                        triangles.push({ v0, v1, v2 });
                    }
                }
            });

            console.log('Triangles collected:', triangles.length);
            if (triangles.length === 0) {
                console.warn('No triangles found in model.');
                this.showError('Aucun triangle trouvé dans le modèle.');
                this.elements.progress.classList.add('hidden');
                this.elements.progress.classList.remove('visible');
                this.elements.progressFill.style.width = '0%';
                this.updateExportButton();
                return;
            }

            this.currentWorker.onmessage = (e) => {
                console.log('Worker message:', e.data);
                if (e.data.error) {
                    console.error('Worker error:', e.data.error);
                    this.showError(e.data.error);
                    this.elements.progress.classList.add('hidden');
                    this.elements.progress.classList.remove('visible');
                    this.elements.progressFill.style.width = '0%';
                    this.currentWorker.terminate();
                    this.currentWorker = null;
                    this.updateExportButton();
                    return;
                }
                if (e.data.progress) {
                    const progress = Math.round(e.data.progress);
                    console.log('Voxelization progress:', progress);
                    this.elements.progressPercent.textContent = `${progress}%`;
                    this.elements.progressFill.style.width = `${progress}%`;
                } else if (e.data.complete) {
                    const { positions, indices, normals, voxelCount, voxelPositions, boundingBox } = e.data;
                    console.log('Voxelization complete:', { voxelCount, positionCount: positions.length });

                    if (voxelCount === 0 || positions.length === 0) {
                        console.warn('No valid voxel data.');
                        this.showError('Aucun voxel généré.');
                        this.elements.progress.classList.add('hidden');
                        this.elements.progress.classList.remove('visible');
                        this.elements.progressFill.style.width = '0%';
                        this.currentWorker.terminate();
                        this.currentWorker = null;
                        this.updateExportButton();
                        return;
                    }

                    this.voxelData = { voxelPositions, voxelSize, boundingBox };

                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    if (indices.length > 0) {
                        geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
                    }
                    if (normals.length > 0) {
                        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                    }
                    geometry.computeVertexNormals();

                    if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
                        console.warn('Invalid voxel geometry:', geometry);
                        this.showError('Géométrie voxel invalide générée.');
                        this.elements.progress.classList.add('hidden');
                        this.elements.progress.classList.remove('visible');
                        this.elements.progressFill.style.width = '0%';
                        this.currentWorker.terminate();
                        this.currentWorker = null;
                        this.updateExportButton();
                        return;
                    }

                    const material = new THREE.MeshStandardMaterial({
                        color: this.voxelColor,
                        roughness: 1,
                        metalness: 0,
                        side: THREE.DoubleSide
                    });
                    this.voxelMesh = new THREE.Mesh(geometry, material);
                    this.voxelMesh.castShadow = true;
                    this.voxelMesh.receiveShadow = true;
                    this.voxelMesh.position.set(0, 0, 0);
                    this.scene.add(this.voxelMesh);
                    console.log('Voxel mesh added:', {
                        position: this.voxelMesh.position.toArray(),
                        vertexCount: geometry.attributes.position.count
                    });

                    this.elements.progress.classList.add('hidden');
                    this.elements.progress.classList.remove('visible');
                    this.elements.progressFill.style.width = '0%';
                    this.clearError();
                    this.currentWorker.terminate();
                    this.currentWorker = null;
                    this.renderer.render(this.scene, this.camera); // Force render
                    this.updateExportButton();
                }
            };

            this.currentWorker.onerror = (err) => {
                console.error('Worker error:', err);
                this.showError('Erreur dans le Web Worker : ' + err.message);
                this.elements.progress.classList.add('hidden');
                this.elements.progress.classList.remove('visible');
                this.elements.progressFill.style.width = '0%';
                this.currentWorker.terminate();
                this.currentWorker = null;
                this.updateExportButton();
            };

            console.log('Sending data to worker:', { voxelResolution: this.voxelResolution, triangleCount: triangles.length });
            this.currentWorker.postMessage({ voxelResolution: this.voxelResolution, box: { min: box.min, size }, triangles });
        } catch (err) {
            console.error('Voxelization error:', err);
            this.showError('Erreur lors de la voxelisation : ' + err.message);
            this.elements.progress.classList.add('hidden');
            this.elements.progress.classList.remove('visible');
            this.elements.progressFill.style.width = '0%';
            if (this.currentWorker) {
                this.currentWorker.terminate();
                this.currentWorker = null;
            }
            this.updateExportButton();
        }
        this.ensureInterfaceVisibility();
    }

    updateExportButton() {
        if (this.elements.exportSchem) {
            this.elements.exportSchem.disabled = !this.isVoxelMode || this.currentWorker || !this.voxelData || !this.voxelMesh;
            console.log('Export button state:', {
                isVoxelMode: this.isVoxelMode,
                hasWorker: !!this.currentWorker,
                hasVoxelData: !!this.voxelData,
                hasVoxelMesh: !!this.voxelMesh
            });
        }
    }

    exportToSchematic() {
        if (!this.voxelData || !this.voxelMesh) {
            console.warn('No voxel data for export.');
            this.showError('Aucune donnée voxel disponible pour l\'exportation.');
            return;
        }

        try {
            const hexColor = this.voxelColor.toString(16).padStart(6, '0');
            const r = parseInt(hexColor.substr(0, 2), 16);
            const g = parseInt(hexColor.substr(2, 2), 16);
            const b = parseInt(hexColor.substr(4, 2), 16);
            const blockId = this.getClosestMinecraftBlockId(r, g, b);

            const generator = new SchematicGenerator(this.voxelData, blockId);
            const result = generator.generateSchematic();

            const { blob, filename, dimensions, blockCount } = result;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Schematic exported:', {
                filename,
                dimensions,
                blockCount
            });
        } catch (err) {
            console.error('Export error:', err);
            this.showError('Erreur lors de l\'exportation en .schematic : ' + err.message);
        }
    }

    getClosestMinecraftBlockId(r, g, b) {
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (r > g && r > b) {
            return brightness > 0.5 ? 35 : 159;
        } else if (g > r && g > b) {
            return brightness > 0.5 ? 35 : 159;
        } else if (b > r && b > g) {
            return brightness > 0.5 ? 35 : 159;
        } else {
            if (brightness > 0.8) return 35;
            else if (brightness > 0.6) return 35;
            else if (brightness > 0.4) return 35;
            else if (brightness > 0.2) return 35;
            else return 49;
        }
    }

    ensureInterfaceVisibility() {
        const interfaceElement = document.getElementById('interface');
        if (interfaceElement) {
            interfaceElement.style.display = 'block';
            interfaceElement.style.visibility = 'visible';
            interfaceElement.style.opacity = '1';
            console.log('Interface visibility ensured.');
        } else {
            console.error('Interface element (#interface) not found.');
        }
    }

    showError(message) {
        if (this.elements.error) {
            this.elements.error.classList.remove('hidden');
            this.elements.error.classList.add('visible');
            this.elements.error.textContent = message;
            console.log('Error displayed:', message);
        }
        this.ensureInterfaceVisibility();
    }

    clearError() {
        if (this.elements.error) {
            this.elements.error.classList.add('hidden');
            this.elements.error.classList.remove('visible');
            this.elements.error.textContent = '';
            console.log('Error cleared.');
        }
        this.ensureInterfaceVisibility();
    }

    updateModelStatus(state) {
        if (!this.elements.modelStatus) {
            console.error('modelStatus element missing.');
            return;
        }
        this.elements.modelStatus.className = 'status-message';
        const logoHtml = '<div class="logo-container"><img src="img/logo.png" alt="Logo" style="width: 71px; height: 24px;"></div>';
        let statusContent = '';
        switch (state) {
            case 'waiting':
                statusContent = '<div class="status-content"><span class="status-symbol"></span><span>En attente de modèle</span></div>';
                this.elements.modelStatus.classList.add('visible');
                break;
            case 'loading':
                statusContent = '<div class="status-content"><span class="status-symbol">⟳</span><span>Chargement du modèle...</span></div>';
                this.elements.modelStatus.classList.add('loading', 'visible');
                break;
            case 'loaded':
                statusContent = '<div class="status-content"><span class="status-symbol">✓</span><span>Modèle chargé</span></div>';
                this.elements.modelStatus.classList.add('loaded', 'visible');
                break;
        }
        this.elements.modelStatus.innerHTML = logoHtml + statusContent;
        console.log('Model status updated:', state);
        this.ensureInterfaceVisibility();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        console.log('Window resized:', {
            width: window.innerWidth,
            height: window.innerHeight,
            aspect: this.camera.aspect
        });
        this.renderer.render(this.scene, this.camera); // Force render
        this.ensureInterfaceVisibility();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

class SchematicGenerator {
    constructor(voxelData, blockId) {
        this.voxelData = voxelData;
        this.blockId = blockId;
        this.voxelPositions = voxelData.voxelPositions;
        this.voxelSize = voxelData.voxelSize;
        this.boundingBox = voxelData.boundingBox;
    }

    generateSchematic() {
        const minX = Math.min(...this.voxelPositions.map(p => p.x));
        const maxX = Math.max(...this.voxelPositions.map(p => p.x));
        const minY = Math.min(...this.voxelPositions.map(p => p.y));
        const maxY = Math.max(...this.voxelPositions.map(p => p.y));
        const minZ = Math.min(...this.voxelPositions.map(p => p.z));
        const maxZ = Math.max(...this.voxelPositions.map(p => p.z));

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const length = maxZ - minZ + 1;

        const volume = width * height * length;
        const blocks = new Uint8Array(volume).fill(0);
        const data = new Uint8Array(volume).fill(0);

        for (const pos of this.voxelPositions) {
            const x = pos.x - minX;
            const y = pos.y - minY;
            const z = pos.z - minZ;
            const index = x + z * width + y * width * length;
            blocks[index] = this.blockId;
        }

        const nbtData = {
            name: 'Schematic',
            value: {
                Width: { type: 'short', value: width },
                Height: { type: 'short', value: height },
                Length: { type: 'short', value: length },
                Materials: { type: 'string', value: 'Alpha' },
                Blocks: { type: 'byteArray', value: blocks },
                Data: { type: 'byteArray', value: data },
                WEOffsetX: { type: 'int', value: 0 },
                WEOffsetY: { type: 'int', value: 0 },
                WEOffsetZ: { type: 'int', value: 0 }
            }
        };

        const nbtBuffer = this.writeNBT(nbtData);
        const compressed = this.gzipCompress(nbtBuffer);

        return {
            blob: new Blob([compressed], { type: 'application/octet-stream' }),
            filename: 'model.schematic',
            dimensions: { width, height, length },
            blockCount: this.voxelPositions.length,
            blockId: this.blockId
        };
    }

    writeNBT(data) {
        const buffer = [];
        buffer.push(0x0A);
        this.writeString(data.name || 'Schematic', buffer);
        this.writeCompoundContent(data.value, buffer);
        return new Uint8Array(buffer);
    }

    writeCompoundContent(compound, buffer) {
        for (const [key, tag] of Object.entries(compound)) {
            this.writeNBTTag(tag, key, buffer);
        }
        buffer.push(0x00);
    }

    writeNBTTag(tag, name, buffer) {
        const tagId = this.getTagId(tag.type);
        buffer.push(tagId);
        this.writeString(name, buffer);

        switch (tag.type) {
            case 'compound':
                this.writeCompoundContent(tag.value, buffer);
                break;
            case 'int':
                this.writeInt32(tag.value, buffer);
                break;
            case 'short':
                this.writeInt16(tag.value, buffer);
                break;
            case 'byteArray':
                this.writeInt32(tag.value.length, buffer);
                for (let i = 0; i < tag.value.length; i++) {
                    buffer.push(tag.value[i] & 0xFF);
                }
                break;
            case 'string':
                this.writeString(tag.value, buffer);
                break;
        }
    }

    writeInt32(value, buffer) {
        buffer.push(
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        );
    }

    writeInt16(value, buffer) {
        buffer.push(
            (value >> 8) & 0xFF,
            value & 0xFF
        );
    }

    writeString(str, buffer) {
        const bytes = new TextEncoder().encode(str);
        buffer.push((bytes.length >> 8) & 0xFF, bytes.length & 0xFF);
        bytes.forEach(byte => buffer.push(byte));
    }

    getTagId(type) {
        const tagIds = {
            'byte': 0x01,
            'short': 0x02,
            'int': 0x03,
            'long': 0x04,
            'float': 0x05,
            'double': 0x06,
            'byteArray': 0x07,
            'string': 0x08,
            'list': 0x09,
            'compound': 0x0A,
            'intArray': 0x0B,
            'longArray': 0x0C
        };
        return tagIds[type] || 0x00;
    }

    gzipCompress(data) {
        if (typeof pako === 'undefined') {
            throw new Error('Pako library not found');
        }
        return pako.gzip(data);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing Visualizer3D...');
    const visualizer = new Visualizer3D();
    visualizer.init();
});