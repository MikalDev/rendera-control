
/// <reference path="../ts-defs/editor/sdk.d.ts" />
/// <reference path="../rendera-types/modules/index.d.ts" />

import type { ModelId } from '../rendera-types/modules/index';

const SDK = globalThis.SDK;

////////////////////////////////////////////
// The plugin ID is how Construct identifies different kinds of plugins.
// *** NEVER CHANGE THE PLUGIN ID! ***
// If you change the plugin ID after releasing the plugin, Construct will think it is an entirely different
// plugin and assume it is incompatible with the old one, and YOU WILL BREAK ALL EXISTING PROJECTS USING THE PLUGIN.
// Only the plugin name is displayed in the editor, so to rename your plugin change the name but NOT the ID.
// If you want to completely replace a plugin, make it deprecated (it will be hidden but old projects keep working),
// and create an entirely new plugin with a different plugin ID.
const PLUGIN_ID = "renderaController";
////////////////////////////////////////////

const PLUGIN_CATEGORY = "general";

let app = null;

const PLUGIN_CLASS = SDK.Plugins.renderaController = class MyDrawingPlugin extends SDK.IPluginBase
{
	constructor()
	{
		super(PLUGIN_ID);
		
		SDK.Lang.PushContext("plugins." + PLUGIN_ID.toLowerCase());
		
		this._info.SetName(globalThis.lang(".name"));
		this._info.SetDescription(globalThis.lang(".description"));
		this._info.SetCategory(PLUGIN_CATEGORY);
		this._info.SetAuthor("Mikal");
		this._info.SetHelpUrl(globalThis.lang(".help-url"));
		this._info.SetPluginType("world");			// mark as world plugin, which can draw
		this._info.SetIsResizable(true);			// allow to be resized
		this._info.SetIsRotatable(true);			// allow to be rotated
		this._info.SetIs3D            (true);
		this._info.SetSupportsZElevation(true);	// support z-elevation for 3D positioning
		this._info.SetHasImage(true);			// we will use the z3d-object-editor.
		this._info.SetSupportsEffects(true);		// allow effects
		this._info.SetSupportsColor(true);		// support color tinting for 3D models
		this._info.SetMustPreDraw(false);
		this._info.SetRuntimeModuleMainScript("c3runtime/main.js");
		
		// Add common scene graph ACEs (actions, conditions, expressions)
		this._info.AddCommonSceneGraphACEs();
		
		SDK.Lang.PushContext(".properties");
		
		this._info.SetProperties([
			/* --- Tools --------------------------------------------------- */
            new SDK.PluginProperty("link", "open-z3d-object-editor", {
                linkCallback: (inst: SDK.IWorldInstanceBase | SDK.ITypeBase) => {
                    // Cast to instance since we know it will be an instance with this callback type
                    const instanceRef = inst as SDK.IWorldInstanceBase;
                    if (typeof (instanceRef as any)._openZ3DObjectEditor === 'function') {
                        (instanceRef as any)._openZ3DObjectEditor();
                    } else {
                        console.error("_openZ3DObjectEditor method not found on instance");
                    }
                },
                callbackType: "for-each-instance" // This ensures it's always called with instances
            }),
			new SDK.PluginProperty("text", "model-name", ""),
			new SDK.PluginProperty("check", "debug-rendering", false),
			new SDK.PluginProperty("float", "rotation-x", 0),
			new SDK.PluginProperty("float", "rotation-y", 0),
			new SDK.PluginProperty("float", "rotation-z", 0),
			new SDK.PluginProperty("combo", "rotation-order", {
				initialValue: "XYZ",
				items: ["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"]
			}),

			/* --- Scale ------------------------------------------------- */
			new SDK.PluginProperty("float", "unit-scale", { interpolatable:false, initialValue:100 }),
			new SDK.PluginProperty("float", "scale",      { interpolatable:true,  initialValue:1 }),
			new SDK.PluginProperty("float", "scale-x",    { interpolatable:true,  initialValue:1 }),
			new SDK.PluginProperty("float", "scale-y",    { interpolatable:true,  initialValue:1 }),
			new SDK.PluginProperty("float", "scale-z",    { interpolatable:true,  initialValue:1 }),

			/* --- Debug toggle ----------------------------------------- */
			new SDK.PluginProperty("check", "wireframe", false),

			/* --- Advanced configuration ------------------------------- */
			new SDK.PluginProperty("text",  "z3d-json", {
				initialValue : JSON.stringify({
					"object": {
						"transform": {
							"delta": {
								"position": { "x": 0, "y": 0, "z": 0 },
								"rotation": { "x": 0, "y": 0, "z": 0 },
								"scale": { "x": 1, "y": 1, "z": 1 }
							}
						},
					},
				}, null, 2)
			})
		]);
		
		SDK.Lang.PopContext();		// .properties
		
		SDK.Lang.PopContext();
	}
};

PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
