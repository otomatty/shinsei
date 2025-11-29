// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview Foxglove 特有のメッセージ型定義
 *
 * このファイルは、Foxglove（現Lichtblick）プラットフォーム固有の
 * メッセージ型定義を提供します。標準的なROSメッセージに加えて、
 * Foxgloveが独自に定義した拡張メッセージ型を含みます。
 */

/**
 * Foxglove 固有のメッセージ型のマッピング
 *
 * @description Foxgloveプラットフォームで使用される独自メッセージ型の定義です。
 * 標準的なROSメッセージでは表現できない、より高度な可視化機能や
 * 地理情報システム（GIS）との連携を可能にします。
 *
 * @example
 * ```typescript
 * // GeoJSONメッセージの使用例
 * const geoJsonMessage: FoxgloveMessages["foxglove.GeoJSON"] = {
 *   geojson: JSON.stringify({
 *     type: "FeatureCollection",
 *     features: [
 *       {
 *         type: "Feature",
 *         geometry: {
 *           type: "Point",
 *           coordinates: [139.6917, 35.6895]  // 東京の座標
 *         },
 *         properties: {
 *           name: "東京駅"
 *         }
 *       }
 *     ]
 *   })
 * };
 *
 * // Poseメッセージの使用例
 * const poseMessage: FoxgloveMessages["foxglove.Pose"] = {
 *   position: { x: 1.0, y: 2.0, z: 0.5 },
 *   orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }  // 回転なし
 * };
 * ```
 */
export type FoxgloveMessages = {
  /**
   * GeoJSON データメッセージ
   *
   * @description 地理情報システム（GIS）データを表現するためのメッセージ型です。
   * GeoJSON形式の文字列を含み、地図上での位置情報、境界線、領域などを
   * 表現できます。
   *
   * 主な用途:
   * - 地図上でのロボットの動作範囲表示
   * - 地理的な境界線や禁止区域の可視化
   * - GPS軌跡データの表示
   * - 建物や道路などの地理的特徴の表現
   */
  "foxglove.GeoJSON": {
    /** GeoJSON形式の地理情報データ（JSON文字列） */
    geojson: string;
  };

  /**
   * 3D位置と姿勢メッセージ
   *
   * @description 3D空間での位置と向きを表現するメッセージ型です。
   * 標準的なgeometry_msgs/Poseと同等ですが、Foxglove固有の
   * 処理や可視化機能で使用されます。
   *
   * 主な用途:
   * - ロボットの位置と姿勢の表現
   * - 目標位置の指定
   * - オブジェクトの配置情報
   * - カメラやセンサーの位置・向き
   */
  "foxglove.Pose": {
    /** 3D位置座標 */
    position: {
      /** X座標 (メートル) */
      x: number;
      /** Y座標 (メートル) */
      y: number;
      /** Z座標 (メートル) */
      z: number;
    };
    /** 3D回転（クォータニオン） */
    orientation: {
      /** X成分（i成分） */
      x: number;
      /** Y成分（j成分） */
      y: number;
      /** Z成分（k成分） */
      z: number;
      /** W成分（実数成分） */
      w: number;
    };
  };
};
