
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
	}
};
