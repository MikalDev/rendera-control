# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Construct 3 plugin project called "rendera-control" that provides custom drawing functionality with 3D model rendering capabilities. The plugin uses TypeScript for development and compiles to JavaScript for runtime execution.

## Architecture

### Plugin Structure
- **Editor Scripts** (`src/`): Define the plugin interface in Construct 3 editor
  - `plugin.ts/js`: Main plugin definition and properties
  - `type.ts/js`: Object type configuration  
  - `instance.ts/js`: Instance-specific editor behavior
  - `aces.json`: Actions, Conditions, and Expressions definitions

- **Runtime Scripts** (`src/c3runtime/`): Handle runtime behavior
  - `main.ts/js`: Runtime initialization
  - `plugin.ts/js`: Runtime plugin class
  - `type.ts/js`: Runtime object type
  - `instance.ts/js`: Core drawing instance with WebGL rendering
  - `actions.ts/js`, `conditions.ts/js`, `expressions.ts/js`: ACE implementations

- **Reference Implementation** (`rendera-reference/`): Advanced 3D model rendering system
  - `InstanceManager.ts`: Manages multiple 3D model instances with GPU optimization
  - `Model.ts`: Model interface for position, rotation, scale, and animation control
  - Supports WebGL2 features including shadow mapping, skinned animations, and instanced rendering

### Key Concepts
- The plugin follows Construct 3's SDK v2 structure
- TypeScript files compile to JavaScript (both `.ts` and `.js` files exist)
- Uses WebGL for custom rendering within Construct 3's canvas
- The reference implementation shows advanced GPU resource management patterns

## Development Commands

### Initial Setup
```bash
# Install dependencies (TypeScript)
npm install

# IMPORTANT: Set up TypeScript definitions from Construct 3
# 1. Enable Developer Mode in Construct 3
# 2. Go to Menu → Developer mode → Set up TypeScript for addon
# 3. Select this project folder when prompted
# This creates the ts-defs folder with Construct's type definitions
```

### Build TypeScript
```bash
# Build all TypeScript files
npm run build

# Watch mode for development
npm run watch

# Clean generated JS files (only removes JS files that have corresponding TS files)
npm run clean

# Clean and rebuild
npm run rebuild

# Copy rendera function types from sibling project
npm run copy-types
```

### TypeScript Configuration Notes
- The project uses balanced TypeScript settings in `src/tsconfig.json` - strict where possible, relaxed for Construct 3 compatibility
- **Enabled Strict Features**: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- **Disabled for C3 Compatibility**: `noImplicitAny`, `strict`, `strictPropertyInitialization`, `noImplicitOverride`
- Both `.ts` and `.js` files must exist - Construct loads the compiled JavaScript
- Runtime files include references to:
  - `/// <reference path="../../ts-defs/runtime/AddonSDK.d.ts" />` (Construct 3 types)
  - `/// <reference path="../../rendera-types/modules/index.d.ts" />` (Rendera 3D engine types)
- Editor files include references to:
  - `/// <reference path="../ts-defs/editor/sdk.d.ts" />` (Construct 3 editor types)
  - `/// <reference path="../rendera-types/modules/index.d.ts" />` (Rendera 3D engine types)

### Rendera Types Integration
The plugin now has access to all rendera function names and interfaces:
- **Core Types**: `Model`, `InstanceManager`, `ModelLoader`, `GPUResourceManager`
- **Animation Types**: `AnimationOptions`, `AnimationState`, `NodeTransforms`
- **Geometry Types**: `Transform`, `InstanceId`, `ModelId`
- **System Types**: `MaterialSystem`, `ShadowMapManager`, `SceneGraph`

Use `npm run copy-types` to sync the latest rendera types from the sibling project.

## Git Workflow

### Repository Setup
The project includes a comprehensive `.gitignore` that:
- Excludes compiled JavaScript files (they're generated from TypeScript)
- Ignores `node_modules` and build artifacts
- Excludes IDE-specific files and OS-generated files
- Maintains clean repository with only source files

### Important Notes
- **JavaScript files are ignored** - Only TypeScript source files are tracked
- **Both `.ts` and `.js` files needed locally** - Construct 3 loads the compiled JavaScript
- **Run `npm run build` after cloning** - Generates required JavaScript files

### Testing
To test the plugin in Construct 3:
1. Enable Developer Mode in Construct 3
2. Add the plugin folder via "Add dev addon"
3. The plugin will appear as "My drawing plugin" in the editor

## ACE Implementation

When implementing Actions, Conditions, and Expressions, use these schema references:

- **ACEs Definition**: `schema/aces.schema.json` - Schema for `src/aces.json`
- **Plugin Configuration**: `schema/plugin.addon.schema.json` - Schema for `src/addon.json`
- **Language/Localization**: `schema/plugin.lang.schema.json` - Schema for `src/lang/en-US.json`

These schemas provide validation and structure for:
- Defining new actions, conditions, and expressions in `aces.json`
- Configuring plugin metadata and properties in `addon.json`
- Adding localized strings for the plugin interface

## Design Patterns and Principles

Follow these principles when working on this codebase:

### DRY (Don't Repeat Yourself)
- Extract common logic into reusable functions or methods
- Use type definitions and interfaces to avoid duplicating type information
- Example: Node visibility is handled by the Model class, not duplicated in C3 plugin

### YAGNI (You Aren't Gonna Need It)
- Only implement features that are currently needed
- Don't add speculative functionality or over-engineer solutions
- Example: Node filtering implementation focuses on current needs, not hypothetical future features

### SOLID Principles
- **Single Responsibility**: Each class/module has one clear purpose (e.g., Model handles model state, InstanceManager handles rendering)
- **Open/Closed**: Extend behavior through composition, not modification (e.g., adding node visibility to Model without changing core functionality)
- **Liskov Substitution**: Type implementations match their interfaces exactly
- **Interface Segregation**: Use focused interfaces (IModel, IInstanceManager) rather than large monolithic ones
- **Dependency Inversion**: Depend on abstractions (interfaces) not concrete implementations

### KISS (Keep It Simple, Stupid)
- Prefer simple, readable solutions over clever optimizations
- Use clear variable names and straightforward logic
- Example: Direct method calls like `model.disableNode(name)` instead of complex state management

## Important Notes

- Both `.ts` and `.js` files must be maintained as Construct 3 loads the JavaScript files
- The `addon.json` file lists all files that must be included in the plugin
- WebGL context is accessed through Construct 3's renderer system
- The plugin integrates with Construct 3's world coordinate system for proper rendering
- **IMPORTANT**: Always check the rendera types in `rendera-types/modules/index.d.ts` or reference implementation files for correct function names and signatures when using the rendera API. Do not assume function names - verify them against the type definitions.