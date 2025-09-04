/*─────────────────────────────────────────────────────────────────────────────
  Rendera Controller – editor TYPE
  Holds shared data across all rendera instances while in the editor.
  Mimics Z3D Object's type.ts structure for consistent resource sharing.
─────────────────────────────────────────────────────────────────────────────*/

/// <reference path="../ts-defs/editor/sdk.d.ts" />

const SDK = (globalThis as any).SDK;
const PLUGIN_CLASS = SDK.Plugins.renderaController;

/* helper types */
type ImageLike = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
interface TexEntry { tex: SDK.Gfx.IWebGLTexture; ref: number; }

export interface MeshCacheEntry {
    /* data common to both editor & runtime meshes */
    pos: Float32Array;
    uv: Float32Array;
    bbox: { min: [number, number, number]; max: [number, number, number] };
    sub: any[];
    clips: any[]; // AnimationClip[]
    scene: any; // THREE.Scene
    
    /* editor-only */
    center?: [number, number, number];
}

/*──────────────────────── TYPE class ────────────────────────*/
class RenderaControllerType extends SDK.ITypeBase {
    
    /* Parsed GLBs shared by all instances of this type (in the editor) */
    readonly meshCache = 
        new Map<string, MeshCacheEntry | Promise<MeshCacheEntry>>();
    
    /* Per-renderer texture caches (renderer → { key → {tex,ref} }) */
    readonly textureCaches = 
        new WeakMap<any, Map<string|ImageLike, TexEntry>>();
    
    /* Texture manager for handling texture uploads and caching */
    textureManager?: any; // Will be set by first instance
    
    constructor(plugin: SDK.IPluginBase, iObjType: SDK.IObjectType) {
        super(plugin, iObjType);
    }
    
    /*──────────── Type cleanup – called when the very last instance is destroyed */
    Release(): void {
        /* Mesh cache can be purged */
        this.meshCache.clear();
        
        /* NOTE: textureCaches is a WeakMap – it automatically releases 
           its contents when the renderer is GC'd */
    }
}

/* Register with Construct */
PLUGIN_CLASS.Type = RenderaControllerType;

/* Export for use by instances */
export type {
    RenderaControllerType,
    RenderaControllerType as SDKRuntimeTypeClass
};