// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// このソースコードは Mozilla Public License, v. 2.0 の条件の下で提供されます。
// このファイルと共にMPLのコピーが配布されていない場合は、
// http://mozilla.org/MPL/2.0/ で入手できます。

import { useEffect } from "react";
import { createRoot } from "react-dom/client";

import Logger from "@lichtblick/log";
import type { IDataSourceFactory } from "@lichtblick/suite-base";
import CssBaseline from "@lichtblick/suite-base/components/CssBaseline";

import { CompatibilityBanner } from "./CompatibilityBanner";
import { canRenderApp } from "./canRenderApp";

const log = Logger.getLogger(__filename);

function LogAfterRender(props: React.PropsWithChildren): React.JSX.Element {
  useEffect(() => {
    // 統合テストはこのコンソールログを監視してアプリが一度レンダリングされたことを確認します
    // プロダクションビルドで一部のログレベルを隠すログライブラリを迂回するためconsole.debugを使用します
    console.debug("App rendered");
  }, []);
  return <>{props.children}</>;
}

export type MainParams = {
  dataSources?: IDataSourceFactory[];
  extraProviders?: React.JSX.Element[];
  rootElement?: React.JSX.Element;
};

export async function main(getParams: () => Promise<MainParams> = async () => ({})): Promise<void> {
  log.debug("initializing");

  window.onerror = (...args) => {
    console.error(...args);
  };

  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error("missing #root element");
  }

  const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)\./);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[1] ?? "", 10) : 0;
  const isChrome = chromeVersion !== 0;

  const canRender = canRenderApp();
  const banner = (
    <CompatibilityBanner
      isChrome={isChrome}
      currentVersion={chromeVersion}
      isDismissable={canRender}
    />
  );

  if (!canRender) {
    const root = createRoot(rootEl);
    root.render(
      <LogAfterRender>
        <CssBaseline>{banner}</CssBaseline>
      </LogAfterRender>,
    );
    return;
  }

  // CompatibilityBannerが表示されるまでsuite-baseコードの大部分の読み込みを遅延させるため、
  // 非同期インポートを使用します。
  const { installDevtoolsFormatters, overwriteFetch, waitForFonts, initI18n, StudioApp } =
    await import("@lichtblick/suite-base");
  installDevtoolsFormatters();
  overwriteFetch();
  // アプリローディング画面を表示するため、waitForFontsをApp内に移動することを検討してください
  await waitForFonts();
  await initI18n();

  const { WebRoot } = await import("./WebRoot");
  const params = await getParams();
  const rootElement = params.rootElement ?? (
    <WebRoot extraProviders={params.extraProviders} dataSources={params.dataSources}>
      <StudioApp />
    </WebRoot>
  );

  const root = createRoot(rootEl);
  root.render(
    <LogAfterRender>
      {banner}
      {rootElement}
    </LogAfterRender>,
  );
}
