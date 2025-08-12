# Deployment Guide

This guide explains how to build and deploy the Rendera Control plugin to itch.io.

## Prerequisites

1. Node.js and npm installed
2. An itch.io account with a project created for your plugin
3. Butler API key from itch.io

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure itch.io Credentials

Copy the environment template and fill in your details:

```bash
cp .env.example .env
```

Edit `.env` with your information:
- `ITCH_USER`: Your itch.io username
- `ITCH_GAME`: Your project name (as it appears in the URL)
- `BUTLER_API_KEY`: Get from https://itch.io/user/settings/api-keys
- `ITCH_CHANNEL`: Channel name (e.g., `construct3-stable`)

### 3. Setup Butler (First Time Only)

Butler is the official itch.io command-line upload tool. Install it with:

```bash
npm run setup:butler
```

This downloads and installs butler to the `tools/butler/` directory.

## Building the Plugin

### Build TypeScript and Package

```bash
npm run package
```

This command:
1. Compiles TypeScript files to JavaScript
2. Creates a versioned `.c3addon` file in the `dist/` directory

### Package Only (Without Rebuild)

```bash
npm run package:addon
```

## Deploying to itch.io

### One-Step Deploy

Build and upload in one command:

```bash
npm run deploy:itch
```

### Upload Only

If you've already built the addon:

```bash
npm run upload:itch
```

## Version Management

The version number is read from `src/addon.json`. Update it before deploying:

1. Edit `src/addon.json`
2. Change the `version` field (e.g., `"1.1.0"` → `"1.2.0"`)
3. Build and deploy

## Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch and auto-compile TypeScript changes |
| `npm run clean` | Remove generated JavaScript files |
| `npm run package` | Build and create .c3addon file |
| `npm run package:addon` | Create .c3addon without rebuilding |
| `npm run setup:butler` | Download and install butler tool |
| `npm run deploy:itch` | Build and upload to itch.io |
| `npm run upload:itch` | Upload existing build to itch.io |

## CI/CD Integration

For automated deployments (GitHub Actions, etc.):

1. Set `BUTLER_API_KEY` as a secret in your CI environment
2. Set other required environment variables
3. Run deployment commands:

```yaml
- run: npm install
- run: npm run package
- run: npm run upload:itch
  env:
    BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}
    ITCH_USER: your-username
    ITCH_GAME: your-game
    ITCH_CHANNEL: construct3-stable
```

## Troubleshooting

### "Missing required environment variables"
- Ensure `.env` file exists and contains all required variables
- Check that API key is valid

### "Addon file not found"
- Run `npm run package` first to build the addon

### "Invalid target" error from butler
- Verify `ITCH_USER` and `ITCH_GAME` match your itch.io project
- Ensure the project exists on itch.io before uploading

### Authentication errors
- Regenerate API key from https://itch.io/user/settings/api-keys
- Ensure the key has "butler" as its source

## Security Notes

- Never commit `.env` file to version control
- Keep your `BUTLER_API_KEY` secret
- The `.gitignore` file excludes sensitive files automatically