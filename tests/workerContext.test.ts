import { describe, it, expect } from 'vitest';
import configuration from '../src/config/configuration.js';

describe('configuration', () => {
  it('should load config from environment', () => {
    const config = configuration();
    expect(config.port).toBe(8080);
    expect(config.gcp.projectId).toBe('mock-project');
    expect(config.gcp.region).toBe('asia-south1');
    expect(config.gcp.builderJobName).toBe('qwintly-builder');
    expect(config.gcp.deployerJobName).toBe('qwintly-deployer');
    expect(config.supabase.url).toBe('https://mock-supabase.co');
    expect(config.supabase.secretKey).toBe('mock-secret-key');
  });

  it('should fall back to defaults when PORT and REGION env variables are missing', () => {
    const originalPort = process.env.PORT;
    const originalRegion = process.env.REGION;
    delete process.env.PORT;
    delete process.env.REGION;

    const config = configuration();
    expect(config.port).toBe(8080);
    expect(config.gcp.region).toBe('asia-south1');

    process.env.PORT = originalPort;
    process.env.REGION = originalRegion;
  });
});
