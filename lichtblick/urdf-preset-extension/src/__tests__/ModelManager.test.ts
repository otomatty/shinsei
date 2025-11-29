/**
 * ModelManager Test Suite
 *
 * Tests for URDF model loading and caching functionality
 */

import { ModelManager } from "../models/ModelManager";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods
jest.spyOn(console, "log").mockImplementation();
jest.spyOn(console, "warn").mockImplementation();
jest.spyOn(console, "error").mockImplementation();

describe("ModelManager", () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    jest.clearAllMocks();
    modelManager = new ModelManager();
  });

  afterEach(() => {
    modelManager.clearCache();
  });

  describe("Constructor", () => {
    test("should create ModelManager instance", () => {
      expect(modelManager).toBeInstanceOf(ModelManager);
    });
  });

  describe("loadModel", () => {
    const mockUrdfContent = `<?xml version="1.0"?>
<robot name="test_robot">
  <link name="base_link">
    <visual>
      <geometry>
        <box size="1 1 1"/>
      </geometry>
    </visual>
  </link>
</robot>`;

    test("should load valid URDF from URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockUrdfContent),
      });

      const result = await modelManager.loadModel("robot_a");

      expect(result).toBe(mockUrdfContent);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("robot_a"),
        expect.objectContaining({
          headers: {
            Accept: "application/xml, text/xml, text/plain, */*",
          },
        }),
      );
    });

    test("should fallback to default model on HTTP error", async () => {
      // robot_c fails, default model succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockUrdfContent),
        });

      const result = await modelManager.loadModel("robot_c");

      expect(result).toBe(mockUrdfContent);
      expect(mockFetch).toHaveBeenCalledTimes(2); // robot_c + default fallback
    });

    test("should fallback to default model on network error", async () => {
      // robot_a fails, default model succeeds
      mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockUrdfContent),
      });

      const result = await modelManager.loadModel("robot_a");

      expect(result).toBe(mockUrdfContent);
      expect(mockFetch).toHaveBeenCalledTimes(2); // robot_a + default fallback
    });

    test("should fallback to minimal URDF when default model also fails", async () => {
      // Both robot_a and default fail
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Default also failed"));

      const result = await modelManager.loadModel("robot_a");

      expect(result).toContain("<robot name=");
      expect(result).toContain("fallback_robot");
      expect(result).toContain("base_link");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test("should use cached content when available", async () => {
      // First call succeeds and caches
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockUrdfContent),
      });

      // First load
      await modelManager.loadModel("robot_a");

      // Second load should use cache (no additional fetch)
      const result = await modelManager.loadModel("robot_a");

      expect(result).toBe(mockUrdfContent);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });
  });

  describe("Caching", () => {
    test("should return cache statistics", () => {
      const stats = modelManager.getCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("entries");
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(typeof stats.size).toBe("number");
    });

    test("should clear cache and reset statistics", async () => {
      // Load a model to populate cache
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("<robot name='test'/>"),
      });

      await modelManager.loadModel("robot_a");

      // Clear cache
      modelManager.clearCache();
      const stats = modelManager.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe("Timeout Handling", () => {
    test("should fall back to minimal URDF on fetch timeout", async () => {
      // Mock a slow response that would trigger timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("fetch timeout"));
        }, 100);
      });

      mockFetch.mockReturnValueOnce(timeoutPromise);

      const result = await modelManager.loadModel("robot_a");
      // Should return minimal URDF, not throw error
      expect(result).toContain("<robot");
      expect(typeof result).toBe("string");
    }, 10000); // 10 second timeout for this test
  });
});
