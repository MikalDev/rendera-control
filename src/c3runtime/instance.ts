
/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { InstanceManager, Model, InstanceId, AnimationOptions } from '../../rendera-types/modules/index';

const C3 = globalThis.C3;

class DrawingInstance extends globalThis.ISDKWorldInstanceBase
{
	_testProperty: number;
	_models: Map<string, Model>;
	_currentModel: Model | null;
	_debugRendering: boolean;
	_spriteVisible: boolean;
	
	// Position tracking for sync
	_positionOverridden: boolean;
	_lastSyncedX: number;
	_lastSyncedY: number;
	_lastSyncedZ: number;
	
	// Rotation tracking for sync
	_rotationOverridden: boolean;
	_lastSyncedAngle: number;

	constructor()
	{
		super();
		
		this._testProperty = 0;
		this._models = new Map();
		this._currentModel = null;
		this._debugRendering = false;
		this._spriteVisible = false;
		
		// Initialize position tracking
		this._positionOverridden = false;
		this._lastSyncedX = this.x;
		this._lastSyncedY = this.y;
		this._lastSyncedZ = this.zElevation;
		
		// Initialize rotation tracking
		this._rotationOverridden = false;
		this._lastSyncedAngle = this.angle;
		
		const properties = this._getInitProperties();
		if (properties)
		{
			this._testProperty = properties[0] as number;
			this._debugRendering = properties[1] as boolean;
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
		if (this._currentModel && globalThis.rendera?.instanceManager)
		{
			// Sync position with C3 if not manually overridden
			if (!this._positionOverridden)
			{
				// Only update if position has changed
				if (this.x !== this._lastSyncedX || 
					this.y !== this._lastSyncedY || 
					this.zElevation !== this._lastSyncedZ)
				{
					this._currentModel.setPosition(this.x, this.y, this.zElevation);
					this._lastSyncedX = this.x;
					this._lastSyncedY = this.y;
					this._lastSyncedZ = this.zElevation;
				}
			}
			
			// Sync rotation with C3 if not manually overridden
			if (!this._rotationOverridden)
			{
				// Only update if angle has changed
				if (this.angle !== this._lastSyncedAngle)
				{
					// Convert C3 angle (radians) to degrees for Euler rotation
					const angleDegrees = this.angle * 180 / Math.PI;
					
					// Use ZYX rotation order with only Y-axis rotation for 2D-like rotation
					const degToRad = Math.PI / 180;
					const ry = angleDegrees * degToRad;
					
					// Calculate quaternion for Y-axis rotation
					const cy = Math.cos(ry * 0.5);
					const sy = Math.sin(ry * 0.5);
					
					const quaternion = new Float32Array([0, sy, 0, cy]);
					this._currentModel.setRotation(quaternion);
					
					this._lastSyncedAngle = this.angle;
				}
			}
			
			// Update animation
			this._currentModel.updateAnimation(this.runtime.dt);
			
			// Reset override flags for next tick
			this._positionOverridden = false;
			this._rotationOverridden = false;
		}
	}
	
	_draw(renderer: IRenderer)
	{
		// First render rendera models if available
		const rendera = globalThis.rendera;
		if (rendera)
		{
			rendera.draw();
			debugger
		}
		
		// Debug rendering overlay
		if (this._debugRendering)
		{
			// this._drawDebugInfo(renderer);
		}
		
		// Then draw the C3 sprite overlay if visible
		if (this._spriteVisible)
		{
			const imageInfo = this.objectType.getImageInfo();
			const texture = imageInfo.getTexture(renderer);
			
			if (texture)
			{
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
		}
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
			model.setPosition(this.x, this.y, this.zElevation);
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

	// Methods to manually set override flags
	setPositionOverride()
	{
		this._positionOverridden = true;
	}
	
	setRotationOverride()
	{
		this._rotationOverridden = true;
	}

	_drawDebugInfo(renderer: IRenderer)
	{
		const debugInfo: string[] = [];
		
		// Basic instance info
		debugInfo.push(`Position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);
		debugInfo.push(`Angle: ${(this.angle * 180 / Math.PI).toFixed(2)}°`);
		debugInfo.push(`Size: ${this.width.toFixed(2)} x ${this.height.toFixed(2)}`);
		
		// Model info
		if (this._currentModel)
		{
			debugInfo.push(`Model: Active`);
			debugInfo.push(`Instance ID: ${this._currentModel.instanceId}`);
			
			// Animation info if available
			// Note: Animation state would need to be tracked separately
			debugInfo.push(`Animation: Active`);
		}
		else
		{
			debugInfo.push(`Model: None`);
		}
		
		// Rendera system info
		if (globalThis.rendera)
		{
			debugInfo.push(`Rendera: Available`);
			if (globalThis.rendera.instanceManager)
			{
				const instanceCount = globalThis.rendera.instanceManager.getInstanceCount?.() || 0;
				debugInfo.push(`Total Instances: ${instanceCount}`);
			}
		}
		else
		{
			debugInfo.push(`Rendera: Not Available`);
		}
		
		// Draw debug overlay as semi-transparent background
		const quad = this.getBoundingQuad();
		
		// Set semi-transparent black color for debug background
		renderer.setColorRgba(0, 0, 0, 0.7);
		renderer.quad(quad);
		
		// Log debug info to console
		// Note: Text rendering in WebGL would require more complex implementation
		console.log('=== Rendera Debug Info ===');
		debugInfo.forEach(line => console.log(line));
		console.log('========================');
		
		// Reset color to white
		renderer.resetColor();
	}
};

C3.Plugins.renderaController.Instance = DrawingInstance;

export type { DrawingInstance as SDKInstanceClass };