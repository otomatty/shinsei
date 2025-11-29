// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import { LOCAL_STORAGE_PROFILE_DATA } from "@lichtblick/suite-base/constants/browserStorageKeys";
import {
  UserProfile,
  UserProfileStorageContext,
} from "@lichtblick/suite-base/context/UserProfileStorageContext";

/**
 * デフォルトのユーザープロファイル設定
 * 新規ユーザーまたはプロファイルが存在しない場合に使用される初期値
 */
const DEFAULT_PROFILE: UserProfile = {};

/**
 * ユーザープロファイルをlocalStorageで管理するProvider
 *
 * @description
 * このProviderは以下の機能を提供します：
 * - ユーザープロファイル情報のlocalStorageへの永続化
 * - プロファイルデータの非同期読み込み・書き込み
 * - 初回起動時のタイムスタンプ記録
 * - プロファイルデータの部分更新とマージ機能
 *
 * @features
 * - **永続化**: ブラウザのlocalStorageを使用してデータを保存
 * - **初回起動検出**: firstSeenTimeとfirstSeenTimeIsFirstLoadフラグで初回起動を判定
 * - **部分更新**: 既存データを保持しながら新しいデータをマージ
 * - **型安全性**: TypeScriptによる型チェックでデータの整合性を保証
 *
 * @usage
 * ```tsx
 * <UserProfileLocalStorageProvider>
 *   <App />
 * </UserProfileLocalStorageProvider>
 * ```
 *
 * @context UserProfileStorageContext - ユーザープロファイルの読み書き機能を提供
 */
export default function UserProfileLocalStorageProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  /**
   * localStorage からユーザープロファイルを非同期で取得
   *
   * @returns Promise<UserProfile> - ユーザープロファイルデータ、存在しない場合はデフォルトプロファイル
   *
   * @description
   * - localStorage からJSON形式で保存されたプロファイルデータを読み込み
   * - データが存在しない場合はDEFAULT_PROFILEを返す
   * - JSON.parseエラーは上位でキャッチされる想定
   */
  const getUserProfile = useCallback(async (): Promise<UserProfile> => {
    const item = localStorage.getItem(LOCAL_STORAGE_PROFILE_DATA);
    return item != undefined ? (JSON.parse(item) as UserProfile) : DEFAULT_PROFILE;
  }, []);

  /**
   * ユーザープロファイルを localStorage に非同期で保存
   *
   * @param value - 保存するプロファイルデータまたは更新関数
   * @returns Promise<void>
   *
   * @description
   * - 関数形式の場合：現在のプロファイルを引数として呼び出し、戻り値を保存
   * - オブジェクト形式の場合：既存データとマージして保存
   * - lodash.mergeを使用して深いマージを実行
   * - データはJSON文字列として localStorage に保存
   */
  const setUserProfile = useCallback(
    async (value: UserProfile | ((prev: UserProfile) => UserProfile)) => {
      const item = localStorage.getItem(LOCAL_STORAGE_PROFILE_DATA);
      const prev = item != undefined ? (JSON.parse(item) as UserProfile) : DEFAULT_PROFILE;
      const newProfile = typeof value === "function" ? value(prev) : _.merge(prev, value);
      localStorage.setItem(LOCAL_STORAGE_PROFILE_DATA, JSON.stringify(newProfile) ?? "");
    },
    [],
  );

  /**
   * 初回起動時のタイムスタンプ記録
   *
   * @description
   * アプリケーションの初回起動時に以下の情報を記録：
   * - firstSeenTime: 初回起動時刻のISO文字列
   * - firstSeenTimeIsFirstLoad: 真の初回起動かどうかのフラグ
   *
   * @logic
   * - firstSeenTimeが未設定の場合、現在時刻を記録
   * - firstSeenTimeIsFirstLoadは、currentLayoutIdが未設定の場合にtrueを設定
   * - これにより、レイアウトが設定済みの既存ユーザーと新規ユーザーを区別
   */
  useEffect(() => {
    setUserProfile((old) => ({
      ...old,
      firstSeenTime: old.firstSeenTime ?? new Date().toISOString(),
      firstSeenTimeIsFirstLoad: old.firstSeenTimeIsFirstLoad ?? old.currentLayoutId == undefined,
    })).catch((err: unknown) => {
      console.error(err);
    });
  }, [setUserProfile]);

  /**
   * UserProfileStorageContext に提供するストレージ操作オブジェクト
   *
   * @description
   * - useShallowMemo を使用して参照の安定性を保つ
   * - 依存関係が変更されない限り、同じオブジェクトを返す
   * - 不要な再レンダリングを防止してパフォーマンスを向上
   */
  const storage = useShallowMemo({
    getUserProfile,
    setUserProfile,
  });

  return (
    <UserProfileStorageContext.Provider value={storage}>
      {children}
    </UserProfileStorageContext.Provider>
  );
}
