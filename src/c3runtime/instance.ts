
/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { InstanceManager, Model, InstanceId, AnimationOptions } from '../../rendera-types/index';

const C3 = globalThis.C3;

class DrawingInstance extends globalThis.ISDKWorldInstanceBase
{
	_testProperty: number;
	_currentModel: Model | null;
	_pendingModelPath: string | null;
	_modelName: string;
	_debugRendering: boolean;
	_spriteVisible: boolean;
	_commandQueue: Array<() => void>;
	
	// Initial rotation properties
	_initialRotationX: number;
	_initialRotationY: number;
	_initialRotationZ: number;
	_rotationOrder: string;
	
	// Position tracking for sync
	_positionOverridden: boolean;
	_lastSyncedX: number;
	_lastSyncedY: number;
	_lastSyncedZ: number;
	
	// Rotation tracking for sync
	_rotationOverridden: boolean;
	_lastSyncedAngle: number;
	
	// Scale tracking
	_scaleOverridden: boolean;
	_lastScaleX: number;
	_lastScaleY: number;
	_lastScaleZ: number;
	
	// Animation event tracking
	_lastAnimationName: string;
	_animationCallbacksRegistered: boolean;
	_currentPlayingAnimation: string;
	
	// Color and opacity tracking
	_lastOpacity: number;
	_lastColorRgb: [number, number, number];

	// Bone position cache for efficiency
	_bonePositionCache: Map<string, [number, number, number] | null>;
	_bonePositionCacheTick: number;

	constructor()
	{
		super();
		
		this._testProperty = 0;
		this._currentModel = null;
		this._pendingModelPath = null;
		this._modelName = "";
		this._debugRendering = false;
		this._spriteVisible = false;
		this._commandQueue = [];
		
		// Initialize position tracking
		this._positionOverridden = false;
		this._lastSyncedX = this.x;
		this._lastSyncedY = this.y;
		this._lastSyncedZ = this.zElevation;
		
		// Initialize rotation tracking
		this._rotationOverridden = false;
		this._lastSyncedAngle = this.angle;
		
		// Initialize scale tracking
		this._scaleOverridden = false;
		this._lastScaleX = 1;
		this._lastScaleY = 1;
		this._lastScaleZ = 1;
		
		// Initialize animation tracking
		this._lastAnimationName = "";
		this._animationCallbacksRegistered = false;
		this._currentPlayingAnimation = "";
		
		// Initialize color and opacity tracking
		this._lastOpacity = this.opacity;
		this._lastColorRgb = [this.colorRgb[0], this.colorRgb[1], this.colorRgb[2]];

		// Initialize bone position cache
		this._bonePositionCache = new Map();
		this._bonePositionCacheTick = -1;

		// Listen for hierarchy ready event
		this.addEventListener("hierarchyready", () => {
			this._onHierarchyReady();
		});
		
		const properties = this._getInitProperties();
		if (properties)
		{
			this._modelName = properties[0] as string || "";
			this._debugRendering = properties[1] as boolean;
			this._initialRotationX = properties[2] as number || 0;
			this._initialRotationY = properties[3] as number || 0;
			this._initialRotationZ = properties[4] as number || 0;
			const rotationOrderIndex = properties[5] as number || 0;
			const rotationOrders = ["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"];
			this._rotationOrder = rotationOrders[rotationOrderIndex] || "XYZ";
			
			// Create initial model if name is provided
			if (this._modelName)
			{
				this._createModel(this._modelName);
			}
		}
		
		// Enable ticking to update animations
		this._setTicking(true);
	}
	
	_release()
	{
		// Unregister callbacks first
		this._unregisterAnimationCallbacks();

		// Clean up model when instance is released
		if (this._currentModel && globalThis.rendera?.instanceManager)
		{
			globalThis.rendera.instanceManager.removeInstance(this._currentModel.instanceId);
		}
		this._currentModel = null;
		this._pendingModelPath = null;

		super._release();
	}

	_getCachedBonePosition(key: string, fetcher: () => [number, number, number] | null): [number, number, number] | null
	{
		const currentTick = this.runtime.tickCount;

		if (this._bonePositionCacheTick !== currentTick)
		{
			this._bonePositionCache = new Map();
			this._bonePositionCacheTick = currentTick;
		}

		if (this._bonePositionCache.has(key))
		{
			return this._bonePositionCache.get(key)!;
		}

		const position = fetcher();
		this._bonePositionCache.set(key, position);
		return position;
	}

	_getBonePositionByName(boneName: string, axis: number): number
	{
		if (!this._currentModel) return 0;

		const instanceManager = globalThis.rendera?.instanceManager;
		if (!instanceManager) return 0;

		const position = this._getCachedBonePosition(
			`name:${boneName}`,
			() => instanceManager.getBoneWorldPosition(this._currentModel!.instanceId.id, boneName)
		);

		return position ? position[axis] : 0;
	}

	_getBonePositionByIndex(boneIndex: number, axis: number): number
	{
		if (!this._currentModel) return 0;

		const instanceManager = globalThis.rendera?.instanceManager;
		if (!instanceManager) return 0;

		const position = this._getCachedBonePosition(
			`index:${boneIndex}`,
			() => instanceManager.getBoneWorldPositionByIndex(this._currentModel!.instanceId.id, boneIndex)
		);

		return position ? position[axis] : 0;
	}

	_onHierarchyReady()
	{
		// Handle hierarchy initialization
		const parent = this.getParent();
		if (parent && this._currentModel)
		{
			// Sync with parent transforms if needed
			// Use totalZElevation which includes parent z-elevations
			this._currentModel.setPosition(this.x, this.y, this.totalZElevation);
		}
	}
	
	_tick()
	{
		// Check for pending model creation - try once per tick
		if (this._pendingModelPath && !this._currentModel)
		{
			if (globalThis.rendera?.instanceManager)
			{
				// Try to create the model - it will keep retrying each tick until successful
				this._tryCreatePendingModel();
			}
		}
		
		if (this._currentModel && globalThis.rendera?.instanceManager)
		{
			// Sync position with C3 if not manually overridden
			if (!this._positionOverridden)
			{
				// Use totalZElevation if part of hierarchy, otherwise use zElevation
				const zToUse = this.getParent() ? this.totalZElevation : this.zElevation;
				
				// Only update if position has changed
				if (this.x !== this._lastSyncedX || 
					this.y !== this._lastSyncedY || 
					zToUse !== this._lastSyncedZ)
				{
					this._currentModel.setPosition(this.x, this.y, zToUse);
					this._lastSyncedX = this.x;
					this._lastSyncedY = this.y;
					this._lastSyncedZ = zToUse;
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
			
			// Sync color and opacity with C3
			if (this.opacity !== this._lastOpacity || 
				this.colorRgb[0] !== this._lastColorRgb[0] || 
				this.colorRgb[1] !== this._lastColorRgb[1] || 
				this.colorRgb[2] !== this._lastColorRgb[2])
			{
				// Update opacity
				(this._currentModel as any).setOpacity(this.opacity);
				
				// Update tint color - C3 colorRgb is Vec3Arr [r, g, b] with values 0-1, matching rendera API
				(this._currentModel as any).setTintColor(this.colorRgb[0], this.colorRgb[1], this.colorRgb[2]);
				
				// Update tracking values
				this._lastOpacity = this.opacity;
				this._lastColorRgb = [this.colorRgb[0], this.colorRgb[1], this.colorRgb[2]];
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
			rendera.draw(renderer);
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

	_executeQueuedCommands()
	{
		// Execute all queued commands
		for (const command of this._commandQueue)
		{
			command();
		}
		// Clear the queue
		this._commandQueue = [];
	}

	_tryCreatePendingModel()
	{
		if (!this._pendingModelPath || !globalThis.rendera?.instanceManager) return;
		
		try {
			const model = globalThis.rendera.instanceManager.createModel(this._pendingModelPath);
			if (model)
			{
				this._currentModel = model;
				const modelPath = this._pendingModelPath;
				this._pendingModelPath = null; // Clear pending since we successfully created it
				
				// Set initial position based on Construct instance position
				model.setPosition(this.x, this.y, this.zElevation);
				
				// Apply initial rotation from properties
				this._applyInitialRotation(model);
				
				// Execute any queued commands
				this._executeQueuedCommands();
				
				console.log("Model created successfully:", modelPath);
				
				// Register animation callbacks with rendera
				this._registerAnimationCallbacks();
				
				// Apply initial color and opacity from C3 instance
				this._applyInitialColorAndOpacity();
				
				// Fire the OnModelCreated trigger
				this._trigger(C3.Plugins.renderaController.Cnds.OnModelCreated);
			}
			// If model is null, it's still loading - we'll retry next tick
		} catch (error) {
			// Model threw an error - it's still loading, we'll retry next tick
			// This is expected behavior while the model loads
		}
	}

	_createModel(modelPath: string)
	{
		// Clear any existing model first
		if (this._currentModel && globalThis.rendera?.instanceManager)
		{
			// Unregister callbacks before removing the model
			this._unregisterAnimationCallbacks();
			
			globalThis.rendera.instanceManager.removeInstance(this._currentModel.instanceId);
			this._currentModel = null;
			// Clear command queue when destroying old model
			this._commandQueue = [];
		}

		// Store the model path as pending - it will be created in _tick when ready
		this._pendingModelPath = modelPath;
		
		// If rendera is already available, try to create immediately
		if (globalThis.rendera?.instanceManager)
		{
			this._tryCreatePendingModel();
		}
		else
		{
			console.log("Rendera not ready, deferring model creation:", modelPath);
		}
	}

	_getCurrentModel(): Model | null
	{
		return this._currentModel;
	}
	
	_registerAnimationCallbacks()
	{
		// Only register if we have a model and haven't registered yet
		if (!this._currentModel || this._animationCallbacksRegistered) return;
		
		// Get the rendera singleton instance
		const rendera = globalThis.rendera as any;
		if (!rendera) 
		{
			console.log("[Rendera-Control] No rendera singleton found on globalThis");
			return;
		}
		
		// Register a single callback for all animation events
		if (rendera.registerAnimationCallback)
		{
			rendera.registerAnimationCallback(this._currentModel.instanceId, (data: any) => {
				// Check the event type to determine which trigger to fire
				if (data.eventType === 'COMPLETE' || data.eventType === 'complete')
				{
					// Store the animation name that finished
					this._lastAnimationName = data.animationName || "";
					// Clear current playing animation since it completed
					this._currentPlayingAnimation = "";
					// Fire the OnAnimationFinished trigger
					this._trigger(C3.Plugins.renderaController.Cnds.OnAnimationFinished);
				}
				else if (data.eventType === 'LOOP' || data.eventType === 'loop')
				{
					// Store the animation name that looped
					this._lastAnimationName = data.animationName || "";
					// Fire the OnAnimationLoop trigger
					this._trigger(C3.Plugins.renderaController.Cnds.OnAnimationLoop);
				}
				else if (data.eventType === 'START' || data.eventType === 'start')
				{
					// Store the animation name that started
					this._lastAnimationName = data.animationName || "";
					// Fire the OnAnimationStart trigger
					this._trigger(C3.Plugins.renderaController.Cnds.OnAnimationStart);
				}
				else if (data.eventType === 'STOP' || data.eventType === 'stop')
				{
					// Store the animation name that stopped
					this._lastAnimationName = data.animationName || "";
					// Fire the OnAnimationStop trigger
					this._trigger(C3.Plugins.renderaController.Cnds.OnAnimationStop);
				}
			});

			this._animationCallbacksRegistered = true;
		}
	}
	
	_unregisterAnimationCallbacks()
	{
		if (!this._currentModel || !this._animationCallbacksRegistered) return;
		
		const rendera = globalThis.rendera as any;
		if (rendera && rendera.unregisterAnimationCallback)
		{
			rendera.unregisterAnimationCallback(this._currentModel.instanceId);
			this._animationCallbacksRegistered = false;
		}
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
	
	_applyInitialColorAndOpacity()
	{
		if (!this._currentModel) return;
		
		// Apply initial opacity and color from C3 instance
		(this._currentModel as any).setOpacity(this.opacity);
		(this._currentModel as any).setTintColor(this.colorRgb[0], this.colorRgb[1], this.colorRgb[2]);
		
		// Update tracking values
		this._lastOpacity = this.opacity;
		this._lastColorRgb = [this.colorRgb[0], this.colorRgb[1], this.colorRgb[2]];
	}

	_applyInitialRotation(model: Model)
	{
		// Skip if all rotation values are zero
		if (this._initialRotationX === 0 && this._initialRotationY === 0 && this._initialRotationZ === 0) {
			return;
		}

		// Convert degrees to radians
		const xRad = this._initialRotationX * Math.PI / 180;
		const yRad = this._initialRotationY * Math.PI / 180;
		const zRad = this._initialRotationZ * Math.PI / 180;

		// Apply rotation order based on property selection
		const rotationOrders: { [key: string]: number[] } = {
			"XYZ": [0, 1, 2],  // X first, then Y, then Z
			"XZY": [0, 2, 1],  // X first, then Z, then Y
			"YXZ": [1, 0, 2],  // Y first, then X, then Z
			"YZX": [1, 2, 0],  // Y first, then Z, then X
			"ZXY": [2, 0, 1],  // Z first, then X, then Y
			"ZYX": [2, 1, 0]   // Z first, then Y, then X
		};

		const order = rotationOrders[this._rotationOrder] || rotationOrders["XYZ"];
		const rotations = [xRad, yRad, zRad];

		// Create rotation matrices
		const cos = Math.cos;
		const sin = Math.sin;
		
		// Create individual rotation matrices
		const matrices: number[][][] = [
			// X rotation matrix
			[[1, 0, 0], [0, cos(rotations[0]), -sin(rotations[0])], [0, sin(rotations[0]), cos(rotations[0])]],
			// Y rotation matrix  
			[[cos(rotations[1]), 0, sin(rotations[1])], [0, 1, 0], [-sin(rotations[1]), 0, cos(rotations[1])]],
			// Z rotation matrix
			[[cos(rotations[2]), -sin(rotations[2]), 0], [sin(rotations[2]), cos(rotations[2]), 0], [0, 0, 1]]
		];

		// Multiply matrices in the specified order
		let result = matrices[order[0]];
		for (let i = 1; i < 3; i++) {
			result = this._multiplyMatrices(result, matrices[order[i]]);
		}

		// Convert rotation matrix to quaternion
		const quaternion = this._matrixToQuaternion(result);
		
		// Convert to Float32Array for the API
		const quaternionArray = new Float32Array(quaternion);
		
		// Apply rotation to model
		model.setRotation(quaternionArray);
	}

	_multiplyMatrices(a: number[][], b: number[][]): number[][] {
		const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				for (let k = 0; k < 3; k++) {
					result[i][j] += a[i][k] * b[k][j];
				}
			}
		}
		return result;
	}

	_matrixToQuaternion(matrix: number[][]): [number, number, number, number] {
		const m = matrix;
		const trace = m[0][0] + m[1][1] + m[2][2];
		
		if (trace > 0) {
			const s = Math.sqrt(trace + 1.0) * 2; // s = 4 * qw
			const w = 0.25 * s;
			const x = (m[2][1] - m[1][2]) / s;
			const y = (m[0][2] - m[2][0]) / s;
			const z = (m[1][0] - m[0][1]) / s;
			return [x, y, z, w];
		} else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
			const s = Math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2; // s = 4 * qx
			const w = (m[2][1] - m[1][2]) / s;
			const x = 0.25 * s;
			const y = (m[0][1] + m[1][0]) / s;
			const z = (m[0][2] + m[2][0]) / s;
			return [x, y, z, w];
		} else if (m[1][1] > m[2][2]) {
			const s = Math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2; // s = 4 * qy
			const w = (m[0][2] - m[2][0]) / s;
			const x = (m[0][1] + m[1][0]) / s;
			const y = 0.25 * s;
			const z = (m[1][2] + m[2][1]) / s;
			return [x, y, z, w];
		} else {
			const s = Math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2; // s = 4 * qz
			const w = (m[1][0] - m[0][1]) / s;
			const x = (m[0][2] + m[2][0]) / s;
			const y = (m[1][2] + m[2][1]) / s;
			const z = 0.25 * s;
			return [x, y, z, w];
		}
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