
/// <reference path="../ts-defs/editor/sdk.d.ts" />
/// <reference path="../rendera-types/modules/index.d.ts" />

import type { ModelId } from '../rendera-types/modules/index';

const SDK = globalThis.SDK;

const PLUGIN_CLASS = SDK.Plugins.renderaController;

PLUGIN_CLASS.Type = class MyDrawingPluginType extends SDK.ITypeBase
{
	constructor(sdkPlugin: SDK.IPluginBase, iObjectType: SDK.IObjectType)
	{
		super(sdkPlugin, iObjectType);
	}
};

export {}