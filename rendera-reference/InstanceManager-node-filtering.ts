import { InstanceData, ModelData } from './types';
import { Model } from './Model';

/**
 * Example implementation showing how InstanceManager would filter nodes
 * based on per-instance node visibility settings
 */
export class InstanceManagerNodeFiltering {
    
    /**
     * Modified renderModelInstances that respects node visibility
     */
    renderModelInstances(
        modelId: string, 
        instanceGroup: Set<number>, 
        viewProjection: { view: mat4; projection: mat4 },
        modelData: ModelData
    ): void {
        // For each instance of this model
        for (const instanceId of instanceGroup) {
            const instance = this.instances.get(instanceId);
            if (!instance) continue;
            
            // Get the Model instance to check node visibility
            const model = this.getModelFromInstance(instance);
            
            // Update world matrix and other instance-specific data
            this.updateWorldMatrix(instance);
            
            // Render each node if it's enabled
            for (const renderableNode of modelData.renderableNodes) {
                // Check if this node should be rendered for this instance
                const nodeName = renderableNode.node.name || `node_${renderableNode.node.indexData.nodeIndex}`;
                
                if (!model.isNodeEnabled(nodeName)) {
                    continue; // Skip this node for this instance
                }
                
                const mesh = renderableNode.modelMesh;
                
                for (const primitive of mesh.primitives) {
                    // Existing rendering code...
                    const shader = this.defaultShaderProgram;
                    
                    // 1. Bind shader
                    this.gl.useProgram(shader);
                    
                    // 2. Bind VAO
                    this.gl.bindVertexArray(primitive.vao);
                    
                    // 3. Set uniforms (including per-instance transforms)
                    this.setInstanceUniforms(shader, instance, renderableNode, viewProjection);
                    
                    // 4. Draw
                    if (primitive.indexBuffer) {
                        this.gl.drawElements(
                            this.gl.TRIANGLES,
                            primitive.indexCount,
                            primitive.indexType,
                            0
                        );
                    }
                }
            }
        }
    }
    
    /**
     * Alternative approach: Pre-filter nodes into render batches
     */
    createRenderBatches(modelId: string, instanceGroup: Set<number>): RenderBatch[] {
        const batches: RenderBatch[] = [];
        const modelData = this.modelLoader.getModelData(modelId);
        if (!modelData) return batches;
        
        // Group instances by their node visibility configuration
        const visibilityGroups = new Map<string, Set<number>>();
        
        for (const instanceId of instanceGroup) {
            const model = this.getModelByInstanceId(instanceId);
            if (!model) continue;
            
            // Create a visibility key for this instance
            const visKey = this.createVisibilityKey(model, modelData.renderableNodes);
            
            if (!visibilityGroups.has(visKey)) {
                visibilityGroups.set(visKey, new Set());
            }
            visibilityGroups.get(visKey)!.add(instanceId);
        }
        
        // Create batches for each visibility configuration
        for (const [visKey, instances] of visibilityGroups) {
            const enabledNodes = this.parseVisibilityKey(visKey, modelData.renderableNodes);
            
            batches.push({
                modelId,
                instances: Array.from(instances),
                renderableNodes: enabledNodes
            });
        }
        
        return batches;
    }
    
    /**
     * Create a unique key representing which nodes are enabled
     */
    private createVisibilityKey(model: Model, renderableNodes: any[]): string {
        const enabledBits: boolean[] = [];
        
        for (const node of renderableNodes) {
            const nodeName = node.node.name || `node_${node.node.indexData.nodeIndex}`;
            enabledBits.push(model.isNodeEnabled(nodeName));
        }
        
        // Convert to a compact string representation
        return enabledBits.map(b => b ? '1' : '0').join('');
    }
    
    /**
     * Parse visibility key back to list of enabled nodes
     */
    private parseVisibilityKey(visKey: string, renderableNodes: any[]): any[] {
        const enabledNodes: any[] = [];
        
        for (let i = 0; i < renderableNodes.length && i < visKey.length; i++) {
            if (visKey[i] === '1') {
                enabledNodes.push(renderableNodes[i]);
            }
        }
        
        return enabledNodes;
    }
}

interface RenderBatch {
    modelId: string;
    instances: number[];
    renderableNodes: any[];
}