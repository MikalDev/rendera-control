# Rendera Controller

A Construct 3 plugin for controlling the Rendera 3D rendering engine.

## Quick Start

### Prerequisites
- Node.js (for TypeScript compilation)
- Construct 3 (with Developer Mode enabled)

### Setup
```bash
# Clone and setup
git clone <repository-url>
cd rendera-control
npm install

# Copy rendera types (if rendera project is in sibling directory)
npm run copy-types

# Build TypeScript to JavaScript
npm run build
```

### Using in Construct 3
1. Enable **Developer Mode** in Construct 3
2. Go to **Menu → Developer mode → Set up TypeScript for addon**
3. Select this project folder (creates `ts-defs/`)
4. In Construct 3: **Menu → View → Addon Manager → Add dev addon**
5. Select this project folder
6. Plugin appears as **"Rendera Controller"** in object types

## Development Commands

```bash
npm run build        # Compile TypeScript once
npm run watch        # Auto-compile on file changes
npm run copy-types   # Sync rendera types from sibling project
npm run clean        # Remove compiled JavaScript files
npm run rebuild      # Clean and build
```

## Project Structure

```
rendera-control/
├── src/
│   ├── c3runtime/          # Runtime plugin code
│   │   ├── instance.ts     # Main drawing instance
│   │   ├── actions.ts      # Plugin actions
│   │   ├── conditions.ts   # Plugin conditions
│   │   └── expressions.ts  # Plugin expressions
│   ├── plugin.ts           # Editor plugin definition
│   ├── type.ts             # Editor object type
│   ├── instance.ts         # Editor instance behavior
│   ├── addon.json          # Plugin configuration
│   ├── aces.json           # Actions/Conditions/Expressions
│   └── lang/en-US.json     # Localization strings
├── ts-defs/                # Construct 3 type definitions (generated)
├── rendera-types/          # Rendera 3D engine type definitions
└── CLAUDE.md               # Detailed development guide
```

## Versioning Guide

Use **Semantic Versioning** (Major.Minor.Patch):

- **Major (1.0.0 → 2.0.0)**: Breaking changes, incompatible API changes
- **Minor (1.0.0 → 1.1.0)**: New features, backwards compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, backwards compatible

### Examples:
- `1.0.0` → `1.0.1`: Fixed rendering bug
- `1.0.0` → `1.1.0`: Added new animation controls  
- `1.0.0` → `2.0.0`: Changed plugin API, requires project updates

**Update version in**: `src/addon.json` and `package.json`

## Git Workflow

### Branch Strategy
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/feature-name`**: New features
- **`fix/bug-description`**: Bug fixes
- **`hotfix/critical-fix`**: Emergency production fixes

### Commit Messages (YANGI Pattern)

**Format**: `type: short description`

**Types**:
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat: add model rotation controls
fix: resolve texture loading crash
docs: update API documentation
style: format TypeScript files
refactor: optimize rendering loop
test: add unit tests for animations
chore: update dependencies
```

### Basic Workflow
```bash
# Create feature branch
git checkout -b feature/new-animation-system

# Make changes and commit
git add .
git commit -m "feat: add keyframe animation support"

# Push and create pull request
git push origin feature/new-animation-system
```

### Best Practices
- **Commit often**: Small, focused commits
- **Test before push**: Run `npm run build` 
- **One feature per branch**: Keep changes focused
- **Write clear messages**: Explain the "why", not just "what"

## TypeScript Configuration

- **Strict where possible**: Enabled null checks, function types
- **Construct 3 compatible**: Disabled implicit any, strict mode
- **Type definitions**: Includes both Construct 3 and Rendera types

## Important Notes

- **JavaScript files are ignored** in git (generated from TypeScript)
- **Both .ts and .js needed locally** for Construct 3 to work
- **Run `npm run build` after git operations** to regenerate JavaScript
- **Update `ts-defs/` periodically** using Construct 3's TypeScript setup

## Support

- See `CLAUDE.md` for detailed development information
- Check Construct 3 plugin documentation for API details
- Review rendera-types for 3D engine integration options