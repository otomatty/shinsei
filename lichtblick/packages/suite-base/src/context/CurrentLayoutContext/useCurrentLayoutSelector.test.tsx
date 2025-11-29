/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";

import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";

import { LayoutState, useCurrentLayoutActions, useCurrentLayoutSelector } from "./index";

/**
 * useCurrentLayoutSelectorフックのテストスイート
 *
 * このテストスイートは、useCurrentLayoutSelectorフックの動作を検証します。
 * 主に以下の機能をテストします：
 *
 * 1. レイアウト状態変更時の更新
 * 2. セレクター関数変更時の更新
 * 3. 購読前の状態変更への対応
 *
 * テスト環境：
 * - Jest DOM環境を使用
 * - React Testing LibraryのrenderHookを使用
 * - MockCurrentLayoutProviderで模擬環境を構築
 */
describe("useCurrentLayoutSelector", () => {
  /**
   * レイアウト変更時の更新テスト
   *
   * レイアウト状態が変更された際に、セレクターが正しく
   * 新しい値を返すことを確認します。
   *
   * テストシナリオ：
   * 1. 初期状態でセレクターが正しい値を返すことを確認
   * 2. パネル設定を変更
   * 3. セレクターが更新された値を返すことを確認
   */
  it("updates when layout changes", () => {
    const { result } = renderHook(
      ({ selector }) => ({
        actions: useCurrentLayoutActions(),
        value: useCurrentLayoutSelector(selector),
      }),
      {
        initialProps: {
          selector: (layoutState: LayoutState) =>
            layoutState.selectedLayout?.data?.configById["foo"],
        },
        wrapper({ children }) {
          return (
            <MockCurrentLayoutProvider initialState={{ configById: { foo: { value: 42 } } }}>
              {children}
            </MockCurrentLayoutProvider>
          );
        },
      },
    );

    // 初期値の確認
    expect(result.current.value).toEqual({ value: 42 });

    // パネル設定を変更
    act(() => {
      result.current.actions.savePanelConfigs({ configs: [{ id: "foo", config: { value: 1 } }] });
    });

    // 更新された値の確認
    expect(result.current.value).toEqual({ value: 1 });
  });

  /**
   * セレクター変更時の更新テスト
   *
   * セレクター関数が変更された際に、フックが正しく
   * 新しいセレクターを使用して値を返すことを確認します。
   *
   * テストシナリオ：
   * 1. 初期セレクターで"foo"パネルの設定を取得
   * 2. セレクターを変更して"bar"パネルの設定を取得
   * 3. 新しいセレクターが正しい値を返すことを確認
   */
  it("updates when selector changes", () => {
    const { result, rerender } = renderHook(
      ({ selector }) => ({
        actions: useCurrentLayoutActions(),
        value: useCurrentLayoutSelector(selector),
      }),
      {
        initialProps: {
          selector: (layoutState: LayoutState) =>
            layoutState.selectedLayout?.data?.configById["foo"],
        },
        wrapper({ children }) {
          return (
            <MockCurrentLayoutProvider
              initialState={{
                configById: {
                  foo: { value: 42 },
                  bar: { otherValue: 0 },
                },
              }}
            >
              {children}
            </MockCurrentLayoutProvider>
          );
        },
      },
    );

    // 初期セレクターの値を確認
    expect(result.current.value).toEqual({ value: 42 });

    // セレクターを変更してbarパネルを選択
    rerender({ selector: (layoutState) => layoutState.selectedLayout?.data?.configById["bar"] });

    // 新しいセレクターの値を確認
    expect(result.current.value).toEqual({ otherValue: 0 });
  });

  /**
   * 購読前状態変更への対応テスト
   *
   * 兄弟コンポーネントがエフェクト内で設定を更新した場合、
   * フックがリスナーを追加する前に設定が変更される可能性があります。
   * このテストは、一貫した結果を生成するために、
   * 新しい値で即座に更新されることを確認します。
   *
   * テストシナリオ：
   * 1. ChangeStateコンポーネントがuseLayoutEffectで設定を変更
   * 2. useCurrentLayoutSelectorが購読前に変更を検出
   * 3. 正しい順序で値が更新されることを確認
   */
  it("updates when state changes before subscribe", () => {
    /**
     * 状態変更コンポーネント
     *
     * useLayoutEffectでパネル設定を更新するコンポーネント。
     * フックの購読前に状態変更が発生するシナリオを模擬。
     */
    function ChangeState() {
      const actions = useCurrentLayoutActions();
      const actionsRef = useRef(actions);
      actionsRef.current = actions;

      useLayoutEffect(() => {
        // パネル設定を更新（値を1増加）
        actionsRef.current.updatePanelConfigs("foo", ({ value }) => ({
          value: (value as number) + 1,
        }));
      }, []);

      return ReactNull;
    }

    const all: unknown[] = [];
    renderHook(
      ({ selector }) => {
        const value = useCurrentLayoutSelector(selector);
        // 全ての値の変更を記録
        all.push(value);
        return {
          actions: useCurrentLayoutActions(),
          value,
        };
      },
      {
        initialProps: {
          selector: (layoutState: LayoutState) =>
            layoutState.selectedLayout?.data?.configById["foo"],
        },
        wrapper({ children }) {
          return (
            <MockCurrentLayoutProvider
              initialState={{
                configById: {
                  foo: { value: 42 },
                  bar: { otherValue: 0 },
                },
              }}
            >
              <ChangeState />
              {children}
            </MockCurrentLayoutProvider>
          );
        },
      },
    );

    // 初期値(42)と更新後の値(43)の両方が記録されることを確認
    expect(all).toEqual([{ value: 42 }, { value: 43 }]);
  });
});
