/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { InstanceManager, ModelLoader, GPUResourceManager } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController = class DrawingPlugin extends globalThis.ISDKPluginBase
{
	constructor()
	{
		super();
	}
};

// Necessary for TypeScript to treat this file as a module
export {}