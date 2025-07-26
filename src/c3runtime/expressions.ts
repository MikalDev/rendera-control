/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { Model, Transform } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

C3.Plugins.renderaController.Exps =
{
	Double(this: SDKInstanceClass, num: number)
	{
		return num * 2;
	}
};

