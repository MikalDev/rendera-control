/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { Model, InstanceId } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController.Cnds =
{
	IsLargeNumber(this: SDKInstanceClass, num: number)
	{
		return num > 100;
	},
	
	OnModelCreated(this: SDKInstanceClass)
	{
		// Trigger condition - returns true when triggered
		return true;
	},
	
	OnAnimationFinished(this: SDKInstanceClass)
	{
		// Trigger condition - returns true when triggered
		return true;
	},
	
	OnAnimationLoop(this: SDKInstanceClass)
	{
		// Trigger condition - returns true when triggered
		return true;
	},
	
	OnAnimationStart(this: SDKInstanceClass)
	{
		// Trigger condition - returns true when triggered
		return true;
	},
	
	OnAnimationStop(this: SDKInstanceClass)
	{
		// Trigger condition - returns true when triggered
		return true;
	}
};
