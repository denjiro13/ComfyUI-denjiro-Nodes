# ComfyUI-denjiro-Nodes

[English](#english) | [日本語](#日本語)

---

## English

Utility nodes for ComfyUI. Every node in this pack has 🔰 at the start of its name.

### 🔰 RerouteBox

![RerouteBox](docs/images/reroutebox.png)

A box of reroutes. Each input passes straight through to the output on the same row.

**What it's for**: RerouteBox gathers any links you choose into one place, so you rewire less while building a workflow. Connect upstream nodes to the box and downstream nodes to the box's outputs. When you swap an upstream node, you only reconnect the box's input, and everything after it stays as it is.

- **Grows as you connect**: connecting the last input adds a new empty row. Rows with nothing connected are removed.
- **Follows the type**: each row takes the type of the link connected to its input (IMAGE, MODEL, ...).
- **Double-click to rename**: double-click a row's name or slot to rename it. Clear the name to show the type again. The output always shows the same name as its input. With Nodes 2.0, rename on the input side.
- **No runtime cost**: like the core Reroute, it exists only in the editor and is removed when the workflow runs.

Search for "RerouteBox", or find it under `utils`.

### 🔰 Cargo Load 🚛 / 🔰 Cargo Unload 🚛

![Cargo](docs/images/cargo.png)

A pipe that carries many links as one. Cargo Load gathers links into a single `cargo` link, and Cargo Unload unpacks them on the other end.

**What it's for**: unlike most pipe nodes, the names travel with the cargo. Rename a row on the Load and every Unload connected to it shows the new name at once.

- **Grows as you connect**: connecting the last input of the Load adds a new row. Each row takes the type of the link connected to it.
- **Unload follows the Load**: the Unload's outputs always match the Load's rows (order, type and name). Reroutes and RerouteBoxes between them are fine.
- **Double-click to rename**: rename rows on the Load. With Nodes 2.0, double-click the input's name.
- **Rows stay while in use**: a row is removed only when both its Load input and its Unload outputs are disconnected. When you swap the node feeding the Load, the links after the Unload stay as they are.
- **Remove a row in one step**: right-click the Load or an Unload, choose "Remove Cargo 🚛", then pick the row. Its links on both nodes are disconnected and the row is removed.
- **No runtime cost**: both nodes exist only in the editor. When the workflow runs, each Unload output is connected straight to what feeds the same row of the Load.

If an Unload output in use has nothing to carry (no Load connected, or nothing connected to that row), running the workflow shows an error that names the row.

**Subgraphs**: Cargo works inside a subgraph if the Load, Unloads and Transfers are all in that same subgraph. A `cargo` link can't cross a subgraph's edge. To pass values into or out of a subgraph, unload them first and connect each link on its own.

Search for "Cargo", or find them under `utils`.

### 🔰 Cargo Transfer 🚛

Changes the cargo on the way. Put it between a Cargo Load and a Cargo Unload.

- **Passes everything on**: every row of the cargo appears on the Transfer with the same name, and goes on unchanged.
- **Replace a row**: connect a link to a row's input, and that row carries the new value from here on.
- **Add rows**: connect to the last input to add a new row. Rename rows you added here by double-clicking them. Names of rows from the Load can only be changed on the Load.
- **Only what comes after changes**: Unloads connected after the Transfer see the changes. Unloads connected before it still get the original cargo.

"Remove Cargo 🚛" also works on the Transfer. A row added on the Transfer is removed from the Transfer and the nodes after it; a row from the Load is removed everywhere.

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

![RerouteBox](docs/images/reroutebox.png)

Rerouteをまとめた箱です。各入力は、同じ行の出力にそのまま通ります。

**ねらい**：任意のリンクを1か所にまとめて、ワークフローを作っている間のつなぎ直しを減らすためのものです。前のノードは箱の入力に、後ろのノードは箱の出力につなぎます。前のノードを差し替えるときは箱の入力だけをつなぎ直せばよく、その先はそのまま使えます。

- **つなぐと増える**：いちばん下の入力につなぐと、新しい空の行が増えます。何もつながっていない行は自動で消えます。
- **型に合わせる**：各行は、入力につないだ型（IMAGE、MODELなど）に合わせて変わります。
- **ダブルクリックで名前変更**：行の名前や口をダブルクリックすると、名前を変えられます。空欄にすると型名の表示に戻ります。出力側には、常に入力側と同じ名前が表示されます。Nodes 2.0では、入力側で名前を変えてください。
- **実行時の負担なし**：標準のRerouteと同じく画面上だけのノードで、実行時には取り除かれます。

「RerouteBox」で検索するか、`utils` カテゴリから追加できます。

### 🔰 Cargo Load 🚛 / 🔰 Cargo Unload 🚛

![Cargo](docs/images/cargo.png)

たくさんのリンクを1本にまとめて運ぶpipeです。Cargo Loadでリンクを1本の `cargo` にまとめ、Cargo Unloadで元のリンクに戻します。

**ねらい**：よくあるpipeノードと違い、名前も一緒に運びます。Loadで行の名前を変えると、つながっているすべてのUnloadにすぐ反映されます。

- **つなぐと増える**：Loadのいちばん下の入力につなぐと、新しい行が増えます。各行は、つないだ型に合わせて変わります。
- **UnloadはLoadに合わせる**：Unloadの出力は、常にLoadの行（並び・型・名前）と同じになります。間にRerouteやRerouteBoxをはさんでも大丈夫です。
- **ダブルクリックで名前変更**：名前はLoad側で変えます。Nodes 2.0では、入力の名前をダブルクリックしてください。
- **使っている行は残る**：行が消えるのは、Loadの入力とUnloadの出力の両方が外れたときだけです。Loadの前のノードを差し替えるときも、Unloadから先の線はそのまま残ります。
- **行をまとめて削除**：LoadかUnloadを右クリックして「Remove Cargo 🚛」を選び、行を選びます。両方のノードの線が外れて、その行が消えます。
- **実行時の負担なし**：どちらも画面上だけのノードです。実行時には、Unloadの各出力が、Loadの同じ行につながっているノードへ直接つながります。

Unloadの使っている出力に運ぶものがない（Loadにつながっていない、またはLoadのその行に何もつながっていない）まま実行すると、どの行かを示すエラーが出ます。

**サブグラフ**：Load・Unload・Transferをすべて同じサブグラフの中に置けば、サブグラフの中でも使えます。`cargo` の線はサブグラフの境界をまたげません。サブグラフに出し入れする値は、Unloadで取り出してから1本ずつつないでください。

「Cargo」で検索するか、`utils` カテゴリから追加できます。

### 🔰 Cargo Transfer 🚛

運ぶ途中で荷物を積み替えます。Cargo LoadとCargo Unloadの間に置きます。

- **全部を引き継ぐ**：荷物のすべての行が同じ名前でTransferに並び、そのまま先へ渡ります。
- **差し替え**：行の入力に線をつなぐと、その行はここから先、新しい中身を運びます。
- **追加**：いちばん下の入力につなぐと、新しい行が増えます。ここで足した行は、ダブルクリックで名前を変えられます。Loadから来た行の名前は、Loadで変えてください。
- **変わるのは後ろだけ**：差し替えや追加が届くのは、Transferより後ろのUnloadだけです。Transferより前につないだUnloadには、元の荷物が届きます。

「Remove Cargo 🚛」はTransferでも使えます。Transferで足した行はTransferとその後ろから、Loadから来た行はすべてのノードから消えます。

### インストール

このリポジトリを `ComfyUI/custom_nodes` に clone して、ComfyUIを再起動してください。

```
cd ComfyUI/custom_nodes
git clone https://github.com/denjiro13/ComfyUI-denjiro-Nodes
```

### ライセンス

MIT
