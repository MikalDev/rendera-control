# Rendera Types

TypeScript type definitions for the Rendera 3D renderer plugin for Construct 3.

## Installation

```bash
npm install @rendera/types --save-dev
```

## Usage

In your TypeScript files:

```typescript
/// <reference types="@rendera/types" />

// Now you can use globalThis.rendera with full type support
const instanceManager = globalThis.rendera.instanceManager;
const model = instanceManager.createModel('myModel');
```

Or import specific types:

```typescript
import type { InstanceManager, Model } from '@rendera/types';
```

## Available Types

- `InstanceManager` - Main manager for 3D model instances
- `Model` - Individual 3D model instance
- `ModelLoader` - Handles loading of 3D models
- `AnimationController` - Controls model animations
- `GPUResourceManager` - Manages GPU resources
- `ShadowMapManager` - Handles shadow mapping
- And more...

## Global Access

The types assume that rendera is available on `globalThis`:

```typescript
globalThis.rendera.instanceManager
globalThis.rendera.modelLoader
// etc.
```
