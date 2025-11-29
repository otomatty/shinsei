import "@testing-library/jest-dom";
import { vi } from "vitest";

// Tauri APIのモック
const mockTauriFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readDir: vi.fn(),
  mkdir: vi.fn(),
  exists: vi.fn(),
  stat: vi.fn(),
};

const mockTauriDialog = {
  open: vi.fn(),
  save: vi.fn(),
};

vi.mock("@tauri-apps/plugin-fs", () => mockTauriFs);
vi.mock("@tauri-apps/plugin-dialog", () => mockTauriDialog);

// グローバルにモックをエクスポート
export { mockTauriFs, mockTauriDialog };
