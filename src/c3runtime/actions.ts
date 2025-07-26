
/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { Model, AnimationOptions } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController.Acts =
{
	Alert(this: SDKInstanceClass)
	{
		alert("Test property = " + this._getTestProperty());
	},

	CreateModel(this: SDKInstanceClass, modelPath: string)
	{
		this._createModel(modelPath);
	},

	PlayAnimation(this: SDKInstanceClass, animationName: string, loop: boolean)
	{
		if (this._currentModel)
		{
			this._currentModel.playAnimation(animationName, { loop: loop });
		}
	},

	StopAnimation(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			this._currentModel.stopAnimation();
		}
	}
};
