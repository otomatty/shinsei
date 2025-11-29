# Forked Project Auto-Update Issue

## Overview

When forking the Lichtblick project for custom development, users may encounter an issue where their forked application automatically updates to the original project's releases, overwriting their custom changes. This document explains the root cause, provides solutions, and offers best practices for managing forked Electron applications.

## Problem Description

### Symptoms

- Forked Electron application automatically downloads and installs updates from the original BMW AG/lichtblick repository
- Custom code changes are lost after automatic updates
- Application reverts to the original project's version without user consent

### Root Cause

The issue stems from Electron's auto-update mechanism using `electron-updater` package, which:

1. **Reads `package.json` repository field**: The auto-updater uses the `repository.url` field to determine the update source
2. **Checks GitHub Releases**: It monitors `https://github.com/lichtblick-suite/lichtblick/releases` for new versions
3. **Downloads original binaries**: When updates are found, it downloads the original project's compiled binaries, not your fork

### Technical Details

The `StudioAppUpdater` class in `packages/suite-desktop/src/main/StudioAppUpdater.ts` implements the auto-update logic:

```typescript
// Auto-update check runs every hour
#updateCheckIntervalSec = 60 * 60;

// First check starts 10 minutes after app launch
#initialUpdateDelaySec = 60 * 10;
```

The updater uses `electron-updater` which automatically detects the update source from:

- `package.json` → `repository.url` field
- GitHub API to check for newer releases
- Downloads and installs official release binaries

## Solutions

### Solution 1: Disable Auto-Update via Settings (User-Level)

**Recommended for end users**

1. Launch the application
2. Open Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux)
3. Navigate to "General" tab
4. Uncheck "Automatically install updates"

**Pros**: Easy to implement, reversible
**Cons**: Users can re-enable it, not foolproof

### Solution 2: Disable Auto-Update in Development Environment

**For developers during development**

Set the environment variable when running the application:

```bash
NODE_ENV=development yarn start
# or
NODE_ENV=development yarn desktop:serve
```

Auto-updates are automatically disabled in development mode.

### Solution 3: Code-Level Disable (Recommended for Forks)

**For permanent disabling in forked projects**

Modify `packages/suite-desktop/src/main/StudioAppUpdater.ts`:

```typescript
/**
 * Start the update process.
 */
public start(): void {
  // Disable auto-updates for forked project
  log.info("Automatic updates disabled (forked project)");
  return;

  // Original code below (now unreachable)
  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  // ... rest of original implementation
}
```

**Pros**: Completely prevents auto-updates, clear intent
**Cons**: Requires code modification

### Solution 4: Update Repository Configuration

**For maintaining update capability with your own releases**

1. Update `package.json` to point to your fork:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/lichtblick.git"
  }
}
```

2. Set up your own release pipeline using GitHub Actions
3. Publish your own releases to enable updates from your fork

**Pros**: Maintains update functionality with your releases
**Cons**: Requires setting up CI/CD pipeline

## Best Practices for Forked Projects

### 1. Immediate Actions After Forking

- [ ] Disable auto-updates using Solution 3 (code-level disable)
- [ ] Update `package.json` repository URL to your fork
- [ ] Update application name and version to distinguish from original
- [ ] Review and update any hardcoded references to original repository

### 2. Development Workflow

- [ ] Always test with `NODE_ENV=development` during development
- [ ] Use version control branches for feature development
- [ ] Regularly sync with upstream if needed (manual process)
- [ ] Document any configuration changes for team members

### 3. Release Management

- [ ] Create your own release process if updates are needed
- [ ] Use semantic versioning different from upstream
- [ ] Consider using different update channels (beta, stable, etc.)
- [ ] Implement proper code signing for production releases

## Technical References

### Key Files

- `packages/suite-desktop/src/main/StudioAppUpdater.ts` - Main auto-update logic
- `packages/suite-desktop/src/main/index.ts` - Auto-updater initialization
- `package.json` - Repository configuration
- `packages/suite-desktop/src/electronBuilderConfig.js` - Build configuration

### Related Technologies

- **electron-updater**: Auto-update library for Electron applications
- **update.electronjs.org**: Free update service for open-source Electron apps
- **GitHub Releases**: Platform for distributing application updates

### Useful Resources

- [Electron Auto-Update Documentation](https://www.electronjs.org/docs/latest/tutorial/tutorial-publishing-updating)
- [electron-updater GitHub Repository](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater)
- [update.electronjs.org Service](https://github.com/electron/update.electronjs.org)
- [Electron Builder Auto-Update Guide](https://www.electron.build/auto-update)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

## Troubleshooting

### Common Issues

**Q: Auto-update still occurs after disabling in settings**
A: The setting only affects user preference. For forked projects, use Solution 3 (code-level disable) for guaranteed prevention.

**Q: How to verify auto-update is disabled?**
A: Check application logs for "Automatic updates disabled (forked project)" message, or monitor network traffic for update check requests.

**Q: Can I selectively update from upstream?**
A: Yes, but this requires manual process:

1. Monitor upstream releases
2. Cherry-pick desired changes
3. Test thoroughly before releasing
4. Maintain your own version numbering

**Q: What about security updates?**
A: Forked projects are responsible for monitoring and applying security updates manually. Consider:

- Subscribing to upstream security advisories
- Regular security audits of dependencies
- Implementing your own update mechanism for critical patches

### Debugging Auto-Update Issues

Enable detailed logging:

```typescript
// In main process
const log = require("electron-log");
log.transports.file.level = "debug";
autoUpdater.logger = log;
```

Check log files for update-related messages:

- macOS: `~/Library/Logs/Lichtblick/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\Lichtblick\logs\main.log`
- Linux: `~/.config/Lichtblick/logs/main.log`

## Conclusion

The auto-update issue in forked Electron projects is a common challenge that stems from the default behavior of `electron-updater` reading the original repository configuration. By understanding the root cause and implementing the appropriate solution based on your use case, you can maintain control over your forked application's update process.

For most forked projects intended for custom development, **Solution 3 (code-level disable)** is recommended as it provides the most reliable prevention of unwanted updates while clearly documenting the intent.

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Applies To**: Lichtblick Suite (formerly Foxglove Studio)
**Author**: Development Team Documentation
