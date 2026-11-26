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

### 🔰 Cargo Load 🚛 / 🔰 Cargo Unload 🚛

A pipe that carries many links as one. Cargo Load gathers links into a single `cargo` link, and Cargo Unload unpacks them on the other end.

**What it's for**: unlike most pipe nodes, the names travel with the cargo. Rename a row on the Load and every Unload connected to it shows the new name at once.

- **Grows as you connect**: connecting the last input of the Load adds a new row. Each row takes the type of the link connected to it.
- **Unload follows the Load**: the Unload's outputs always match the Load's rows (order, type and name). Reroutes and RerouteBoxes between them are fine.
- **Double-click to rename**: rename rows on the Load. With Nodes 2.0, double-click the input's name.
- **Rows stay while in use**: a row is removed only when both its Load input and its Unload outputs are disconnected. When you swap the node feeding the Load, the links after the Unload stay as they are.
- **No runtime cost**: both nodes exist only in the editor. When the workflow runs, each Unload output is connected straight to what feeds the same row of the Load.

**Hide the cargo link (frontend 1.61 or later)**: click the dot at either end of the `cargo` link and choose the eye icon. Only that link is hidden, like Set/Get nodes. A `CARGO` badge marks both ends, the crosshair icon jumps to the other end, and the hidden state is saved with the workflow.

If an Unload output in use has nothing to carry (no Load connected, or nothing connected to that row), running the workflow shows an error that names the row.

Search for "Cargo", or find them under `utils`.

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

### 🔰 Cargo Load 🚛 / 🔰 Cargo Unload 🚛

たくさんのリンクを1本にまとめて運ぶpipeです。Cargo Loadでリンクを1本の `cargo` にまとめ、Cargo Unloadで元のリンクに戻します。

**ねらい**：よくあるpipeノードと違い、名前も一緒に運びます。Loadで行の名前を変えると、つながっているすべてのUnloadにすぐ反映されます。

- **つなぐと増える**：Loadのいちばん下の入力につなぐと、新しい行が増えます。各行は、つないだ型に合わせて変わります。
- **UnloadはLoadに合わせる**：Unloadの出力は、常にLoadの行（並び・型・名前）と同じになります。間にRerouteやRerouteBoxをはさんでも大丈夫です。
- **ダブルクリックで名前変更**：名前はLoad側で変えます。Nodes 2.0では、入力の名前をダブルクリックしてください。
- **使っている行は残る**：行が消えるのは、Loadの入力とUnloadの出力の両方が外れたときだけです。Loadの前のノードを差し替えるときも、Unloadから先の線はそのまま残ります。
- **実行時の負担なし**：どちらも画面上だけのノードです。実行時には、Unloadの各出力が、Loadの同じ行につながっているノードへ直接つながります。

**cargoの線を隠す（frontend 1.61以降）**：`cargo` の線の端の〇をクリックし、目のアイコンを選びます。Set/Getのように、その線だけが隠れます。両端には `CARGO` のバッジが付き、照準のアイコンで相手のノードへ移動できます。隠した状態はワークフローと一緒に保存されます。

Unloadの使っている出力に運ぶものがない（Loadにつながっていない、またはLoadのその行に何もつながっていない）まま実行すると、どの行かを示すエラーが出ます。

「Cargo」で検索するか、`utils` カテゴリから追加できます。

### インストール

このリポジトリを `ComfyUI/custom_nodes` に clone して、ComfyUIを再起動してください。

```
cd ComfyUI/custom_nodes
git clone https://github.com/denjiro13/ComfyUI-denjiro-Nodes
```

### ライセンス

MIT
