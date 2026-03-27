import { describe, it, expect } from 'vitest';

describe('Android Permissions Configuration', () => {
  it('should have blockedPermissions at android level in config', async () => {
    // Read the app.config.ts file content
    const fs = await import('fs');
    const configContent = fs.readFileSync('./app.config.ts', 'utf-8');
    
    // Verify blockedPermissions is present in the config
    expect(configContent).toContain('blockedPermissions');
    
    // Verify ACTIVITY_RECOGNITION is in blockedPermissions
    expect(configContent).toContain('android.permission.ACTIVITY_RECOGNITION');
    expect(configContent).toContain('com.google.android.gms.permission.ACTIVITY_RECOGNITION');
    expect(configContent).toContain('android.permission.RECORD_AUDIO');
  });

  it('should have blockedPermissions under android config, not under expo-build-properties', async () => {
    const fs = await import('fs');
    const configContent = fs.readFileSync('./app.config.ts', 'utf-8');
    
    // Find the android: { section and check blockedPermissions is there
    const androidSectionMatch = configContent.match(/android:\s*\{[\s\S]*?blockedPermissions/);
    expect(androidSectionMatch).not.toBeNull();
    
    // Verify blockedPermissions is NOT inside expo-build-properties
    const buildPropsSection = configContent.match(/expo-build-properties[\s\S]*?\}/);
    if (buildPropsSection) {
      expect(buildPropsSection[0]).not.toContain('blockedPermissions');
    }
  });

  it('should only request location permissions', async () => {
    const fs = await import('fs');
    const configContent = fs.readFileSync('./app.config.ts', 'utf-8');
    
    // Verify only location permissions are in the permissions array
    expect(configContent).toContain('"ACCESS_FINE_LOCATION"');
    expect(configContent).toContain('"ACCESS_COARSE_LOCATION"');
    
    // Verify POST_NOTIFICATIONS is NOT in permissions
    expect(configContent).not.toMatch(/permissions:\s*\[[\s\S]*?POST_NOTIFICATIONS/);
  });

  it('should not have expo-audio or expo-video or expo-notifications in plugins', async () => {
    const fs = await import('fs');
    const configContent = fs.readFileSync('./app.config.ts', 'utf-8');
    
    expect(configContent).not.toContain('"expo-audio"');
    expect(configContent).not.toContain('"expo-video"');
    expect(configContent).not.toContain('"expo-notifications"');
  });
});
