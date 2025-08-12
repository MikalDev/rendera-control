/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { Model, Transform } from '../../rendera-types/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController.Exps =
{
	Double(this: SDKInstanceClass, num: number)
	{
		return num * 2;
	},

	AnimationSpeed(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			return this._currentModel.animationSpeed;
		}
		return 1; // Default animation speed
	},
	
	ScaleX(this: SDKInstanceClass)
	{
		return this._lastScaleX;
	},
	
	ScaleY(this: SDKInstanceClass)
	{
		return this._lastScaleY;
	},
	
	ScaleZ(this: SDKInstanceClass)
	{
		return this._lastScaleZ;
	}
};

