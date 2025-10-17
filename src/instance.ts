/// <reference path="../ts-defs/editor/sdk.d.ts" />
// rendera-instance.ts - Rendera Controller using Z3D Portable Editor Components
// Uses the individual components from Z3DPortable for consistent behavior with Z3D

import type { RenderaControllerType } from './type';

// Debug flag - set to true to enable console logging for this file
const DEBUG_RENDERA = false;
const log = DEBUG_RENDERA ? console.log.bind(console) : () => {};
const warn = DEBUG_RENDERA ? console.warn.bind(console) : () => {};
const error = console.error.bind(console); // Always show errors

const SDK = (globalThis as any).SDK;
const PLUGIN_CLASS = SDK.Plugins.renderaController;

class RenderaControllerInstance extends SDK.IWorldInstanceBase {
    // Z3D Components
    private _renderer: any; // InstanceRenderer from Z3DPortable
    private _loader: any; // MeshLoader from Z3DPortable
    private _editor: any; // Z3DObjectEditor from Z3DPortable
    private readonly _type: RenderaControllerType; // Shared type from Construct SDK
    
    // State management
    private _initialized: boolean = false;
    private _modelPath: string = '';
    private _tickScheduled: boolean = false;
    private _initAttempts: number = 0;
    private _maxInitAttempts: number = 100;
    private _forceRedrawScheduled: boolean = false;
    
    // Properties expected by Z3D components
    private _skinnedVertices: Float32Array | null = null;
    private _meshVisibility: Record<string, boolean> = {};
    private _lastSkinnedTimestamp: number = 0;
    private _storedDataLoaded: boolean = false;
    
    // Expose underlying Construct instance (needed by EditorHost interface)
    get inst(): any { 
        return (this as any)._inst; 
    }
    
    // Properties expected by MeshLoader/CanvasRenderer
    get mesh() { return this._loader?.mesh || null; }
    get object3d() { return this._loader?.object3d || null; }
    get mixer() { return this._loader?.mixer || null; }
    get currentAction() { return this._loader?.currentAction || null; }
    get skinnedVertices() { return this._skinnedVertices; }
    get hasSkinnedData() { return this._skinnedVertices !== null && this._skinnedVertices.length > 0; }
    get meshVisibility() { return this._meshVisibility; }
    
    constructor(type: RenderaControllerType, inst: any) {
        super(type, inst);
        this._type = type; // Use the shared type from Construct SDK
    }
    
    // ===============================================
    // EditorHost Interface Implementation
    // ===============================================
    
    get propertyMapping(): any {
        return {
            // Position placeholders (use GetX/GetY/GetZElevation)
            positionX: 'x',
            positionY: 'y',
            positionZ: 'z',
            
            // Map to rendera-controller properties
            modelPath: 'model-name',
            z3dJson: 'z3d-json',
            rotationX: 'rotation-x',
            rotationY: 'rotation-y',
            rotationZ: 'rotation-z',
            scaleX: 'scale-x',
            scaleY: 'scale-y',
            scaleZ: 'scale-z',
            uniformScale: 'scale',
            unitScale: 'unit-scale',
            rotationOrder: 'rotation-order',
            wireframe: 'wireframe'
        };
    }

    getPropertyValue(propName: string): any {
        try {
            return this.inst.GetPropertyValue(propName);
        } catch (e) {
            // Property doesn't exist, return undefined
            return undefined;
        }
    }
    
    setPropertyValue(propName: string, value: any): void {
        try {
            this.inst.SetPropertyValue(propName, value);
        } catch (e) {
            // Property doesn't exist, ignore
        }
    }
    
    async getProjectFile(path: string): Promise<ArrayBuffer | null> {
        const proj = this.inst.GetProject();
        const file = proj.GetProjectFileByName(path) || 
                    proj.GetProjectFileByExportPath(path);
        
        if (!file) {
            warn(`[RenderaController] Project file not found: ${path}`);
            return null;
        }
        
        try {
            const blob = await file.GetBlob();
            return await blob.arrayBuffer();
        } catch (err) {
            error(`[RenderaController] Failed to load file ${path}:`, err);
            return null;
        }
    }
    
    onPropertiesChanged(): void {
        this.markDirty();
    }
    
    markDirty(): void {
        if (this._renderer) {
            this._renderer.markDirty();
        }
        this._scheduleForceRedraw();
    }
    
    setOriginalSize(w: number, h: number): void {
        // No-op for rendera - it doesn't track original size
    }
    
    // ===============================================
    // Initialization
    // ===============================================
    
    private async _initializeComponents(): Promise<boolean> {
        if (this._initialized) return true;
        
        this._initAttempts++;
        
        const portable = (globalThis as any).Z3DPortable;
        if (!portable) {
            if (this._initAttempts < this._maxInitAttempts) {
                // Don't log spam, just return false
                return false;
            } else if (this._initAttempts === this._maxInitAttempts) {
                warn('[RenderaController] Z3DPortable not available after', this._maxInitAttempts, 'attempts');
            }
            return false;
        }
        
        const {
            Z3DObjectEditor,
            InstanceRenderer,
            MeshLoader,
            TextureManager,
            initializeThreeJS,
            setInstanceFootprint
        } = portable;

        if (!Z3DObjectEditor || !InstanceRenderer || !MeshLoader || !TextureManager) {
            warn('[RenderaController] Required components not found in Z3DPortable. Available:', Object.keys(portable));
            return false;
        }

        try {
            // Initialize Three.js if available
            if (initializeThreeJS) {
                await initializeThreeJS();
            }
            // Initialize the shared TextureManager only once (first instance creates it)
            if (!this._type.textureManager && TextureManager) {
                this._type.textureManager = new TextureManager(this._type);
                log('[RenderaController] Shared TextureManager initialized for texture caching');
            }

            // Initialize components directly - they handle all behavior
            log('[RenderaController] Creating components with propertyMapping:', this.propertyMapping);
            this._renderer = new InstanceRenderer(this, this._type);
            this._loader = new MeshLoader(this, this._type);
            this._editor = new Z3DObjectEditor(this);
            
            // Register for cleanup
            if ((window as any).__z3dEditors) {
                (window as any).__z3dEditors.add(this._editor);
            }
            
            this._initialized = true;
            log('[RenderaController] Components initialized successfully');
            
            // Start ticking for animations
            this._startTicking();
            return true;
        } catch (err) {
            error('[RenderaController] Failed to initialize components:', err);
            return false;
        }
    }
    
    async doInitialize() {
        if (this._initialized) return;

        // Check if we're in the active layout
        const isActive = this._isInActiveLayout();
        log(`[RenderaController] doInitialize - Layout active: ${isActive}, Model: ${this._modelPath || 'none'}`);

        if (!isActive) {
            log(`[RenderaController] Skipping initialization for inactive layout`);
            return; // Skip initialization for inactive layouts
        }

        if (!await this._initializeComponents()) {
            // Try again later
            this._deferredInit();
        } else if (this._modelPath) {
            // Load model
            this._loadModel(this._modelPath);
        }
    }
    
    private _isInActiveLayout(): boolean {
        try {
            // Check if we have WorldInfo (available in Draw context)
            if (this.inst.GetWorldInfo) {
                const layer = this.inst.GetWorldInfo().GetLayer();
                if (!layer) return false;
                
                const layout = layer.GetLayout();
                if (!layout) return false;
                
                const layoutManager = this.inst.GetProject().GetLayoutManager();
                const activeLayout = layoutManager.GetActiveLayout();
                
                const layoutName = layout.GetName ? layout.GetName() : 'unknown';
                const activeLayoutName = activeLayout?.GetName ? activeLayout.GetName() : 'unknown';
                
                const isActive = layout === activeLayout;
                if (!isActive) {
                    // Only log once per instance
                    if (this._initAttempts === 1) {
                        log(`[RenderaController] Instance in layout '${layoutName}', but active is '${activeLayoutName}'`);
                    }
                }
                
                return isActive;
            } else {
                // No WorldInfo yet (OnCreate context)
                // Default to true, will be checked properly in Draw
                return true;
            }
        } catch (e) {
            // Default to true if we can't determine
            return true;
        }
    }
    
    private _deferredInit() {
        const tryInit = async () => {
            if (await this._initializeComponents()) {
                if (this._modelPath) {
                    this._loadModel(this._modelPath);
                }
            } else {
                requestAnimationFrame(tryInit);
            }
        };
        requestAnimationFrame(tryInit);
    }
    
    // ===============================================
    // Construct 3 SDK Methods
    // ===============================================
    
    OnCreate() {
        // Initialize JSON if needed
        this._ensureJson();
        
        // Get model path
        this._modelPath = (this.inst?.GetPropertyValue?.('model-name') as string) || '';
        
        // Don't initialize immediately in OnCreate
        // Wait for Draw() where we can properly check the layout
        log(`[RenderaController] OnCreate - Model: ${this._modelPath || 'none'}`);
    }
    
    OnPropertyChanged(id: string) {
        // Update stored model path if needed
        if (id === 'model-name') {
            this._modelPath = this.inst.GetPropertyValue('model-name') || '';
            if (this._loader) {
                this._loadModel(this._modelPath);
            }
        }

        // Update bounding box when scale changes
        if (id === 'scale' || id === 'scale-x' || id === 'scale-y' || id === 'scale-z') {
            this._updateBoundingBox();
        }

        // Check for skinned mesh updates in z3d-json
        if (id === 'z3d-json') {
            this._handleSkinnedMeshUpdate();
        }

        // Mark renderer dirty for any property change
        if (this._renderer) {
            this._renderer.markDirty();
        }

        // Update editor if open
        if (this._editor && this._editor.isOpen()) {
            this._editor.updateState();
        }

        this._scheduleForceRedraw();
    }
    
    Draw(r: any, dp: any) {
        // Check if we're in the active layout first
        if (!this._isInActiveLayout()) {
            // Not in active layout, just draw fallback
            this._drawFallback(r);
            return;
        }
        
        // Load stored skinned mesh data on first draw (only for active layout)
        if (!this._storedDataLoaded) {
            this._loadStoredSkinnedMeshData();
        }
        
        // Initialize on draw if not already initialized
        if (!this._initialized) {
            // Try to initialize
            this.doInitialize();
            
            // If still not initialized, draw fallback
            if (!this._initialized) {
                this._drawFallback(r);
                return;
            }
        }
        
        // Let the renderer handle drawing
        if (this._renderer) {
            // Keep redrawing while loading
            if (this._loader?.isLoading) {
                this._scheduleForceRedraw();
            }
            
            this._renderer.draw(r, dp);
        } else {
            this._drawFallback(r);
        }
    }
    
    Release() {
        log('[RenderaController] Release called');
        
        // Stop ticking
        this._tickScheduled = false;
        
        // Unregister from global editors list
        if ((window as any).__z3dEditors && this._editor) {
            (window as any).__z3dEditors.delete(this._editor);
        }
        
        // Dispose components
        try {
            if (this._editor) {
                this._editor.dispose();
            }
            if (this._loader) {
                this._loader.dispose();
            }
            if (this._renderer) {
                this._renderer.dispose();
            }
        } catch (err) {
            error('[RenderaController] Error during release:', err);
        }
        
        this._editor = null;
        this._loader = null;
        this._renderer = null;
        // Don't null out _type since it's shared
    }
    
    HasDoubleTapHandler() { 
        return true; 
    }
    
    OnDoubleTap() {
        this._openZ3DObjectEditor();
    }
    
    _openZ3DObjectEditor() {
        if (this._editor) {
            this._editor.openEditor({
                focus: true,
                centerOnScreen: true
            });
        } else {
            warn('[RenderaController] Editor not initialized');
        }
    }
    
    // ===============================================
    // Helper Methods
    // ===============================================
    
    private _loadModel(path: string) {
        if (!this._loader) return;

        log(`[RenderaController] Loading model: ${path}`);
        this._loader.loadModel(path || '').then(() => {
            log(`[RenderaController] Model loaded: ${path}`);
            this._updateBoundingBox();
            this._scheduleForceRedraw();
        }).catch((err: any) => {
            error(`[RenderaController] Failed to load model: ${path}`, err);
        });
    }

    private _updateBoundingBox(): void {
        // Update Construct 3 instance size based on loaded model and current scale
        if (!this._loader || !this.object3d) return;

        const portable = (globalThis as any).Z3DPortable;
        if (!portable?.setInstanceFootprint) return;

        try {
            portable.setInstanceFootprint(this.inst, this.object3d);
            log('[RenderaController] Updated bounding box');
        } catch (err) {
            error('[RenderaController] Failed to update bounding box:', err);
        }
    }

    private _handleSkinnedMeshUpdate(): void {
        try {
            const jsonStr = this.inst.GetPropertyValue("z3d-json") as string;
            if (!jsonStr) return;
            
            const config = JSON.parse(jsonStr);
            const skinnedMesh = config?.object?.skinnedMesh;
            
            if (!skinnedMesh) {
                // Clear skinned vertices if no data
                this._skinnedVertices = null;
                this._lastSkinnedTimestamp = 0;
                this._meshVisibility = {};
                return;
            }
            
            // Update if we have new data or no data yet
            const shouldUpdate = !this._skinnedVertices || 
                                skinnedMesh.timestamp !== this._lastSkinnedTimestamp;
            
            if (shouldUpdate) {
                this._lastSkinnedTimestamp = skinnedMesh.timestamp;
                
                // Decompress vertices if compressed
                if (skinnedMesh.verticesCompressed) {
                    this._skinnedVertices = this._decompressVertices(skinnedMesh.verticesCompressed);
                } else if (skinnedMesh.vertices) {
                    this._skinnedVertices = new Float32Array(skinnedMesh.vertices);
                }
                
                // Update mesh visibility map
                if (skinnedMesh.meshVisibility) {
                    this._meshVisibility = skinnedMesh.meshVisibility;
                }
                
                // Force redraw with new vertices
                this.markDirty();
                
                // console.log(`[RenderaController] Updated skinned mesh - ${this._skinnedVertices?.length || 0} vertices`);
            }
        } catch (err) {
            error("[RenderaController] Failed to handle skinned mesh update:", err);
        }
    }
    
    private _loadStoredSkinnedMeshData(): void {
        this._storedDataLoaded = true;
        
        try {
            const jsonStr = this.inst.GetPropertyValue("z3d-json") as string;
            if (!jsonStr || jsonStr === "{}") return;
            
            const config = JSON.parse(jsonStr);
            const skinnedMesh = config?.object?.skinnedMesh;
            
            if (skinnedMesh && skinnedMesh.verticesCompressed) {
                log("[RenderaController] Loading stored skinned mesh data");
                
                this._skinnedVertices = this._decompressVertices(skinnedMesh.verticesCompressed);
                this._lastSkinnedTimestamp = skinnedMesh.timestamp || 0;
                
                if (skinnedMesh.meshVisibility) {
                    this._meshVisibility = skinnedMesh.meshVisibility;
                }
                
                log(`[RenderaController] Loaded ${this._skinnedVertices?.length || 0} vertices from stored data`);
                
                this.markDirty();
            }
        } catch (err) {
            error("[RenderaController] Failed to load stored skinned mesh data:", err);
        }
    }
    
    private _decompressVertices(compressed: string): Float32Array {
        try {
            // Base64 decode and convert to Float32Array
            const binaryString = atob(compressed);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Convert to Float32Array (ensuring 4-byte alignment)
            const floatBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            const result = new Float32Array(floatBytes);
            
            // console.log(`[RenderaController] Decompressed: ${bytes.length} bytes -> ${result.length} floats`);
            return result;
        } catch (err) {
            error("[RenderaController] Failed to decompress vertices:", err);
            return new Float32Array();
        }
    }
    
    private _startTicking() {
        // Schedule animation ticks
        const tick = () => {
            if (!this._initialized || !this._tickScheduled) return;
            
            // Check if animation is playing from z3d-json
            try {
                const jsonStr = this.inst.GetPropertyValue('z3d-json');
                if (jsonStr) {
                    const config = JSON.parse(jsonStr);
                    const animState = config?.object?.animation;
                    
                    // Only tick mixer if animation is playing
                    if (animState?.isPlaying && this._loader?.mixer) {
                        this._loader.mixer.update(0.016); // Assume 60fps
                        this._scheduleForceRedraw();
                    }
                }
            } catch (e) {
                // If we can't read state, don't tick
            }
            
            if (this._tickScheduled) {
                requestAnimationFrame(tick);
            }
        };
        
        this._tickScheduled = true;
        requestAnimationFrame(tick);
    }
    
    private _scheduleForceRedraw(): void {
        if (this._forceRedrawScheduled) return;
        
        this._forceRedrawScheduled = true;
        
        requestAnimationFrame(() => {
            this._forceRedrawScheduled = false;
            this._forceRedraw();
        });
    }
    
    private _forceRedraw(): void {
        // Tiny position nudge to force C3 to redraw
        const x = this.inst.GetX();
        this.inst.SetX(x + 0.001);
        this.inst.SetX(x);
    }
    
    private _ensureJson() {
        if (!this.inst?.GetPropertyValue) return;
        
        try {
            const raw = this.inst.GetPropertyValue('z3d-json');
            const cur = typeof raw === 'string' ? raw : '';
            
            if (!cur || cur === '{}' || !cur.trim()) {
                const def = {
                    object: {
                        transform: {
                            delta: {
                                position: { x: 0, y: 0, z: 0 },
                                rotation: { x: 0, y: 0, z: 0 },
                                scale: { x: 1, y: 1, z: 1 }
                            }
                        },
                        animation: {
                            currentAnimation: null,
                            currentTime: 0,
                            isPlaying: false,
                            isLooping: true,
                            playbackSpeed: 1
                        },
                        nodeVisibility: {},
                        skinnedMesh: null
                    }
                };
                this.inst.SetPropertyValue('z3d-json', JSON.stringify(def, null, 2));
            }
        } catch (e) {
            // z3d-json property might not exist, ignore
        }
    }
    
    private _drawFallback(r: any) {
        const x = this.inst.GetX();
        const y = this.inst.GetY();
        const w = this.inst.GetWidth();
        const h = this.inst.GetHeight();
        
        if (w <= 0 || h <= 0) return;
        
        r.SetColorFillMode();
        r.SetColorRgba(0.5, 0.5, 0.5, 0.8);
        r.Rect2(x - w/2, y - h/2, x + w/2, y + h/2);
    }
}

// Register with Construct 3
(PLUGIN_CLASS as any).Instance = RenderaControllerInstance;
export { RenderaControllerInstance };