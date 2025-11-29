// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

/**
 * @fileoverview Autocompleteコンポーネントのストーリーブック
 *
 * @description Autocompleteコンポーネントの様々な使用例とテストケースを提供する。
 * 以下のシナリオをカバー：
 *
 * - 基本的なフィルタリング機能
 * - エラー状態の表示
 * - 大量アイテムでのパフォーマンステスト
 * - 長いパスの表示テスト
 * - ライト/ダークテーマでの表示確認
 * - ソート機能のオン/オフ
 */

import { Meta, StoryFn, StoryObj } from "@storybook/react";
import { fireEvent, within } from "@storybook/testing-library";
import * as _ from "lodash-es";

import Stack from "@lichtblick/suite-base/components/Stack";

import { Autocomplete } from "./Autocomplete";

/**
 * Storybookのメタデータ設定
 */
export default {
  title: "components/Autocomplete",
  component: Autocomplete,
  parameters: { colorScheme: "dark" },
  args: {
    onSelect: () => {},
  },
  decorators: [
    (Story: StoryFn): React.JSX.Element => (
      <Stack padding={2.5}>
        <Story />
      </Stack>
    ),
  ],
} satisfies Meta<typeof Autocomplete>;

type Story = StoryObj<typeof Autocomplete>;

/**
 * 入力フィールドをクリックしてオートコンプリートを開く共通アクション
 */
const clickInput: Story["play"] = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  const input = await canvas.findByTestId("autocomplete-textfield");

  fireEvent.click(input);
};

/**
 * 'o'でフィルタリングするストーリー（エラー状態付き）
 */
export const FilteringToO: Story = {
  args: {
    items: ["one", "two", "three"],
    hasError: true,
    filterText: "o",
    value: "o",
  },
  name: "filtering to 'o'",
  play: clickInput,
};

/**
 * 'o'でフィルタリングするストーリー（ライトテーマ）
 */
export const FilteringToOLight: Story = {
  ...FilteringToO,
  name: "filtering to 'o' light",
  parameters: { colorScheme: "light" },
};

/**
 * 制御されていない値のストーリー
 */
export const UncontrolledValue: Story = {
  args: {
    items: ["one", "two", "three"],
    filterText: "h",
    value: "h",
  },
  play: clickInput,
};

/**
 * 制御されていない値のストーリー（ライトテーマ）
 */
export const UncontrolledValueLight: Story = {
  ...UncontrolledValue,
  parameters: { colorScheme: "light" },
};

/**
 * フィルタリング時のソートを無効にしたストーリー
 */
export const SortWhenFilteringFalse: Story = {
  args: {
    items: ["bab", "bb", "a2", "a1"],
    sortWhenFiltering: false,
    value: "b",
    filterText: "b",
  },
  name: "sortWhenFiltering=false",
  play: clickInput,
};

/**
 * 大量アイテムでのパフォーマンステスト
 */
export const ManyItems: Story = {
  args: {
    items: _.range(1, 1000).map((i) => `item_${i}`),
  },
  play: clickInput,
};

/**
 * 長いパスをポップアップで表示するテスト
 */
export const LongPathInPopup: Story = {
  render: (args): React.JSX.Element => (
    <div style={{ width: 200 }}>
      <Autocomplete {...args} />
    </div>
  ),
  args: {
    items: [
      "/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{some_id==1297193}.isSomething",
      "/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{some_id==1297194}.isSomething",
      "/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{some_id==1297195}.isSomething",
    ],
    value: "/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{some_id==1297193}.isSomething",
    filterText: "/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{",
  },
  play: clickInput,
};
