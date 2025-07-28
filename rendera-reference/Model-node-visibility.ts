import { InstanceId, IModel, IInstanceManager, AnimationOptions } from './types';

/**
 * Example implementation of node visibility in the Model class
 * This shows how node visibility could be tracked per instance
 */
export class Model implements IModel {
    readonly instanceId: InstanceId;
    private _manager: IInstanceManager;
    
    // Node visibility tracking
    private _disabledNodes: Set<string>;
    private _allNodesDisabled: boolean;

    constructor(instanceId: InstanceId, manager: IInstanceManager) {
        this.instanceId = instanceId;
        this._manager = manager;
        this._disabledNodes = new Set();
        this._allNodesDisabled = false;
    }

    // ... existing methods ...

    // Node visibility methods
    public enableAllNodes(): void {
        this._allNodesDisabled = false;
        this._disabledNodes.clear();
        // Notify manager that this instance needs re-rendering
        this._manager.markInstanceDirty?.(this.instanceId);
    }

    public disableAllNodes(): void {
        this._allNodesDisabled = true;
        // Notify manager that this instance needs re-rendering
        this._manager.markInstanceDirty?.(this.instanceId);
    }

    public enableNode(nodeName: string): void {
        this._disabledNodes.delete(nodeName);
        
        // If all nodes were disabled, we need to re-enable them
        // but keep other individually disabled nodes
        if (this._allNodesDisabled) {
            this._allNodesDisabled = false;
        }
        
        // Notify manager that this instance needs re-rendering
        this._manager.markInstanceDirty?.(this.instanceId);
    }

    public disableNode(nodeName: string): void {
        this._disabledNodes.add(nodeName);
        // Notify manager that this instance needs re-rendering
        this._manager.markInstanceDirty?.(this.instanceId);
    }

    public isNodeEnabled(nodeName: string): boolean {
        // If all nodes are disabled, return false
        if (this._allNodesDisabled) {
            return false;
        }
        
        // Otherwise check if this specific node is disabled
        return !this._disabledNodes.has(nodeName);
    }

    // Helper method to get all disabled nodes (for debugging)
    public getDisabledNodes(): string[] {
        if (this._allNodesDisabled) {
            return ['*']; // Indicates all nodes are disabled
        }
        return Array.from(this._disabledNodes);
    }
}