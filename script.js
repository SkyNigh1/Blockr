class Visualizer3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.model = null;
        this.voxelMesh = null;
        this.isVoxelMode = false;
        this.voxelResolution = 20;
        this.voxelColor = 0xaaaaaa;
        this.currentWorker = null;
        this.debounceTimeout = null;
        this.modelScale = 1.0; // Track current scale multiplier
        this.baseScale = 1.0; // Store base scale for reset
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
            voxelSlider: document.getElementById('voxelSlider'),
            voxelRes: document.getElementById('voxelRes'),
            voxelResValue: document.getElementById('voxelResValue'),
            voxelColor: document.getElementById('voxelColor'),
            loading: document.getElementById('loading'),
            progress: document.getElementById('progress'),
            progressPercent: document.getElementById('progressPercent'),
            error: document.getElementById('error')
        };
    }

    init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupLighting();
        this.setupControls();
        this.setupAxes();
        this.setupEventListeners();
        this.animate();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a1a1a);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera.position.set(0, 0, 5);
    }

    setupLighting() {
        const lights = [
            { position: [10, 10, 10], intensity: 0.8 },
            { position: [-10, 10, -10], intensity: 0.5 },
            { position: [0, 10, -10], intensity: 0.3 }
        ];
        lights.forEach(({ position, intensity }) => {
            const light = new THREE.DirectionalLight(0xffffff, intensity);
            light.position.set(...position);
            light.castShadow = true;
            light.shadow.mapSize.set(32, 32);
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 50;
            this.scene.add(light);
        });
        this.scene.add(new THREE.AmbientLight(0x404040));
    }

    setupControls() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
    }

    setupAxes() {
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
    }

    setupEventListeners() {
        this.elements.modelInput.addEventListener('change', (e) => this.loadModel(e));
        this.elements.toggleMode.addEventListener('click', () => this.toggleViewMode());
        this.elements.resetScene.addEventListener('click', () => this.resetScene());
        this.elements.rotateX.addEventListener('click', () => this.rotateModel('x'));
        this.elements.rotateY.addEventListener('click', () => this.rotateModel('y'));
        this.elements.rotateZ.addEventListener('click', () => this.rotateModel('z'));
        this.elements.scaleUp.addEventListener('click', () => this.scaleModel(1.1));
        this.elements.scaleDown.addEventListener('click', () => this.scaleModel(0.9));
        this.elements.voxelRes.addEventListener('input', (e) => this.updateVoxelResolution(e));
        this.elements.voxelColor.addEventListener('input', (e) => this.updateVoxelColor(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    loadModel(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading(true);
        this.clearError();

        const fileName = file.name.toLowerCase();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
                    this.loaders.gltf.parse(e.target.result, '', (gltf) => {
                        console.log('GLTF/GLB loaded successfully:', gltf.scene);
                        this.processModel(gltf.scene);
                    }, (error) => {
                        throw new Error('Erreur lors du parsing GLTF/GLB : ' + error.message);
                    });
                } else if (fileName.endsWith('.obj')) {
                    const objData = e.target.result;
                    const obj = this.loaders.obj.parse(objData);
                    if (!obj.children.length && !obj.isMesh) {
                        throw new Error('Aucun mesh trouvé dans le fichier OBJ.');
                    }
                    console.log('OBJ loaded successfully:', obj);
                    this.processModel(obj);
                } else if (fileName.endsWith('.stl')) {
                    const geometry = this.loaders.stl.parse(e.target.result);
                    if (!geometry.attributes.position) {
                        throw new Error('Géométrie STL invalide.');
                    }
                    geometry.computeVertexNormals();
                    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                    const mesh = new THREE.Mesh(geometry, material);
                    console.log('STL loaded successfully:', mesh);
                    this.processModel(mesh);
                } else {
                    this.showError('Format de fichier non supporté. Utilisez .gltf, .glb, .obj ou .stl.');
                }
            } catch (err) {
                console.error('Erreur lors du chargement du modèle :', err);
                this.showError('Erreur lors du chargement du modèle : ' + err.message);
            } finally {
                this.showLoading(false);
            }
        };
        reader.onerror = () => {
            console.error('Erreur de lecture du fichier :', reader.error);
            this.showError('Erreur de lecture du fichier : ' + reader.error.message);
            this.showLoading(false);
        };
        if (fileName.endsWith('.obj')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    processModel(loadedModel) {
        if (this.model) this.scene.remove(this.model);
        if (this.voxelMesh) this.scene.remove(this.voxelMesh);

        this.model = loadedModel;
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (!child.material || child.material.type === 'MeshBasicMaterial') {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                }
                if (child.geometry && !child.geometry.attributes.normal) {
                    try {
                        child.geometry.computeVertexNormals();
                    } catch (err) {
                        console.warn('Erreur lors du calcul des normales pour le mesh :', err);
                    }
                }
                if (!child.geometry.attributes.position) {
                    console.warn('Mesh sans positions détecté, ignoré.');
                }
            }
        });

        // Compute bounding box and size
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.0001); // Prevent division by zero

        // Normalize scale to fit within a unit cube (target size = 2 units)
        this.baseScale = 2 / maxDim;
        this.modelScale = 1.0; // Reset scale multiplier

        // Apply scale and center the model
        this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
        this.model.position.sub(center.multiplyScalar(this.baseScale));
        this.model.position.set(0, 0, 0); // Ensure exact centering at origin

        // Adjust camera position to frame the model (target size = 2 units)
        const cameraDistance = 2 * 2.5; // 2 units * 2.5 for optimal framing
        this.camera.position.set(0, cameraDistance * 0.5, cameraDistance);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Scale axes helper to match model size (1/2 of model size for visibility)
        this.axesHelper.scale.set(1, 1, 1); // Axes fixed at 1 unit for consistency
        this.scene.add(this.model);
        console.log('Modèle traité :', { maxDim, scale: this.baseScale, center });

        if (this.isVoxelMode) this.updateVoxelModel();
    }

    scaleModel(factor) {
        if (!this.model) return;
        
        this.modelScale *= factor;
        
        // Appliquer l'échelle au modèle original
        this.model.scale.set(
            this.baseScale * this.modelScale,
            this.baseScale * this.modelScale,
            this.baseScale * this.modelScale
        );
        
        // MODIFICATION : Si on est en mode voxel, régénérer les voxels avec la nouvelle échelle
        // au lieu d'appliquer simplement l'échelle au mesh voxel existant
        if (this.isVoxelMode && this.voxelMesh) {
            // Temporairement rendre le modèle visible pour la voxelisation
            this.model.visible = true;
            this.updateVoxelModel();
            // Remettre le modèle invisible après la voxelisation
            setTimeout(() => {
                if (this.model) this.model.visible = false;
            }, 100);
        }
        
        console.log('Échelle mise à jour :', { modelScale: this.modelScale });
    }

    toggleViewMode() {
        this.isVoxelMode = !this.isVoxelMode;
        this.elements.voxelSlider.classList.toggle('hidden', !this.isVoxelMode);
        this.elements.toggleMode.textContent = this.isVoxelMode ? 'Revenir au modèle' : 'Passer en mode voxel';

        if (this.model) {
            this.model.visible = !this.isVoxelMode;
            if (this.isVoxelMode) {
                this.updateVoxelModel();
            } else if (this.voxelMesh) {
                this.scene.remove(this.voxelMesh);
                this.voxelMesh = null;
            }
        }
    }

    rotateModel(axis) {
        if (this.isVoxelMode && this.model) {
            // MODIFICATION : En mode voxel, appliquer la rotation au modèle original puis régénérer les voxels
            this.model.rotation[axis] += Math.PI / 2; // 90 degrees
            
            // Temporairement rendre le modèle visible pour la voxelisation
            this.model.visible = true;
            this.updateVoxelModel();
            // Remettre le modèle invisible après la voxelisation
            setTimeout(() => {
                if (this.model) this.model.visible = false;
            }, 100);
        } else if (this.model) {
            // Mode normal : appliquer directement au modèle
            this.model.rotation[axis] += Math.PI / 2; // 90 degrees
        }
    }

    updateVoxelResolution(event) {
        this.voxelResolution = parseInt(event.target.value);
        this.elements.voxelResValue.textContent = this.voxelResolution;
        if (this.isVoxelMode && this.model) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => this.updateVoxelModel(), 300);
        }
    }

    updateVoxelColor(event) {
        this.voxelColor = parseInt(event.target.value.replace('#', '0x'));
        if (this.isVoxelMode && this.voxelMesh) {
            this.voxelMesh.material.color.set(this.voxelColor);
        }
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
        this.isVoxelMode = false;
        this.modelScale = 1.0;
        this.baseScale = 1.0;
        this.elements.toggleMode.textContent = 'Passer en mode voxel';
        this.elements.voxelSlider.classList.add('hidden');
        this.elements.progress.style.display = 'none';
        this.elements.error.classList.add('hidden');
        this.elements.modelInput.value = '';
        this.elements.voxelRes.value = 20;
        this.elements.voxelResValue.textContent = '20';
        this.elements.voxelColor.value = '#aaaaaa';
        // Reset camera and controls
        this.camera.position.set(0, 0, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    updateVoxelModel() {
        if (!this.model) {
            console.warn('Aucun modèle chargé pour la voxelisation.');
            this.showError('Aucun modèle chargé pour la voxelisation.');
            return;
        }
        if (this.voxelMesh) this.scene.remove(this.voxelMesh);

        if (this.currentWorker) {
            this.currentWorker.terminate();
            this.currentWorker = null;
        }

        this.elements.progress.style.display = 'block';
        this.elements.progressPercent.textContent = '0%';

        this.currentWorker = new Worker(URL.createObjectURL(new Blob([`
            importScripts('https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js');
            importScripts('https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/utils/BufferGeometryUtils.js');

            self.onmessage = function(e) {
                const { voxelResolution, box, triangles } = e.data;
                console.log('Worker received:', { voxelResolution, box, triangleCount: triangles.length });

                // Calculer la taille des voxels pour chaque dimension
                const size = { x: box.size.x, y: box.size.y, z: box.size.z };
                const voxelSize = {
                    x: size.x / voxelResolution,
                    y: size.y / voxelResolution,
                    z: size.z / voxelResolution
                };
                const grid = new Array(voxelResolution).fill().map(() =>
                    new Array(voxelResolution).fill().map(() => new Array(voxelResolution).fill(false))
                );
                let voxelCount = 0;
                let processedVoxels = 0;
                const totalVoxels = voxelResolution * voxelResolution * voxelResolution;

                for (const triangle of triangles) {
                    const { v0, v1, v2 } = triangle;
                    const minX = Math.max(0, Math.floor((Math.min(v0.x, v1.x, v2.x) - box.min.x) / voxelSize.x));
                    const maxX = Math.min(voxelResolution - 1, Math.ceil((Math.max(v0.x, v1.x, v2.x) - box.min.x) / voxelSize.x));
                    const minY = Math.max(0, Math.floor((Math.min(v0.y, v1.y, v2.y) - box.min.y) / voxelSize.y));
                    const maxY = Math.min(voxelResolution - 1, Math.ceil((Math.max(v0.y, v1.y, v2.y) - box.min.y) / voxelSize.y));
                    const minZ = Math.max(0, Math.floor((Math.min(v0.z, v1.z, v2.z) - box.min.z) / voxelSize.z));
                    const maxZ = Math.min(voxelResolution - 1, Math.ceil((Math.max(v0.z, v1.z, v2.z) - box.min.z) / voxelSize.z));

                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                if (!grid[x][y][z]) {
                                    const voxelMin = {
                                        x: box.min.x + x * voxelSize.x,
                                        y: box.min.y + y * voxelSize.y,
                                        z: box.min.z + z * voxelSize.z
                                    };
                                    const voxelMax = {
                                        x: voxelMin.x + voxelSize.x,
                                        y: voxelMin.y + voxelSize.y,
                                        z: voxelMin.z + voxelSize.z
                                    };
                                    if (triangleIntersectsAABB(v0, v1, v2, voxelMin, voxelMax)) {
                                        grid[x][y][z] = true;
                                        voxelCount++;
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

                for (let x = 0; x < voxelResolution; x++) {
                    for (let y = 0; y < voxelResolution; y++) {
                        for (let z = 0; z < voxelResolution; z++) {
                            if (grid[x][y][z]) {
                                const geometry = new THREE.BoxGeometry(voxelSize.x, voxelSize.y, voxelSize.z);
                                // MODIFICATION IMPORTANTE : Positionner les voxels dans l'espace local (centré à l'origine)
                                geometry.translate(
                                    box.min.x + (x + 0.5) * voxelSize.x,
                                    box.min.y + (y + 0.5) * voxelSize.y,
                                    box.min.z + (z + 0.5) * voxelSize.z
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

                // MODIFICATION : Retourner aussi les informations de positionnement
                self.postMessage({
                    positions: finalGeometry.attributes.position.array,
                    indices: finalGeometry.index ? finalGeometry.index.array : [],
                    normals: finalGeometry.attributes.normal ? finalGeometry.attributes.normal.array : [],
                    voxelCount,
                    boundingBox: box, // Ajouter la bounding box pour le positionnement
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
            // MODIFICATION IMPORTANTE : Utiliser la bounding box du modèle dans son espace monde (avec transformations)
            const box = new THREE.Box3().setFromObject(this.model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            if (this.voxelResolution ** 3 > 512 * 512 * 512) {
                this.showError('Résolution trop élevée. Maximum 512.');
                this.elements.progress.style.display = 'none';
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
                this.showError('Aucun triangle trouvé dans le modèle.');
                this.elements.progress.style.display = 'none';
                return;
            }

            this.currentWorker.onmessage = (e) => {
                if (e.data.error) {
                    console.error('Worker error:', e.data.error);
                    this.showError(e.data.error);
                    this.elements.progress.style.display = 'none';
                    this.currentWorker.terminate();
                    this.currentWorker = null;
                    return;
                }
                if (e.data.progress) {
                    this.elements.progressPercent.textContent = `${Math.round(e.data.progress)}%`;
                } else if (e.data.complete) {
                    const { positions, indices, normals, voxelCount, boundingBox } = e.data;
                    console.log('Voxelization complete:', { voxelCount, positionCount: positions.length, indicesCount: indices.length, normalsCount: normals.length });

                    if (voxelCount === 0 || positions.length === 0) {
                        console.warn('No valid voxel data received.');
                        this.showError('Aucun voxel généré.');
                        this.elements.progress.style.display = 'none';
                        this.currentWorker.terminate();
                        this.currentWorker = null;
                        return;
                    }

                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    if (indices.length > 0) {
                        geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
                    }
                    if (normals.length > 0) {
                        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                    }
                    geometry.computeVertexNormals();

                    // Validate geometry
                    if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
                        console.warn('Invalid geometry generated:', geometry);
                        this.showError('Géométrie voxel invalide générée.');
                        this.elements.progress.style.display = 'none';
                        this.currentWorker.terminate();
                        this.currentWorker = null;
                        return;
                    }

                    const material = new THREE.MeshStandardMaterial({
                        color: this.voxelColor,
                        roughness: 0.3,
                        metalness: 0.1,
                        side: THREE.DoubleSide
                    });
                    this.voxelMesh = new THREE.Mesh(geometry, material);
                    this.voxelMesh.castShadow = true;
                    this.voxelMesh.receiveShadow = true;
                    
                    // MODIFICATION CRITIQUE : Le mesh voxel n'a pas besoin de transformation supplémentaire
                    // car il est déjà généré dans l'espace monde du modèle original
                    this.voxelMesh.scale.set(1, 1, 1);
                    this.voxelMesh.position.set(0, 0, 0);

                    this.scene.add(this.voxelMesh);
                    console.log('Voxel mesh added:', { position: this.voxelMesh.position, scale: this.voxelMesh.scale });

                    this.elements.progress.style.display = 'none';
                    this.clearError();
                    this.currentWorker.terminate();
                    this.currentWorker = null;
                }
            };

            this.currentWorker.onerror = (err) => {
                console.error('Erreur dans le Web Worker :', err);
                this.showError('Erreur dans le Web Worker : ' + err.message);
                this.elements.progress.style.display = 'none';
                this.currentWorker.terminate();
                this.currentWorker = null;
            };

            console.log('Sending data to worker:', { voxelResolution: this.voxelResolution, box, triangleCount: triangles.length });
            this.currentWorker.postMessage({ voxelResolution: this.voxelResolution, box: { min: box.min, size }, triangles });
        } catch (err) {
            console.error('Erreur lors de la voxelisation :', err);
            this.showError('Erreur lors de la voxelisation : ' + err.message);
            this.elements.progress.style.display = 'none';
            if (this.currentWorker) {
                this.currentWorker.terminate();
                this.currentWorker = null;
            }
        }
    }

    showError(message) {
        this.elements.error.classList.remove('hidden');
        this.elements.error.textContent = message;
    }

    clearError() {
        this.elements.error.classList.add('hidden');
        this.elements.error.textContent = '';
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new Visualizer3D();
    visualizer.init();
});