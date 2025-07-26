
/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { InstanceManager, Model, InstanceId, AnimationOptions } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

class DrawingInstance extends globalThis.ISDKWorldInstanceBase
{
	_testProperty: number;
	_models: Map<string, Model>;
	_currentModel: Model | null;

	constructor()
	{
		super();
		
		this._testProperty = 0;
		this._models = new Map();
		this._currentModel = null;
		
		const properties = this._getInitProperties();
		if (properties)
		{
			this._testProperty = properties[0] as number;
		}
		
		// Enable ticking to update animations
		this._setTicking(true);
	}
	
	_release()
	{
		// Clean up models when instance is released
		for (const model of this._models.values())
		{
			if (globalThis.rendera?.instanceManager)
			{
				globalThis.rendera.instanceManager.removeInstance(model.instanceId);
			}
		}
		this._models.clear();
		this._currentModel = null;
		
		super._release();
	}
	
	_tick()
	{
		// Update current model animation if exists
		if (this._currentModel && globalThis.rendera?.instanceManager)
		{
			this._currentModel.updateAnimation(this.runtime.dt);
		}
	}
	
	_draw(renderer: IRenderer)
	{
		// First render rendera models if available
		if (globalThis.rendera?.instanceManager && globalThis.rendera?.render)
		{
			// Pass current tick to rendera's render function
			globalThis.rendera.render(this.runtime.tickCount);
		}
		
		// Then draw the C3 sprite overlay
		const imageInfo = this.objectType.getImageInfo();
		const texture = imageInfo.getTexture(renderer);
		
		if (!texture)
			return;			// dynamic texture load which hasn't completed yet; can't draw anything
		
		let quad = this.getBoundingQuad();
		const rcTex = imageInfo.getTexRect();
		
		renderer.setTexture(texture);
		
		if (this.runtime.isPixelRoundingEnabled)
		{
			const ox = Math.round(this.x) - this.x;
			const oy = Math.round(this.y) - this.y;

			if (ox !== 0 && oy !== 0)
			{
				quad = new DOMQuad(new DOMPoint(quad.p1.x + ox, quad.p1.y + oy),
								   new DOMPoint(quad.p2.x + ox, quad.p2.y + oy),
								   new DOMPoint(quad.p3.x + ox, quad.p3.y + oy),
								   new DOMPoint(quad.p4.x + ox, quad.p4.y + oy));
			}
		}
		
		renderer.quad3(quad, rcTex);
	}
	
	_saveToJson()
	{
		return {
			// data to be saved for savegames
		};
	}
	
	_loadFromJson(o: JSONValue)
	{
		// load state for savegames
	}

	_setTestProperty(n: number)
	{
		this._testProperty = n;
	}

	_getTestProperty()
	{
		return this._testProperty;
	}

	_createModel(modelPath: string)
	{
		// Check if rendera instance manager is available
		if (!globalThis.rendera?.instanceManager)
		{
			console.error("Rendera instance manager not available");
			return;
		}

		// Create model instance
		const model = globalThis.rendera.instanceManager.createModel(modelPath);
		if (model)
		{
			this._models.set(modelPath, model);
			this._currentModel = model;
			
			// Set initial position based on Construct instance position
			model.setPosition(this.x, this.y, 0);
		}
	}

	_getModel(modelPath: string): Model | undefined
	{
		return this._models.get(modelPath);
	}

	_getCurrentModel(): Model | null
	{
		return this._currentModel;
	}
};

C3.Plugins.renderaController.Instance = DrawingInstance;

export type { DrawingInstance as SDKInstanceClass };