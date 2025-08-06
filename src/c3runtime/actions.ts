
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
	},

	CreateModel(this: SDKInstanceClass, modelPath: string)
	{
		this._createModel(modelPath);
	},

	PlayAnimation(this: SDKInstanceClass, animationName: string, loop: boolean)
	{
		if (this._currentModel)
		{
			this._currentModel.playAnimation(animationName, { loop: loop });
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.playAnimation(animationName, { loop: loop });
			});
		}
	},

	StopAnimation(this: SDKInstanceClass)
	{
		if (this._currentModel)
		{
			this._currentModel.stopAnimation();
		}
		else
		{
			this._commandQueue.push(() => {
				this._currentModel?.stopAnimation();
			});
		}
	},

	SetDebugRendering(this: SDKInstanceClass, enabled: boolean)
	{
		this._debugRendering = enabled;
	},

	SetScale(this: SDKInstanceClass, scale: number)
	{
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
	}
};
