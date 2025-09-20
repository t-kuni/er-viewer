## 1. ツール選定

### バックエンド

* **開発**: `tsx`

  * ES Modules ネイティブ、起動が速い、`--watch` で自動再実行とクリアスクリーンが可能([tsx][1])
* **本番ビルド**: `tsup`

  * esbuild ベースで ESM/CJS などを zero-config で一括出力。`dist/` にまとまるのでデプロイが簡潔([GitHub][2])

### フロントエンド

* 既存の **Vite** を継続。

### 統一性

* いずれも esbuild 系ツールで学習コストと依存を共通化。
* さらに統合したい場合は **vite-plugin-node** を追加し、Vite が Node サーバも HMR 管理（Express/Fastify 等に対応）([GitHub][3])

---

## 2. ホットリロード

| 対象     | 方法                                                                                              | 追加設定                                                               |
| ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| バックエンド | `npx tsx watch --clear-screen=false server.ts`                                                  | 再起動だけで OK                                                          |
| フロント   | `vite` (既存)                                                                                     | Docker 内では `server.watch.usePolling=true` を有効([Stack Overflow][4]) |
| Docker | Compose v2.22+ の `develop.watch` で `sync+restart` を設定するとボリューム不要で自動反映([Docker Documentation][5]) |                                                                    |

---

## 3. 設定最適化

### tsconfig

```
tsconfig.base.json      # 共通
 └─ tsconfig.server.json # extends "./tsconfig.base.json"
 └─ tsconfig.client.json # extends "./tsconfig.base.json"
```

* 共通で `paths`, `strict`, `skipLibCheck` 等を定義。
* `noEmit` は開発時のみ `true`（tsx が直接実行するため）。

### package.json（ルート）

```jsonc
"scripts": {
  "dev": "concurrently \"tsx watch --clear-screen=false server.ts\" \"npm run --prefix public dev\"",
  "build": "tsup server.ts --format esm,cjs && npm run --prefix public build",
  "start": "node dist/server.js",
  "typecheck": "tsc -p tsconfig.server.json --noEmit && tsc -p public/tsconfig.json --noEmit"
},
"devDependencies": {
  "tsx": "^4",
  "tsup": "^8",
  "concurrently": "^8"
}
```

> `ts-node`,`nodemon`,`ts-node-dev` は削除。

---

## 4. 実装手順

1. **依存追加**

   ```bash
   npm i -D tsx tsup concurrently      # 必須
   npm i -D vite-plugin-node           # 統合する場合のみ
   ```
2. **不要パッケージ削除**

   ```bash
   npm rm ts-node ts-node-dev nodemon
   ```
3. **tsconfig** を整理し、`paths` で `@/*` を共通化。
4. **Vite 設定（public/vite.config.ts）**

   ```ts
   export default defineConfig({
     server: { watch: { usePolling: true }, host: '0.0.0.0', port: 5173 }
   });
   ```
5. **Docker Compose**

   ```yaml
   services:
     app:
       develop:
         watch:
           - action: sync+restart
             path: .
             target: /app
             ignore:
               - node_modules
   ```
6. **vite-plugin-node** を使う場合はプロジェクト直下に `vite.config.ts` を置き、`VitePluginNode({adapter:'express', appPath:'./server.ts'})` を設定。

これで **保存 ⇒ 即反映** がフロント・バックとも Docker 内で機能し、ビルドも esbuild 系で一本化できます。

[1]: https://tsx.is/?utm_source=chatgpt.com "TypeScript Execute (tsx) | tsx"
[2]: https://github.com/egoist/tsup "GitHub - egoist/tsup: The simplest and fastest way to bundle your TypeScript libraries."
[3]: https://github.com/axe-me/vite-plugin-node "GitHub - axe-me/vite-plugin-node: Vite plugin to run your node dev server with HMR!"
[4]: https://stackoverflow.com/questions/77815669/how-to-make-hot-reload-works-with-dockerized-vue3-and-vite "docker - How to make Hot reload works with dockerized vue3 and vite - Stack Overflow"
[5]: https://docs.docker.com/compose/how-tos/file-watch/?utm_source=chatgpt.com "Use Compose Watch"
