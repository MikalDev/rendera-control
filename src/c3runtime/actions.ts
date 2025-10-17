
/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />
/// <reference path="../../rendera-types/modules/index.d.ts" />

import type { SDKInstanceClass } from "./instance.ts";
import type { Model, AnimationOptions } from '../../rendera-types/index';

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

	PlayAnimation(this: SDKInstanceClass, animationName: string, loop: boolean, blendDuration: number)
	{
		const animationOptions: AnimationOptions = { 
			loop: loop,
			speed: 1.0
		};
		
		// Only add blendDuration if it's greater than 0
		if (blendDuration > 0)
		{
			animationOptions.blendDuration = blendDuration;
		}
		
		if (this._currentModel)
		{
			this._currentModel.playAnimation(animationName, animationOptions);
			this._currentPlayingAnimation = animationName;
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.playAnimation(animationName, animationOptions);
				this._currentPlayingAnimation = animationName;
			});
		}
	},

	StopAnimation(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			this._currentModel.stopAnimation();
			this._currentPlayingAnimation = "";
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.stopAnimation();
				this._currentPlayingAnimation = "";
			});
		}
	},

	SetAnimationSpeed(this: SDKInstanceClass, speed: number)
	{
		if (this._currentModel)
		{
			this._currentModel.animationSpeed = speed;
		}
		else
		{
			this._commandQueue.push(() => {
				if (this._currentModel) {
					this._currentModel.animationSpeed = speed;
				}
			});
		}
	},

	SetDebugRendering(this: SDKInstanceClass, enabled: boolean)
	{
		this._debugRendering = enabled;
	},

	SetScale(this: SDKInstanceClass, scale: number)
	{
		this._scaleOverridden = true;
		this._lastScaleX = scale;
		this._lastScaleY = scale;
		this._lastScaleZ = scale;
		
		if (this._currentModel)
		{
			this._currentModel.setScale(scale, scale, scale);
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.setScale(scale, scale, scale);
			});
		}
	},
	
	SetScaleXYZ(this: SDKInstanceClass, scaleX: number, scaleY: number, scaleZ: number)
	{
		this._scaleOverridden = true;
		this._lastScaleX = scaleX;
		this._lastScaleY = scaleY;
		this._lastScaleZ = scaleZ;
		
		if (this._currentModel)
		{
			this._currentModel.setScale(scaleX, scaleY, scaleZ);
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.setScale(scaleX, scaleY, scaleZ);
			});
		}
	},

	SetSpriteVisible(this: SDKInstanceClass, visible: boolean)
	{
		this._spriteVisible = visible;
	},

	SetPosition(this: SDKInstanceClass, x: number, y: number, z: number)
	{
		const executeSetPosition = () => {
			if (!this._currentModel) return;
			
			this._currentModel.setPosition(x, y, z);
			
			// Mark position as manually overridden for this tick
			this._positionOverridden = true;
			
			// Update last synced position to avoid re-syncing
			this._lastSyncedX = x;
			this._lastSyncedY = y;
			this._lastSyncedZ = z;
		};
		
		if (this._currentModel)
		{
			executeSetPosition();
		}
		else
		{
			this._commandQueue.push(executeSetPosition);
		}
	},

	SetRotation(this: SDKInstanceClass, x: number, y: number, z: number, order: number)
	{
		const executeRotation = () => {
			if (!this._currentModel) return;
			
			// Convert Euler angles (in degrees) to quaternion
			const degToRad = Math.PI / 180;
			const rx = x * degToRad;
			const ry = y * degToRad;
			const rz = z * degToRad;

			// Half angles
			const cx = Math.cos(rx * 0.5);
			const sx = Math.sin(rx * 0.5);
			const cy = Math.cos(ry * 0.5);
			const sy = Math.sin(ry * 0.5);
			const cz = Math.cos(rz * 0.5);
			const sz = Math.sin(rz * 0.5);

			let qx, qy, qz, qw;

			// Apply rotation order based on combo selection
			switch (order)
			{
				case 0: // XYZ
					qx = sx * cy * cz + cx * sy * sz;
					qy = cx * sy * cz - sx * cy * sz;
					qz = cx * cy * sz + sx * sy * cz;
					qw = cx * cy * cz - sx * sy * sz;
					break;
				case 1: // XZY
					qx = sx * cy * cz - cx * sy * sz;
					qy = cx * sy * cz - sx * cy * sz;
					qz = cx * cy * sz + sx * sy * cz;
					qw = cx * cy * cz + sx * sy * sz;
					break;
				case 2: // YXZ
					qx = sx * cy * cz + cx * sy * sz;
					qy = cx * sy * cz - sx * cy * sz;
					qz = cx * cy * sz - sx * sy * cz;
					qw = cx * cy * cz + sx * sy * sz;
					break;
				case 3: // YZX
					qx = sx * cy * cz - cx * sy * sz;
					qy = cx * sy * cz + sx * cy * sz;
					qz = cx * cy * sz + sx * sy * cz;
					qw = cx * cy * cz - sx * sy * sz;
					break;
				case 4: // ZXY
					qx = sx * cy * cz + cx * sy * sz;
					qy = cx * sy * cz + sx * cy * sz;
					qz = cx * cy * sz - sx * sy * cz;
					qw = cx * cy * cz - sx * sy * sz;
					break;
				case 5: // ZYX (default)
				default:
					qx = sx * cy * cz - cx * sy * sz;
					qy = cx * sy * cz + sx * cy * sz;
					qz = cx * cy * sz - sx * sy * cz;
					qw = cx * cy * cz + sx * sy * sz;
					break;
			}

			const quaternion = new Float32Array([qx, qy, qz, qw]);
			this._currentModel.setRotation(quaternion);
			
			// Mark rotation as manually overridden for this tick
			this._rotationOverridden = true;
		};
		
		if (this._currentModel)
		{
			executeRotation();
		}
		else
		{
			this._commandQueue.push(executeRotation);
		}
	},

	EnableAllNodes(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			this._currentModel.enableAllNodes();
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.enableAllNodes();
			});
		}
	},

	DisableAllNodes(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			this._currentModel.disableAllNodes();
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.disableAllNodes();
			});
		}
	},

	EnableNode(this: SDKInstanceClass, nodeName: string)
	{
		if (this._currentModel)
		{
			this._currentModel.enableNode(nodeName);
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.enableNode(nodeName);
			});
		}
	},

	DisableNode(this: SDKInstanceClass, nodeName: string)
	{
		if (this._currentModel)
		{
			this._currentModel.disableNode(nodeName);
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.disableNode(nodeName);
			});
		}
	},

	SetMaterial(this: SDKInstanceClass, nodeName: string, materialIndex: number)
	{
		if (this._currentModel)
		{
			(this._currentModel as any).setMaterial(nodeName, materialIndex);
		}
		else
		{
			this._commandQueue.push(() => {
				(this._currentModel as any)?.setMaterial(nodeName, materialIndex);
			});
		}
	},

	ResetMaterials(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			(this._currentModel as any).resetMaterials();
		}
		else
		{
			this._commandQueue.push(() => {
				(this._currentModel as any)?.resetMaterials();
			});
		}
	}
};
