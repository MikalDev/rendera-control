/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { InstanceManager, ModelId } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController.Type = class DrawingType extends globalThis.ISDKObjectTypeBase<SDKInstanceClass>
{
	constructor()
	{
		super();
	}
	
	_onCreate()
	{
		this.runtime.assets.loadImageAsset(this.getImageInfo());
	}

	_loadTextures(renderer: IRenderer)
	{
		return renderer.loadTextureForImageInfo(this.getImageInfo(), {
			sampling: this.runtime.sampling
		});
	}

	_releaseTextures(renderer: IRenderer)
	{
		renderer.releaseTextureForImageInfo(this.getImageInfo());
	}
};
