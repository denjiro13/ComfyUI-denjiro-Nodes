# ComfyUI-denjiro-Nodes

[English](#english) | [日本語](#日本語)

![RerouteBox](docs/images/reroutebox.png)

---

## English

Utility nodes for ComfyUI. Every node in this pack has 🔰 at the start of its name.

### 🔰 RerouteBox

A box of reroutes. Each input passes straight through to the output on the same row.

**What it's for**: RerouteBox gathers any links you choose into one place, so you rewire less while building a workflow. Connect upstream nodes to the box and downstream nodes to the box's outputs. When you swap an upstream node, you only reconnect the box's input, and everything after it stays as it is.

- **Grows as you connect**: connecting the last input adds a new empty row. Rows with nothing connected are removed.
- **Follows the type**: each row takes the type of the link connected to its input (IMAGE, MODEL, ...).
- **Double-click to rename**: double-click a row's name or slot to rename it. Clear the name to show the type again. The output always shows the same name as its input. With Nodes 2.0, rename on the input side.
- **No runtime cost**: like the core Reroute, it exists only in the editor and is removed when the workflow runs.

Search for "RerouteBox", or find it under `utils`.

### Installation

Clone this repository into `ComfyUI/custom_nodes` and restart ComfyUI.

```
cd ComfyUI/custom_nodes
git clone https://github.com/denjiro13/ComfyUI-denjiro-Nodes
```

### License

MIT

---

## 日本語

ComfyUI用の便利ノード集です。このパックのノードには、名前の先頭に🔰が付いています。

### 🔰 RerouteBox

Rerouteをまとめた箱です。各入力は、同じ行の出力にそのまま通ります。

**ねらい**：任意のリンクを1か所にまとめて、ワークフローを作っている間のつなぎ直しを減らすためのものです。前のノードは箱の入力に、後ろのノードは箱の出力につなぎます。前のノードを差し替えるときは箱の入力だけをつなぎ直せばよく、その先はそのまま使えます。

- **つなぐと増える**：いちばん下の入力につなぐと、新しい空の行が増えます。何もつながっていない行は自動で消えます。
- **型に合わせる**：各行は、入力につないだ型（IMAGE、MODELなど）に合わせて変わります。
- **ダブルクリックで名前変更**：行の名前や口をダブルクリックすると、名前を変えられます。空欄にすると型名の表示に戻ります。出力側には、常に入力側と同じ名前が表示されます。Nodes 2.0では、入力側で名前を変えてください。
- **実行時の負担なし**：標準のRerouteと同じく画面上だけのノードで、実行時には取り除かれます。

「RerouteBox」で検索するか、`utils` カテゴリから追加できます。

### インストール

このリポジトリを `ComfyUI/custom_nodes` に clone して、ComfyUIを再起動してください。

```
cd ComfyUI/custom_nodes
git clone https://github.com/denjiro13/ComfyUI-denjiro-Nodes
```

### ライセンス

MIT
