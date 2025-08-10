// Main exports for Rendera 3D renderer
export { InstanceManager } from './InstanceManager';
export { Model } from './Model';
export { ModelLoader } from './ModelLoader';
export { AnimationController } from './AnimationController';
export { GPUResourceManager } from './GPUResourceManager';
export { ShadowMapManager } from './ShadowMapManager';
export * from './types';

// Rendera Instance interface (the main Construct 3 plugin instance)
export interface RenderaInstance {
  // Core managers
  instanceManager: InstanceManager;
  modelLoader: ModelLoader;
  gpuResourceManager: GPUResourceManager;
  
  // Public methods
  initialize(): boolean;
  draw(iRenderer: unknown): void;
  getViewMatrix(): any; // mat4 type from gl-matrix
  getProjectionMatrix(): any; // mat4 type from gl-matrix
  getLastLoadedModelPath(): string;
  setUseAnimationWorker(enabled: boolean): void;
  getUseAnimationWorker(): boolean;
  
  // Properties
  initialized: boolean;
  readonly shadowMapManager: any; // ShadowMapManager type
}

// Global declaration for Rendera
declare global {
  interface Window {
    rendera: RenderaInstance;
  }
  
  var rendera: RenderaInstance;
}

export {};
