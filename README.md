# growi-plugin-section-include

別の GROWI ページから、指定した Markdown 見出しの本文だけを参照表示するスクリプトプラグインです。

## 対象

- GROWI 7.2 以降
- GROWI 7.5.6 での利用を想定

## 使い方

```markdown
::section[/行政書士/行政法/練習問題/地方自治法/地方自治法4 法定受託事務・自治事務/地方自治法4-1 法定受託事務・自治事務]{heading="気づき・全体メモ"}
```

`heading` を省略すると `気づき・全体メモ` を使います。

```markdown
::section[/参照先ページ]
```

元の見出しも含める場合：

```markdown
::section[/参照先ページ]{heading="気づき・全体メモ" includeHeading="true"}
```

見出し先頭の絵文字は比較時に無視するため、参照先が次の表記でも一致します。

```markdown
## 📚 気づき・全体メモ
```

抽出範囲は、対象見出しの次の行から、次に現れる同レベル以上の見出しの直前までです。

## ビルド

```bash
./build-with-docker.sh
```

ビルド後の `dist` を含めて GitHub に push してください。

## インストール

GROWI の管理画面 → プラグインで、GitHub リポジトリ URL を指定してインストールし、ON にします。

## 現時点の制限

- 参照先セクション内の基本 Markdown、表、チェックボックス、`details` は表示できます。
- 参照先セクション内で別の GROWI プラグイン構文を再実行することはできません。
- 参照権限は、表示しているユーザーの GROWI セッションに従います。

## Browser-only publishing

1. Create a public GitHub repository named `growi-plugin-section-include`.
2. Extract this ZIP on Windows.
3. Upload the **contents inside** the extracted `growi-plugin-section-include` folder to the repository root.
4. Commit to the `main` branch.
5. Wait for the GitHub Actions workflow named **Build plugin** to finish successfully.
6. Install the GitHub repository URL from GROWI's plugin administration page.
