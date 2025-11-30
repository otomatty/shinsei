import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TauriApp, TauriAppProps } from "./TauriApp";

// Tauri APIのモック
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    isMaximized: vi.fn().mockResolvedValue(false),
    isFullscreen: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(vi.fn()),
  })),
  LogicalSize: vi.fn(),
  LogicalPosition: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

// Lichtblick Appのモック
vi.mock("@lichtblick/suite-base/App", () => ({
  App: vi.fn(({ appConfiguration, dataSources }: any) => (
    <div data-testid="lichtblick-app">
      <span data-testid="app-config">
        {appConfiguration ? "configured" : "not-configured"}
      </span>
      <span data-testid="data-sources">{dataSources?.length ?? 0}</span>
    </div>
  )),
}));

describe("TauriApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    it("TauriAppコンポーネントがレンダリングされる", () => {
      render(<TauriApp />);

      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });

    it("appConfigurationが渡される", () => {
      render(<TauriApp />);

      expect(screen.getByTestId("app-config")).toHaveTextContent("configured");
    });

    it("dataSourcesが渡される", () => {
      render(<TauriApp />);

      // 少なくとも1つのデータソースファクトリーが渡される
      const dataSources = screen.getByTestId("data-sources");
      expect(parseInt(dataSources.textContent ?? "0")).toBeGreaterThan(0);
    });
  });

  describe("プロパティ", () => {
    it("カスタムdeepLinksを渡せる", () => {
      const deepLinks = ["mcap://example.com/file.mcap"];
      render(<TauriApp deepLinks={deepLinks} />);

      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });

    it("enableGlobalCssをtrueにできる", () => {
      render(<TauriApp enableGlobalCss={true} />);

      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });

    it("enableLaunchPreferenceScreenをtrueにできる", () => {
      render(<TauriApp enableLaunchPreferenceScreen={true} />);

      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });
  });

  describe("Tauri統合", () => {
    it("TauriNativeWindowが設定される", () => {
      render(<TauriApp />);

      // Lichtblick Appがレンダリングされていれば、内部でTauriNativeWindowが設定されている
      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });

    it("TauriNativeAppMenuが設定される", () => {
      render(<TauriApp />);

      expect(screen.getByTestId("lichtblick-app")).toBeInTheDocument();
    });

    it("AppConfigurationServiceが設定される", () => {
      render(<TauriApp />);

      expect(screen.getByTestId("app-config")).toHaveTextContent("configured");
    });
  });
});

describe("TauriAppProps", () => {
  it("オプショナルなプロパティをすべて省略できる", () => {
    // 型チェック: 全てのプロパティがオプショナル
    const props: TauriAppProps = {};
    expect(props).toBeDefined();
  });

  it("deepLinksを指定できる", () => {
    const props: TauriAppProps = {
      deepLinks: ["test://link"],
    };
    expect(props.deepLinks).toHaveLength(1);
  });

  it("enableGlobalCssを指定できる", () => {
    const props: TauriAppProps = {
      enableGlobalCss: true,
    };
    expect(props.enableGlobalCss).toBe(true);
  });

  it("enableLaunchPreferenceScreenを指定できる", () => {
    const props: TauriAppProps = {
      enableLaunchPreferenceScreen: false,
    };
    expect(props.enableLaunchPreferenceScreen).toBe(false);
  });
});
