## 1. データモデルの拡張（TypeSpec）

### Rectangle の拡張案（最小変更）

* `strokeWidth`: 枠線幅（px）
* `opacity`: 透明度（0〜1、矩形全体に適用）

```typescript
model Rectangle {
  id: string; // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;

  fill: string;   // 例: "#E3F2FD"
  stroke: string; // 例: "#90CAF9"

  strokeWidth: float64; // px
  opacity: float64;     // 0..1

  // 将来のレイヤー制御を入れるなら
  // zIndex?: int32;
}

model LayoutData {
  entities: Record<EntityLayoutItem>;
  rectangles: Record<Rectangle>;
  texts: Record<Text>;
}
```

### ERDiagramViewModel への統合

MVP優先なら「エンティティと別のコレクション」で追加が最短です。

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>; // まずは Rectangle をそのまま持つ
  ui: ERDiagramUIState;
  loading: boolean;
}
```

統一的に扱いたい場合は、将来 `DiagramItem`（entity/rectangle/text の discriminated union）に寄せるのが素直ですが、MVPの差分は増えます（後回し推奨）。

---

## 2. カラーピッカーの実装

### 推奨ライブラリ

**react-colorful**

* 軽量・依存なし（“2.8KB gzipped / No dependencies”） ([GitHub][1])
* `HexColorPicker` だけでなく、**アルファ対応の Picker**（例: `HexAlphaColorPicker`, `RgbaStringColorPicker` など）も提供 ([GitHub][1])
* 入力欄コンポーネント `HexColorInput` もあり、`#rrggbbaa` を許可する `alpha` オプションもある ([GitHub][1])

代替：

* **@uiw/react-color**：Sketch/Chrome等の見た目、`Alpha`/`Hue` 等の部品も揃う ([GitHub][2])
  （見た目のリッチさ重視ならこちら、MVPなら react-colorful の方が最短）

### プリセット（淡め8色）例

```ts
export const PALE_PRESETS = [
  { id: "blue",   hex: "#E3F2FD" },
  { id: "cyan",   hex: "#E0F7FA" },
  { id: "teal",   hex: "#E0F2F1" },
  { id: "green",  hex: "#E8F5E9" },
  { id: "yellow", hex: "#FFFDE7" },
  { id: "orange", hex: "#FFF3E0" },
  { id: "pink",   hex: "#FCE4EC" },
  { id: "gray",   hex: "#F5F5F5" },
] as const;
```

### 色の保存形式（推奨）

* `fill`/`stroke`: **HEX（`#RRGGBB`）**
* `opacity`: **0〜1（number）**

理由：DB保存は単純、プリセットもそのまま、React Flow側は `style.opacity` に直結。
（将来「塗りだけ透明・枠は不透明」などが必要になったら `fillOpacity`/`strokeOpacity` に分割）

### 再利用可能な ColorPicker コンポーネント例

* プリセット + Picker + 入力欄を一体化
* `value/onChange` だけにして、矩形以外でも使い回す

```tsx
import React, { useMemo, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

type Preset = { id: string; hex: string };

export function ColorField(props: {
  label: string;
  value: string;              // "#RRGGBB"
  onChange: (hex: string) => void;
  presets?: Preset[];
}) {
  const { label, value, onChange, presets = [] } = props;

  const normalized = useMemo(() => {
    // HexColorInput が "#" なしも取り得るので保険
    const v = value.startsWith("#") ? value : `#${value}`;
    return v.slice(0, 7);
  }, [value]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>

      {presets.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.hex)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: "1px solid rgba(0,0,0,0.15)",
                background: p.hex,
                cursor: "pointer",
              }}
              aria-label={`preset-${p.id}`}
            />
          ))}
        </div>
      )}

      <HexColorPicker color={normalized} onChange={onChange} />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.15)",
            background: normalized,
          }}
        />
        <HexColorInput
          color={normalized}
          onChange={(v) => onChange(v.startsWith("#") ? v : `#${v}`)}
          prefixed
          style={{
            width: 110,
            padding: "6px 8px",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}
```

---

## 3. React Flow での矩形ノード実装

### ノードとして実装する方針

既存のマッピング（Rectangle → React Flow nodes）に合わせて **Custom Node（rectangleNode）** として実装。

* サイズ：React Flow v12 は `node.width/node.height` が「寸法指定（inline style）」として機能する ([React Flow][3])
* リサイズ：`<NodeResizer />` をノード内に置く（`onResizeStart/onResize/onResizeEnd` が使える） ([React Flow][4])

### RectangleNode コンポーネント例（NodeResizer込み）

```tsx
import React, { memo, useCallback } from "react";
import type { NodeProps, ResizeParams } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";

export type RectangleNodeData = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;

  // 外へ通知（Store連携用）
  onResizeEnd?: (id: string, params: ResizeParams) => void;
};

function RectangleNodeImpl(props: NodeProps<RectangleNodeData>) {
  const { id, data, selected } = props;

  const handleResizeEnd = useCallback(
    (_evt: unknown, params: ResizeParams) => {
      data.onResizeEnd?.(id, params);
    },
    [data, id]
  );

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={40}
        onResizeEnd={handleResizeEnd}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          background: data.fill,
          border: `${data.strokeWidth}px solid ${data.stroke}`,
          opacity: data.opacity,
          borderRadius: 2,
        }}
      />
    </>
  );
}

export const RectangleNode = memo(RectangleNodeImpl);
```

`ResizeParams` は `x/y/width/height` を持つので、**左上からのリサイズ**でも位置更新を同時に確定できます。 ([React Flow][5])

---

## 4. ドラッグ移動・リサイズ確定の状態反映

### ドラッグ移動

React Flow 標準ドラッグを使い、確定は `onNodeDragStop` でストア反映でOK。

### リサイズ

`NodeResizer` の `onResizeEnd` で `x,y,width,height` を受け取り、矩形の bounds を一括更新。

（`NodeResizer` に `onResizeStart/onResize/onResizeEnd` がある） ([React Flow][4])

---

## 5. Action 設計（純粋関数）

### Rectangle 操作用 Action 例

```ts
import type { ERDiagramViewModel } from "../types";

type RectangleStylePatch = Partial<{
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}>;

export function actionAddRectangle(vm: ERDiagramViewModel, rect: ERDiagramViewModel["rectangles"][string]) {
  if (vm.rectangles[rect.id]) return vm;
  return { ...vm, rectangles: { ...vm.rectangles, [rect.id]: rect } };
}

export function actionRemoveRectangle(vm: ERDiagramViewModel, rectangleId: string) {
  if (!vm.rectangles[rectangleId]) return vm;
  const { [rectangleId]: _, ...rest } = vm.rectangles;
  return { ...vm, rectangles: rest };
}

export function actionUpdateRectanglePosition(vm: ERDiagramViewModel, rectangleId: string, x: number, y: number) {
  const r = vm.rectangles[rectangleId];
  if (!r) return vm;
  if (r.x === x && r.y === y) return vm;
  return { ...vm, rectangles: { ...vm.rectangles, [rectangleId]: { ...r, x, y } } };
}

export function actionUpdateRectangleSize(vm: ERDiagramViewModel, rectangleId: string, width: number, height: number) {
  const r = vm.rectangles[rectangleId];
  if (!r) return vm;
  if (r.width === width && r.height === height) return vm;
  return { ...vm, rectangles: { ...vm.rectangles, [rectangleId]: { ...r, width, height } } };
}

export function actionUpdateRectangleBounds(
  vm: ERDiagramViewModel,
  rectangleId: string,
  patch: { x: number; y: number; width: number; height: number }
) {
  const r = vm.rectangles[rectangleId];
  if (!r) return vm;
  if (r.x === patch.x && r.y === patch.y && r.width === patch.width && r.height === patch.height) return vm;
  return { ...vm, rectangles: { ...vm.rectangles, [rectangleId]: { ...r, ...patch } } };
}

export function actionUpdateRectangleStyle(vm: ERDiagramViewModel, rectangleId: string, stylePatch: RectangleStylePatch) {
  const r = vm.rectangles[rectangleId];
  if (!r) return vm;

  const next = { ...r, ...stylePatch };
  const same =
    next.fill === r.fill &&
    next.stroke === r.stroke &&
    next.strokeWidth === r.strokeWidth &&
    next.opacity === r.opacity;

  if (same) return vm;
  return { ...vm, rectangles: { ...vm.rectangles, [rectangleId]: next } };
}
```

---

## 6. React Flow 統合（ノード生成・イベント）

### ViewModel → React Flow nodes 変換例（矩形）

```ts
import type { Node, ResizeParams } from "@xyflow/react";
import type { ERDiagramViewModel } from "../types";
import { actionUpdateRectangleBounds } from "../actions/rectangleActions";

export function buildRectangleNodes(
  vm: ERDiagramViewModel,
  dispatch: (fn: (vm: ERDiagramViewModel) => ERDiagramViewModel) => void
): Node[] {
  return Object.values(vm.rectangles).map((r) => ({
    id: r.id,
    type: "rectangleNode",
    position: { x: r.x, y: r.y },
    width: r.width,   // v12では width/height が寸法指定として扱われる :contentReference[oaicite:8]{index=8}
    height: r.height,
    zIndex: 0,
    data: {
      fill: r.fill,
      stroke: r.stroke,
      strokeWidth: r.strokeWidth,
      opacity: r.opacity,
      onResizeEnd: (id: string, p: ResizeParams) => {
        dispatch((cur) => actionUpdateRectangleBounds(cur, id, p));
      },
    },
  }));
}
```

---

## 7. UI/UX

### 矩形の作成方法

* MVPで実装しやすい：**ツールバーの「矩形追加」ボタン**（固定サイズで viewport 中央に追加）
* キャンバス上ドラッグ生成は、ポインタ捕捉・パン/ズームとの競合処理が増えるので後回し推奨

### プロパティ編集UI

* 「選択中ノードの種別」で右サイドにプロパティパネル切替（entity / rectangle / text）
* 矩形向け：Fill（ColorField + presets）、Stroke（ColorField + presets）、Opacity（slider）、StrokeWidth（number）

#### 矩形プロパティパネル例

```tsx
import React, { useMemo } from "react";
import { ColorField } from "./ColorField";
import { PALE_PRESETS } from "./presets";

export function RectanglePropertiesPanel(props: {
  rectId: string;
  rect: { fill: string; stroke: string; opacity: number; strokeWidth: number };
  onChange: (patch: Partial<{ fill: string; stroke: string; opacity: number; strokeWidth: number }>) => void;
}) {
  const { rect, onChange } = props;

  return (
    <div style={{ display: "grid", gap: 14, padding: 12 }}>
      <ColorField
        label="背景色"
        value={rect.fill}
        presets={PALE_PRESETS}
        onChange={(fill) => onChange({ fill })}
      />
      <ColorField
        label="ボーダー色"
        value={rect.stroke}
        presets={PALE_PRESETS}
        onChange={(stroke) => onChange({ stroke })}
      />

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>透明度</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={rect.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
        />
        <div style={{ fontSize: 12 }}>{rect.opacity.toFixed(2)}</div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>ボーダー幅</div>
        <input
          type="number"
          min={0}
          step={1}
          value={rect.strokeWidth}
          onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
          style={{ width: 120 }}
        />
      </div>
    </div>
  );
}
```

---

## 8. 状態の永続化（LayoutData / saveLayout）

* `LayoutData.rectangles` が既にあるので、**saveLayout に rectangles を含めて送る**だけで流れは作れる
* 追加した `strokeWidth/opacity` は TypeSpec とバックエンドの保存DTOに反映（後方互換不要なので単純追加でOK）

---

## 9. z-index 制御とレイヤー

### 背景に回す（エンティティより後ろ）

* React Flow の Node には `zIndex` があり、Custom Node の props 側にも `zIndex` が渡る ([React Flow][6])
* さらに React Flow 側で **自動z-index制御モード**があり、`manual` なら自動適用しない ([React Flow][7])

MVP推奨：

* `zIndexMode="manual"` にして、矩形 `zIndex=0`、エンティティ `zIndex=100` に固定
* もしくは `elevateNodesOnSelect={false}` で「選択時に前面へ上がる」挙動を止める ([React Flow][8])
  （背景矩形が選択で前に出て邪魔、を避けやすい）

複数矩形の重なり順は MVPでは「作成順固定」で十分。必要になったら Rectangle に `zIndex`（または `layer`）を足して Action で入れ替え。

---

## 10. 段階的アプローチ（MVP順）

1. TypeSpec: Rectangle に `strokeWidth/opacity` 追加、ViewModel に `rectangles` 追加
2. `rectangleNode` を表示（固定サイズ・固定色でも可）
3. ツールバー「矩形追加」→ `actionAddRectangle`
4. ドラッグ移動：`onNodeDragStop` で `actionUpdateRectanglePosition`
5. リサイズ：`NodeResizer` 導入、`onResizeEnd` → `actionUpdateRectangleBounds`（`x/y/width/height`） ([React Flow][4])
6. プロパティパネル：Fill/Stroke/Opacity/StrokeWidth
7. プリセット8色 + ColorField の共通化
8. z-index 固定（`zIndexMode="manual"` or `elevateNodesOnSelect={false}`） ([React Flow][7])

---

## React Flow 側の注意点（今回の範囲に直結するものだけ）

* v12では `node.width/node.height` の扱いが変わり、寸法指定として使える ([React Flow][3])
* イベントハンドラは `useCallback` 等で安定させないと再レンダリングループの原因になり得る（ReactFlow docs の Warning） ([React Flow][8])

[1]: https://github.com/omgovich/react-colorful "GitHub - omgovich/react-colorful:  A tiny (2,8 KB) color picker component for React and Preact apps"
[2]: https://github.com/uiwjs/react-color "GitHub - uiwjs/react-color:  Is a tiny color picker widget component for React apps."
[3]: https://reactflow.dev/learn/troubleshooting/migrate-to-v12?utm_source=chatgpt.com "Migrate to React Flow 12"
[4]: https://reactflow.dev/api-reference/components/node-resizer "The NodeResizer component - React Flow"
[5]: https://reactflow.dev/api-reference/types/resize-params?utm_source=chatgpt.com "ResizeParams"
[6]: https://reactflow.dev/api-reference/types/node-props?utm_source=chatgpt.com "NodeProps"
[7]: https://reactflow.dev/api-reference/types/z-index-mode?utm_source=chatgpt.com "ZIndexMode"
[8]: https://reactflow.dev/api-reference/react-flow?utm_source=chatgpt.com "The ReactFlow component"
