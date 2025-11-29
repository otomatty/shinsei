/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render, screen, fireEvent } from "@testing-library/react";

import SearchBar from "@lichtblick/suite-base/components/SearchBar/SearchBar";
import "@testing-library/jest-dom";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

/**
 * SearchBar コンポーネントのテストスイート
 *
 * @overview
 * SearchBar コンポーネントの動作を検証するテストスイート。
 * React Testing Library を使用して DOM 操作とユーザーインタラクションをテスト。
 *
 * @testScenarios
 * 1. デフォルト props でのレンダリング
 * 2. クリアアイコンの表示/非表示制御
 * 3. onChange ハンドラーの動作確認
 * 4. onClear ハンドラーの動作確認
 *
 * @architecture
 * - Jest testing framework
 * - React Testing Library for DOM testing
 * - BasicBuilder for test data generation
 * - Custom matchers from @testing-library/jest-dom
 *
 * @testDataGeneration
 * BasicBuilder を使用してランダムな文字列を生成し、
 * テストデータの依存関係を排除してテストの独立性を保つ。
 */
describe("SearchBar component", () => {
  // テスト用のモック関数
  const mockOnChange = jest.fn();
  const mockOnClear = jest.fn();

  /**
   * デフォルト props でのレンダリングテスト
   *
   * @testPurpose
   * SearchBar コンポーネントが基本的な props で正常にレンダリングされることを確認。
   * 必須の要素（入力フィールド、検索アイコン）が存在することを検証。
   *
   * @assertions
   * - SearchBar コンポーネントが DOM に存在する
   * - 検索アイコンが表示されている
   */
  it("renders with default props", () => {
    render(<SearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByTestId("SearchBarComponent");
    expect(input).toBeInTheDocument();
    expect(screen.getByTestId("SearchIcon")).toBeInTheDocument();
  });

  /**
   * クリアアイコンの表示制御テスト
   *
   * @testPurpose
   * showClearIcon プロパティによるクリアアイコンの表示/非表示制御と、
   * クリアボタンクリック時の onClear コールバック実行を確認。
   *
   * @assertions
   * - showClearIcon が true の場合、クリアアイコンが表示される
   * - クリアアイコンクリック時に onClear が呼ばれる
   */
  it("renders with clear icon when showClearIcon is true", () => {
    render(
      <SearchBar
        value={BasicBuilder.string()}
        onChange={mockOnChange}
        onClear={mockOnClear}
        showClearIcon
      />,
    );

    const clearIcon = screen.getByTitle("Clear");
    expect(clearIcon).toBeInTheDocument();

    fireEvent.click(clearIcon);
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  /**
   * 入力値変更時のハンドラーテスト
   *
   * @testPurpose
   * 入力フィールドの値変更時に onChange ハンドラーが正しく呼ばれることを確認。
   * ユーザーの入力に対する応答性を検証。
   *
   * @assertions
   * - 入力値変更時に onChange が呼ばれる
   * - 正しいイベントオブジェクトが渡される
   */
  it("calls onChange handler when input value changes", () => {
    render(<SearchBar value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: BasicBuilder.string() } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  /**
   * クリアアイコンの非表示テスト
   *
   * @testPurpose
   * showClearIcon が false の場合、クリアアイコンが表示されないことを確認。
   * 条件付きレンダリングの正常動作を検証。
   *
   * @assertions
   * - showClearIcon が false の場合、クリアアイコンが存在しない
   */
  it("does not render clear icon when showClearIcon is false", () => {
    render(
      <SearchBar value={BasicBuilder.string()} onChange={mockOnChange} showClearIcon={false} />,
    );

    expect(screen.queryByTitle("Clear")).not.toBeInTheDocument();
  });
});
