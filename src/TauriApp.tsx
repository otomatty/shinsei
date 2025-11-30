/**
 * TauriApp
 *
 * Tauri環境用のLichtblick統合エントリーポイント
 * Lichtblick Appコンポーネントを、Tauri固有のサービスでラップして提供
 */
import { useMemo, useEffect, useState, useCallback } from "react";
import { App } from "@lichtblick/suite-base/App";
import type { IAppConfiguration } from "@lichtblick/suite-base/context/AppConfigurationContext";
import type { IDataSourceFactory } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import type { INativeWindow } from "@lichtblick/suite-base/context/NativeWindowContext";
import type { INativeAppMenu } from "@lichtblick/suite-base/context/NativeAppMenuContext";
import type { LayoutLoader } from "@lichtblick/suite-base/services/ILayoutLoader";
import type { IExtensionLoader } from "@lichtblick/suite-base/services/extension/IExtensionLoader";

import {
  AppConfigurationService,
  TauriNativeWindow,
  TauriNativeAppMenu,
  createTauriDataSourceFactories,
  DesktopBridge,
} from "./services";

/**
 * TauriAppのプロパティ
 */
export interface TauriAppProps {
  /** ディープリンク（起動時に開くURL） */
  deepLinks?: string[];

  /** グローバルCSSを有効にするか */
  enableGlobalCss?: boolean;

  /** 起動設定画面を有効にするか */
  enableLaunchPreferenceScreen?: boolean;

  /** 追加のデータソースファクトリー */
  extraDataSources?: IDataSourceFactory[];

  /** 追加のレイアウトローダー */
  layoutLoaders?: readonly LayoutLoader[];

  /** 追加の拡張ローダー */
  extensionLoaders?: readonly IExtensionLoader[];
}

/**
 * Tauri環境用のLichtblick統合コンポーネント
 *
 * @example
 * ```tsx
 * import { TauriApp } from "./TauriApp";
 *
 * function Main() {
 *   return <TauriApp enableGlobalCss={true} />;
 * }
 * ```
 */
export function TauriApp(props: TauriAppProps): React.JSX.Element {
  const {
    deepLinks = [],
    enableGlobalCss = false,
    enableLaunchPreferenceScreen = false,
    extraDataSources = [],
    layoutLoaders = [],
    extensionLoaders = [],
  } = props;

  // ウィンドウ状態
  const [isMaximized, setIsMaximized] = useState(false);

  // Tauri固有のサービスをメモ化
  const appConfiguration = useMemo<IAppConfiguration>(
    () =>
      new AppConfigurationService({
        // デフォルト設定
        "ui.colorScheme": "dark",
        "ui.language": "ja",
      }),
    []
  );

  const nativeWindow = useMemo<INativeWindow>(
    () => new TauriNativeWindow(),
    []
  );

  const nativeAppMenu = useMemo<INativeAppMenu>(
    () => new TauriNativeAppMenu(),
    []
  );

  // データソースファクトリーを統合
  const dataSources = useMemo<IDataSourceFactory[]>(() => {
    const tauriFactories = createTauriDataSourceFactories();
    return [...tauriFactories, ...extraDataSources];
  }, [extraDataSources]);

  // ウィンドウ状態の監視
  useEffect(() => {
    let mounted = true;

    const updateMaximizedState = async () => {
      try {
        const maximized = await DesktopBridge.isMaximized();
        if (mounted) {
          setIsMaximized(maximized);
        }
      } catch (error) {
        console.warn("Failed to get maximized state:", error);
      }
    };

    // 初期状態を取得
    void updateMaximizedState();

    // DesktopBridgeの初期化とイベント監視
    const setupWindowListener = async () => {
      try {
        await DesktopBridge.initialize();
        DesktopBridge.onWindowEvent((event) => {
          if (mounted) {
            if (event === "maximize") {
              setIsMaximized(true);
            } else if (event === "unmaximize") {
              setIsMaximized(false);
            }
          }
        });
      } catch (error) {
        console.warn("Failed to setup window listener:", error);
      }
    };

    void setupWindowListener();

    return () => {
      mounted = false;
    };
  }, []);

  // ウィンドウ操作コールバック
  const handleMinimizeWindow = useCallback(async () => {
    try {
      await DesktopBridge.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  }, []);

  const handleMaximizeWindow = useCallback(async () => {
    try {
      await DesktopBridge.maximize();
    } catch (error) {
      console.error("Failed to maximize window:", error);
    }
  }, []);

  const handleUnmaximizeWindow = useCallback(async () => {
    try {
      await DesktopBridge.unmaximize();
    } catch (error) {
      console.error("Failed to unmaximize window:", error);
    }
  }, []);

  const handleCloseWindow = useCallback(async () => {
    try {
      await DesktopBridge.close();
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  }, []);

  const handleAppBarDoubleClick = useCallback(async () => {
    try {
      await DesktopBridge.toggleMaximize();
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  }, []);

  return (
    <App
      appConfiguration={appConfiguration}
      appParameters={{}}
      dataSources={dataSources}
      deepLinks={deepLinks}
      extensionLoaders={extensionLoaders}
      layoutLoaders={layoutLoaders}
      nativeAppMenu={nativeAppMenu}
      nativeWindow={nativeWindow}
      enableLaunchPreferenceScreen={enableLaunchPreferenceScreen}
      enableGlobalCss={enableGlobalCss}
      showCustomWindowControls={true}
      isMaximized={isMaximized}
      onMinimizeWindow={handleMinimizeWindow}
      onMaximizeWindow={handleMaximizeWindow}
      onUnmaximizeWindow={handleUnmaximizeWindow}
      onCloseWindow={handleCloseWindow}
      onAppBarDoubleClick={handleAppBarDoubleClick}
    />
  );
}

export default TauriApp;
