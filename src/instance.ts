
/// <reference path="../ts-defs/editor/sdk.d.ts" />
/// <reference path="../rendera-types/modules/index.d.ts" />

import type { ModelId, InstanceId } from '../rendera-types/modules/index';

const SDK = globalThis.SDK;

const PLUGIN_CLASS = SDK.Plugins.renderaController;

class MyDrawingInstance extends SDK.IWorldInstanceBase
{
	_modelName: string;
	
	constructor(sdkType: SDK.ITypeBase, inst: SDK.IWorldInstance)
	{
		super(sdkType, inst);
		this._modelName = "";
	}
	
	Release()
	{
	}
	
	OnCreate()
	{
		// Initialize model name from property
		this._modelName = this._inst.GetPropertyValue("model-name") as string || "";
	}
	
	OnPlacedInLayout()
	{
		// Initialise to size of image
		this.OnMakeOriginalSize();
	}
	
	Draw(iRenderer: SDK.Gfx.IWebGLRenderer, iDrawParams: SDK.Gfx.IDrawParams)
	{
		const texture = this.GetTexture();
		
		if (texture)
		{
			this._inst.ApplyBlendMode(iRenderer);
			iRenderer.SetTexture(texture);
			iRenderer.SetColor(this._inst.GetColor());
			iRenderer.Quad3(this._inst.GetQuad(), this.GetTexRect());
		}
		else
		{
			// render placeholder
			iRenderer.SetAlphaBlend();
			iRenderer.SetColorFillMode();
			
			if (this.HadTextureError())
				iRenderer.SetColorRgba(0.25, 0, 0, 0.25);
			else
				iRenderer.SetColorRgba(0, 0, 0.1, 0.1);
			
			iRenderer.Quad(this._inst.GetQuad());
		}
		
		// Draw model name overlay if present
		if (this._modelName)
		{
			const textRenderer = iRenderer.CreateRendererText();
			
			// Configure text
			textRenderer.SetFontName("Arial");
			textRenderer.SetFontSize(12);
			textRenderer.SetText(this._modelName);
			textRenderer.SetHorizontalAlignment("center");
			textRenderer.SetVerticalAlignment("center");
			
			// Calculate text size for this zoom level
			const zoomScale = 1; // Use fixed scale for now
			textRenderer.SetSize(200, 20, zoomScale);
			
			// Get instance bounds
			const quad = this._inst.GetQuad();
			const bottomY = Math.max(quad.getTly(), quad.getTry(), quad.getBly(), quad.getBry());
			const centerX = (quad.getTlx() + quad.getTrx() + quad.getBlx() + quad.getBrx()) / 4;
			
			// Position text below the sprite
			const textHeight = 20;
			const padding = 4;
			const textY = bottomY + padding;
			
			// Draw semi-transparent background
			iRenderer.SetAlphaBlend();
			iRenderer.SetColorFillMode();
			iRenderer.SetColorRgba(0, 0, 0, 0.7);
			
			const bgQuad = new SDK.Quad();
			bgQuad.setRect(centerX - 100, textY, centerX + 100, textY + textHeight);
			iRenderer.Quad(bgQuad);
			
			// Draw text
			const textTexture = textRenderer.GetTexture();
			if (textTexture)
			{
				iRenderer.SetTexture(textTexture);
				iRenderer.SetColorRgba(1, 1, 1, 1); // white text
				iRenderer.Quad3(bgQuad, textRenderer.GetTexRect());
			}
			
			// Clean up
			textRenderer.Release();
		}
	}
	
	GetTexture()
	{
		const image = this.GetObjectType().GetImage();
		return super.GetTexture(image);
	}
	
	IsOriginalSizeKnown()
	{
		return true;
	}
	
	GetOriginalWidth()
	{
		return this.GetObjectType().GetImage().GetWidth();
	}
	
	GetOriginalHeight()
	{
		return this.GetObjectType().GetImage().GetHeight();
	}
	
	OnMakeOriginalSize()
	{
		const image = this.GetObjectType().GetImage();
		this._inst.SetSize(image.GetWidth(), image.GetHeight());
	}
	
	HasDoubleTapHandler()
	{
		return true;
	}
	
	OnDoubleTap()
	{
		this.GetObjectType().EditImage();
	}
	
	OnPropertyChanged(id: string, value: EditorPropertyValueType)
	{
		if (id === "model-name")
		{
			this._modelName = value as string || "";
		}
	}
	
	LoadC2Property(name: string, valueString: string)
	{
		return false;		// not handled
	}
};

PLUGIN_CLASS.Instance = MyDrawingInstance;

export type { MyDrawingInstance as SDKEditorInstanceClass };