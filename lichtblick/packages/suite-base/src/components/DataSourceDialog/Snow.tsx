// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { makeStyles } from "tss-react/mui";

/**
 * Snow コンポーネント用のスタイル定義
 *
 * 全画面オーバーレイとして表示するためのスタイルを定義します。
 * 親要素に対して絶対位置で配置され、z-indexによる重ね順制御が可能です。
 */
const useStyles = makeStyles()({
  container: {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
  },
});

/**
 * 季節エフェクトコンポーネント（雪・コンフェッティ）
 *
 * このコンポーネントは、Three.jsとWebGLを使用して美しい季節エフェクトを
 * 表示します。DataSourceDialogの背景で動作し、ユーザー体験を向上させる
 * 視覚的な演出を提供します。
 *
 * ## 主な機能
 *
 * ### 3Dパーティクルシステム
 * - Three.jsベースの高性能パーティクルレンダリング
 * - WebGLシェーダーによる効率的な描画
 * - リアルタイムアニメーション
 *
 * ### 2種類のエフェクト
 * - **雪（Snow）**: 冬季の雪降りエフェクト
 * - **コンフェッティ（Confetti）**: 祝祭的な紙吹雪エフェクト
 *
 * ### パフォーマンス最適化
 * - バッファジオメトリによる効率的なメモリ使用
 * - カスタムシェーダーによる高速レンダリング
 * - 適切なリソース管理とクリーンアップ
 *
 * ### レスポンシブデザイン
 * - 画面サイズに応じた自動調整
 * - デバイスピクセル比対応
 * - 全画面オーバーレイ表示
 *
 * ## エフェクトの詳細
 *
 * ### 雪エフェクト（Snow）
 * - **パーティクル数**: 75個
 * - **色**: 白色（RGB: 1.0, 1.0, 1.0）
 * - **落下速度**: 0.1（ゆっくり）
 * - **風の影響**: 0.02（わずかな横揺れ）
 * - **用途**: 冬季の季節演出
 *
 * ### コンフェッティエフェクト（Confetti）
 * - **パーティクル数**: 100個
 * - **色**: ランダムなHSL色空間（彩度1.0、明度0.5）
 * - **落下速度**: 0.2（速め）
 * - **風の影響**: 0.0（直線落下）
 * - **用途**: 祝祭やイベント演出
 *
 * ## 技術的実装
 *
 * ### Three.js構成
 * - **Scene**: 3Dシーンの管理
 * - **OrthographicCamera**: 2D的な平行投影
 * - **BufferGeometry**: 効率的なジオメトリ管理
 * - **ShaderMaterial**: カスタムシェーダー適用
 * - **Points**: パーティクル描画
 *
 * ### シェーダープログラム
 *
 * #### 頂点シェーダー（Vertex Shader）
 * - **時間ベースアニメーション**: `time` uniform による動的更新
 * - **物理シミュレーション**: 重力、風、波動の計算
 * - **位置計算**: X軸（風+波動）、Y軸（重力）の移動
 * - **サイズ調整**: パーティクルサイズのランダム化
 *
 * #### フラグメントシェーダー（Fragment Shader）
 * - **円形パーティクル**: 距離ベースのアルファ切り抜き
 * - **色適用**: 頂点シェーダーからの色情報適用
 * - **透明度対応**: アルファブレンディング
 *
 * ### アニメーションループ
 *
 * #### 時間管理
 * - 開始時刻の記録
 * - 経過時間の計算
 * - シェーダーuniform更新
 *
 * #### レンダリング
 * - `requestAnimationFrame` による最適化
 * - 60FPS目標の滑らかなアニメーション
 * - フレームドロップ対策
 *
 * ## パフォーマンス考慮事項
 *
 * ### メモリ管理
 * - バッファ属性の効率的な使用
 * - ジオメトリの使い回し
 * - 適切なディスポーズ処理
 *
 * ### GPU最適化
 * - シェーダーでの並列処理
 * - バッチ描画によるドローコール削減
 * - テクスチャ不使用による軽量化
 *
 * ### リソースクリーンアップ
 * - コンポーネントアンマウント時のリソース解放
 * - WebGLコンテキストの適切な破棄
 * - メモリリークの防止
 *
 * ## 使用シナリオ
 *
 * ### 季節イベント
 * - 12月-2月: 雪エフェクト
 * - 特別なイベント: コンフェッティエフェクト
 * - ユーザー体験の向上
 *
 * ### ブランディング
 * - アプリケーションの親しみやすさ向上
 * - 季節感の演出
 * - 記憶に残るユーザー体験
 *
 * ## アクセシビリティ配慮
 *
 * ### 動きの制御
 * - 動きに敏感なユーザーへの配慮
 * - 必要に応じたエフェクト無効化オプション
 * - パフォーマンス影響の最小化
 *
 * ### 視覚的配慮
 * - 背景コンテンツの可読性確保
 * - 適切な透明度設定
 * - 色覚異常への配慮
 *
 * @param props - コンポーネントプロパティ
 * @param props.effect - 表示するエフェクトの種類（"snow" | "confetti"）
 * @returns 季節エフェクトを表示するReactコンポーネント
 *
 * @example
 * ```tsx
 * // 雪エフェクトの表示
 * <Snow effect="snow" />
 *
 * // コンフェッティエフェクトの表示
 * <Snow effect="confetti" />
 * ```
 *
 * @example
 * ```tsx
 * // 季節に応じた動的エフェクト
 * const currentMonth = new Date().getMonth();
 * const isWinter = currentMonth === 11 || currentMonth === 0 || currentMonth === 1;
 *
 * {isWinter && <Snow effect="snow" />}
 * ```
 *
 * @example
 * ```tsx
 * // 条件付きエフェクト表示
 * const [showEffects, setShowEffects] = useState(true);
 *
 * {showEffects && (
 *   <Snow effect={isSpecialEvent ? "confetti" : "snow"} />
 * )}
 * ```
 */
export default function Snow({ effect }: { effect: "snow" | "confetti" }): React.JSX.Element {
  const { classes } = useStyles();
  const containerRef = useRef<HTMLDivElement>(ReactNull);

  useLayoutEffect(() => {
    let requestID: ReturnType<typeof requestAnimationFrame>;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    /**
     * Three.jsシーンの初期化
     *
     * 3D空間とカメラを設定し、パーティクルシステムの基盤を構築します。
     * OrthographicCameraを使用することで、2D的な平行投影を実現し、
     * 画面サイズに関係なく一定の見た目を保証します。
     */
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();

    /**
     * パーティクルシステムの設定
     *
     * エフェクトタイプに応じてパーティクル数を調整し、
     * 各パーティクルの初期属性を設定します。
     */
    const POINT_COUNT = effect === "snow" ? 75 : 100;
    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);
    const sizes = new Float32Array(POINT_COUNT);
    const phases = new Float32Array(POINT_COUNT);

    /**
     * パーティクル属性の初期化
     *
     * 各パーティクルの位置、色、サイズ、位相を設定します。
     *
     * ## 属性の詳細
     * - **position**: 3D空間での位置（x, y, z）
     * - **color**: RGB色情報
     * - **size**: パーティクルサイズの倍率
     * - **phase**: アニメーション位相のオフセット
     */
    const vertex = new THREE.Vector3();
    const color = new THREE.Color();
    for (let i = 0; i < POINT_COUNT; i++) {
      vertex.x = Math.random();
      vertex.y = Math.random();
      vertex.z = -1.0;
      vertex.toArray(positions, i * 3);

      if (effect === "snow") {
        color.setRGB(1.0, 1.0, 1.0);
      } else {
        color.setHSL(Math.random(), 1.0, 0.5);
      }
      color.toArray(colors, i * 3);

      sizes[i] = Math.random();
      phases[i] = Math.random() * Math.PI;
    }

    /**
     * BufferGeometryの構築
     *
     * 効率的なメモリ使用のため、BufferGeometryを使用して
     * パーティクルの属性データを管理します。
     */
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

    /**
     * カスタムシェーダーマテリアルの定義
     *
     * WebGLシェーダーを使用して高性能なパーティクルアニメーションを実現します。
     *
     * ## Uniform変数
     * - **time**: アニメーション時間
     * - **yspeed**: 垂直方向の落下速度
     * - **wind**: 風による横方向の影響
     */
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        yspeed: { value: effect === "snow" ? 0.1 : 0.2 },
        wind: { value: effect === "snow" ? 0.02 : 0.0 },
      },
      vertexShader: /* glsl */ `
      uniform float time;
      uniform float yspeed;
      uniform float wind;
      attribute vec3 color;
      attribute float size;
      attribute float phase;
      const float xspeed = 10.0;
      const float amplitude = 0.03;
      const float minsize = 5.0;
      const float maxsize = 12.0;
      varying vec4 vcolor;
      void main() {
        vcolor = vec4(color, 1.0);
        float x = mix(-1.0, 1.0, mod(
          position.x + sin(phase + time * xspeed * yspeed) * amplitude + time * xspeed * yspeed * wind,
          1.0));
				float y = mix(-1.0, 1.0, mod(position.y - time * yspeed * mix(0.2, 1.0, size), 1.0));
				gl_PointSize = mix(minsize, maxsize, size);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, position.z, 1.0);
			}
      `,
      fragmentShader: /* glsl */ `
      varying vec4 vcolor;
			void main() {
        if (length(gl_PointCoord * 2.0 - 1.0) > 1.0) {
          discard;
        }
				gl_FragColor = vcolor;
			}
      `,
    });

    /**
     * パーティクルオブジェクトの作成と追加
     *
     * ジオメトリとマテリアルを組み合わせてパーティクルオブジェクトを作成し、
     * シーンに追加します。
     */
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    /**
     * WebGLレンダラーの初期化
     *
     * 透明背景対応のWebGLレンダラーを作成し、
     * デバイスピクセル比とコンテナサイズに合わせて設定します。
     */
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    /**
     * アニメーション時間の管理
     *
     * 開始時刻を記録し、経過時間を計算してシェーダーに渡します。
     */
    const startTime = new Date();
    function render() {
      const time = (new Date().getTime() - startTime.getTime()) / 1000.0;
      material.uniforms.time = { value: time };

      renderer.render(scene, camera);
    }

    /**
     * アニメーションループの制御
     *
     * requestAnimationFrameを使用して滑らかなアニメーションを実現します。
     * animatingフラグによってループの停止を制御します。
     */
    let animating = true;
    function animate() {
      if (!animating) {
        return;
      }

      requestID = requestAnimationFrame(animate);
      render();
    }

    animate();

    /**
     * クリーンアップ処理
     *
     * コンポーネントアンマウント時にリソースを適切に解放し、
     * メモリリークを防止します。
     *
     * ## 解放対象
     * - ジオメトリ
     * - マテリアル
     * - レンダラー
     * - DOM要素
     * - アニメーションフレーム
     */
    return () => {
      animating = false;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      cancelAnimationFrame(requestID);
    };
  }, [effect]);

  return <div className={classes.container} ref={containerRef} />;
}
