/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

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
		if (this._currentModel) return this._currentModel.animationSpeed;
		return 1;
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
	},
	
	LastFinishedAnimation(this: SDKInstanceClass)
	{
		return this._lastAnimationName || "";
	},

	ModelPath(this: SDKInstanceClass)
	{
		if (!this._currentModel) return "";
		return this._currentModel.instanceId.modelId;
	},

	BoneWorldX(this: SDKInstanceClass, boneName: string)
	{
		return this._getBonePositionByName(boneName, 0);
	},

	BoneWorldY(this: SDKInstanceClass, boneName: string)
	{
		return this._getBonePositionByName(boneName, 1);
	},

	BoneWorldZ(this: SDKInstanceClass, boneName: string)
	{
		return this._getBonePositionByName(boneName, 2);
	},

	BoneWorldXByIndex(this: SDKInstanceClass, boneIndex: number)
	{
		return this._getBonePositionByIndex(boneIndex, 0);
	},

	BoneWorldYByIndex(this: SDKInstanceClass, boneIndex: number)
	{
		return this._getBonePositionByIndex(boneIndex, 1);
	},

	BoneWorldZByIndex(this: SDKInstanceClass, boneIndex: number)
	{
		return this._getBonePositionByIndex(boneIndex, 2);
	}
};

