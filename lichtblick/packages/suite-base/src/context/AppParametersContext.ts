// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { Immutable } from "@lichtblick/suite";
import { AppParametersEnum } from "@lichtblick/suite-base/AppParameters";

/**
 * 入力パラメータの型定義
 *
 * 任意の文字列キーと文字列値を許可
 */
export type AppParametersInput = Readonly<Record<string, string>>;

/**
 * アプリケーションパラメータの型定義
 *
 * AppParametersEnum に制限されたキーを使用
 */
export type AppParameters = Readonly<Record<AppParametersEnum, string | undefined>>;

export type AppParametersContext = Immutable<AppParameters>;

/**
 * ## AppParametersContext
 *
 * **アプリケーションパラメータ管理のContext**
 *
 * ### 概要
 * - アプリケーション起動時のパラメータを管理
 * - 型安全なパラメータアクセスを提供
 * - 設定値の一元管理
 *
 * ### 使用例
 * ```typescript
 * const params = useAppParameters();
 * const debugMode = params[AppParametersEnum.DEBUG];
 * ```
 */
export const AppParametersContext = createContext<undefined | AppParametersContext>(undefined);

/**
 * アプリケーションパラメータを取得するカスタムフック
 *
 * @returns AppParameters - アプリケーションパラメータ
 * @throws Error - プロバイダーが設定されていない場合
 */
export function useAppParameters(): AppParameters {
  const context = useContext(AppParametersContext);
  if (context == undefined) {
    throw new Error("useAppParameters must be used within a AppParametersProvider");
  }
  return context;
}
