import { app } from "../../scripts/app.js";

// Cargo: frontend-only "pipe" nodes.
//
// - Cargo Load gathers any number of links into one CARGO link.
// - Cargo Transfer takes a CARGO link, passes every row on, and lets you replace a
//   row (connect to its input) or add new rows (connect to the last input).
// - Cargo Unload follows the CARGO link back and shows the rows as its outputs.
//
// Load and Transfer are "carriers". Every row has a hidden id, so rows keep
// matching across the chain when rows are added or removed anywhere. All three
// nodes are virtual: at run time each Unload output is connected straight to
// whatever feeds that row, and none of them reaches the backend prompt.

const LOAD_TYPE = "CargoLoad";
const LOAD_TITLE = "🔰 Cargo Load 🚛";
const TRANSFER_TYPE = "CargoTransfer";
const TRANSFER_TITLE = "🔰 Cargo Transfer 🚛";
const UNLOAD_TYPE = "CargoUnload";
const UNLOAD_TITLE = "🔰 Cargo Unload 🚛";
const CARGO = "CARGO";
const MIN_WIDTH = 160;
const MAX_HOPS = 64;

const newId = () => Math.random().toString(36).slice(2, 10);
const isCarrier = (node) => node?.type === LOAD_TYPE || node?.type === TRANSFER_TYPE;
const isConsumer = (node) => node?.type === UNLOAD_TYPE || node?.type === TRANSFER_TYPE;

function fitSize(node) {
  const [w, h] = node.computeSize();
  node.setSize([Math.max(w, node.size[0], MIN_WIDTH), h]);
  node.setDirtyCanvas(true, true);
}

// Link edits fire several callbacks mid-operation; act once they settle.
function schedule(node, key, fn) {
  if (node[key]) return;
  node[key] = true;
  setTimeout(() => {
    node[key] = false;
    if (node.graph) fn();
  });
}

// Nodes 2.0 re-reads slot names on this event.
function notifySlotLabels(node, slotType) {
  node.graph?.trigger?.("node:slot-label:changed", { nodeId: node.id, slotType });
}

// Follow input 0 (the cargo link) upstream, through Reroutes and RerouteBoxes.
function findCarrier(node) {
  if (!node.graph) return null;
  let link = node.getInputLink(0);
  for (let hop = 0; link && hop < MAX_HOPS; hop++) {
    const origin = node.graph.getNodeById(link.origin_id);
    if (!origin) return null;
    if (isCarrier(origin)) return origin;
    if (!origin.isVirtualNode || origin.isSubgraphNode?.()) return null;
    link = origin.getInputLink?.(link.origin_slot);
  }
  return null;
}

// Where the value on input j of a carrier comes from, for graphToPrompt.
function linkTarget(node, j) {
  const link = node.getInputLink(j);
  if (!link) return null;
  const origin = node.graph.getNodeById(link.origin_id);
  // Inside a subgraph the row may come from the subgraph's input; let the node resolve it.
  return origin ? { node: origin, slot: link.origin_slot } : { node, slot: j };
}

function rowText(row) {
  return row.label || row.name || "(empty)";
}

// Load and Transfer. Inputs are [cargo (Transfer only), ...rows, trailing empty].
// properties.cargoRows runs parallel to the inputs: {id, own} for a row, null otherwise.
// own: the row was added on this node. Otherwise it is inherited from upstream.
class CargoCarrier extends LiteGraph.LGraphNode {
  static HAS_SOURCE = false;

  constructor(title) {
    super(title);
    this.isVirtualNode = true;
    this.properties ??= {};
    this.properties.cargoRows = [];
    if (this.constructor.HAS_SOURCE) this.addSlot("cargo", CARGO, null);
    this.addOutput("cargo", CARGO);
    this.addSlot("", "*", null);
  }

  get firstRow() {
    return this.constructor.HAS_SOURCE ? 1 : 0;
  }

  meta() {
    const m = (this.properties.cargoRows ??= []);
    while (m.length < this.inputs.length) m.push(null);
    m.length = this.inputs.length;
    return m;
  }

  rowIndices() {
    const out = [];
    for (let j = this.firstRow; j < this.inputs.length - 1; j++) out.push(j);
    return out;
  }

  indexOfRow(id) {
    return this.meta().findIndex((m) => m?.id === id);
  }

  addSlot(name, type, meta) {
    this.meta().push(meta);
    const input = this.addInput(name, type);
    if (this.inputs.length - 1 >= this.firstRow) this.linkLabel(input);
  }

  removeSlot(j) {
    const m = this.meta();
    const removed = m.splice(j, 1);
    const before = this.inputs.length;
    this.removeInput(j);
    if (this.inputs.length === before) m.splice(j, 0, ...removed);
  }

  // The last input must be an empty, unconnected slot. Connecting to it makes it a row.
  ensureTrailing() {
    const m = this.meta();
    const last = this.inputs.length - 1;
    if (last >= this.firstRow && m[last] == null && this.inputs[last].link == null) return;
    if (last >= this.firstRow && m[last] == null) m[last] = { id: newId(), own: true };
    this.addSlot("", "*", null);
  }

  // Put a new row just above the trailing empty slot.
  insertRow(name, type, meta) {
    this.ensureTrailing();
    this.removeSlot(this.inputs.length - 1);
    this.addSlot(name, type, meta);
    this.addSlot("", "*", null);
  }

  onConfigure() {
    // Workflows saved before row ids existed: every row is the Load's own.
    const m = this.properties.cargoRows;
    if (!Array.isArray(m) || m.length !== this.inputs.length) {
      this.properties.cargoRows = this.inputs.map((_, j) =>
        j < this.firstRow || j === this.inputs.length - 1 ? null : { id: newId(), own: true });
    }
    for (let j = this.firstRow; j < this.inputs.length; j++) this.linkLabel(this.inputs[j]);
  }

  onAfterGraphConfigured() {
    if (this.constructor.HAS_SOURCE) this.sync();
  }

  // Nodes 2.0 writes slot.label directly, so watch it with a setter.
  linkLabel(input) {
    if (Object.getOwnPropertyDescriptor(input, "label")?.set) return;
    let label = input.label;
    Object.defineProperty(input, "label", {
      configurable: true,
      enumerable: true,
      get: () => label,
      set: (value) => {
        label = value;
        if (this.silentLabels || app.configuringGraph) return;
        const meta = this.meta()[this.inputs.indexOf(input)];
        if (meta?.own) this.notifyConsumers();
        // Inherited names come from upstream; put the name back.
        else if (meta) schedule(this, "restorePending", () => this.sync());
      },
    });
  }

  findSource() {
    return this.constructor.HAS_SOURCE ? findCarrier(this) : null;
  }

  consumers() {
    return (this.graph?._nodes ?? []).filter(
      (n) => n !== this && isConsumer(n) && n.findSource?.() === this,
    );
  }

  notifyConsumers() {
    for (const consumer of this.consumers()) consumer.sync();
    this.setDirtyCanvas(true, true);
  }

  // The rows this node passes on, in order.
  rows(depth = 0) {
    if (depth > MAX_HOPS) return [];
    const upstream = new Map(
      (this.findSource()?.rows(depth + 1) ?? []).map((r) => [r.id, r]),
    );
    const m = this.meta();
    const rows = [];
    for (const j of this.rowIndices()) {
      const meta = m[j];
      if (!meta) continue;
      const input = this.inputs[j];
      const base = meta.own ? undefined : upstream.get(meta.id);
      rows.push({
        id: meta.id,
        type: base?.type ?? input.type,
        name: base?.name ?? input.name,
        label: base ? base.label : input.label,
        resolve: () => linkTarget(this, j) ?? base?.resolve() ?? null,
      });
    }
    return rows;
  }

  // Is the row with this id used on any node after this one?
  usedDownstream(id, seen = new Set()) {
    if (seen.has(this)) return false;
    seen.add(this);
    return this.consumers().some((c) => c.usesRow(id, seen));
  }

  // As a consumer (Transfer): the row is replaced here, or used further on.
  usesRow(id, seen) {
    const j = this.indexOfRow(id);
    return (j !== -1 && this.inputs[j].link != null) || this.usedDownstream(id, seen);
  }

  // A row stays while its input is connected or any node after this one uses it.
  isRowUsed(j) {
    const meta = this.meta()[j];
    return this.inputs[j].link != null || (meta != null && this.usedDownstream(meta.id));
  }

  // Transfer: follow the upstream rows. Inherited rows that disappear upstream
  // stay while they are in use, so no links are lost.
  sync(notify = true) {
    if (!this.constructor.HAS_SOURCE) return;
    const source = this.findSource();
    if (!source) return;
    this.lastSource = source;
    const upstream = new Map(source.rows().map((r) => [r.id, r]));

    this.silentLabels = true;
    for (const j of this.rowIndices().reverse()) {
      const meta = this.meta()[j];
      if (meta && !meta.own && !upstream.has(meta.id) && !this.isRowUsed(j)) this.removeSlot(j);
    }
    for (const row of upstream.values()) {
      if (this.indexOfRow(row.id) === -1) this.insertRow(row.name, row.type, { id: row.id, own: false });
    }
    for (const j of this.rowIndices()) {
      const meta = this.meta()[j];
      const base = meta && !meta.own ? upstream.get(meta.id) : undefined;
      if (!base) continue;
      const input = this.inputs[j];
      input.type = base.type;
      input.name = base.name;
      input.label = base.label;
    }
    this.silentLabels = false;

    notifySlotLabels(this, LiteGraph.INPUT);
    fitSize(this);
    if (notify) this.notifyConsumers();
  }

  onAdded() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  onConnectionsChange() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  onRemoved() {
    if (this.lastSource?.graph) this.lastSource.scheduleTidy();
  }

  // A cargo link cannot be loaded as a row.
  onConnectInput(slot, type) {
    return !(slot >= this.firstRow && type === CARGO);
  }

  scheduleTidy() {
    schedule(this, "tidyPending", () => this.tidy());
  }

  tidy() {
    this.ensureTrailing();
    this.sync(false);
    for (const j of this.rowIndices().reverse()) {
      if (this.meta()[j]?.own && !this.isRowUsed(j)) this.removeSlot(j);
    }
    this.ensureTrailing();

    for (const j of this.rowIndices()) {
      if (!this.meta()[j]?.own) continue;
      const link = this.getInputLink(j);
      if (link) this.setRowType(j, link.type);
    }
    this.setRowType(this.inputs.length - 1, "*");

    notifySlotLabels(this, LiteGraph.INPUT);
    fitSize(this);
    this.notifyConsumers();
    // Usage upstream may have changed too.
    for (const source of new Set([this.lastSource, this.findSource()])) {
      if (source?.graph && source !== this) source.scheduleTidy();
    }
  }

  setRowType(j, type) {
    const input = this.inputs[j];
    input.type = type;
    input.name = type === "*" ? "" : String(type);
  }

  // The node that added this row: this one, or a carrier upstream.
  definerOf(id, depth = 0) {
    const j = this.indexOfRow(id);
    if (j !== -1 && this.meta()[j].own) return this;
    return depth < MAX_HOPS ? this.findSource()?.definerOf(id, depth + 1) ?? null : null;
  }

  // Disconnect the row everywhere after the node that added it, then remove it.
  purge(id) {
    this.graph.beforeChange();
    const seen = new Set();
    const visit = (carrier) => {
      if (seen.has(carrier)) return;
      seen.add(carrier);
      for (const consumer of carrier.consumers()) {
        if (consumer.type === UNLOAD_TYPE) {
          const i = consumer.ids().indexOf(id);
          if (i !== -1) consumer.disconnectOutput(i);
        } else {
          const j = consumer.indexOfRow(id);
          if (j !== -1) consumer.disconnectInput(j);
          visit(consumer);
        }
      }
    };
    visit(this);
    const j = this.indexOfRow(id);
    if (j !== -1) this.disconnectInput(j);
    this.tidy();
    this.graph.afterChange();
  }

  // Node menu (works in both the classic canvas and Nodes 2.0).
  removeRowMenu() {
    const items = this.rows().map((row, k) => ({
      content: `${k + 1}: ${rowText(row)}`,
      callback: () => this.definerOf(row.id)?.purge(row.id),
    }));
    if (!items.length) return [];
    return [{
      content: "Remove Cargo 🚛",
      has_submenu: true,
      callback: (value, options, e, menu) => {
        new LiteGraph.ContextMenu(items, { event: e, parentMenu: menu, node: this });
      },
    }];
  }

  getExtraMenuOptions() {
    return this.removeRowMenu();
  }

  rowAt(y) {
    const half = LiteGraph.NODE_SLOT_HEIGHT / 2;
    for (let j = this.firstRow; j < this.inputs.length; j++) {
      if (Math.abs(this.getInputPos(j)[1] - this.pos[1] - y) <= half) return j;
    }
    return -1;
  }

  onDblClick(e, pos, canvas) {
    const j = this.rowAt(pos[1]);
    if (j !== -1) this.promptRename(j, e, canvas);
  }

  onInputDblClick(j, e) {
    this.promptRename(j, e, app.canvas);
  }

  // Only rows added on this node can be renamed here.
  promptRename(j, e, canvas) {
    if (!this.meta()[j]?.own) return;
    const current = this.inputs[j].label ?? this.inputs[j].name;
    canvas.prompt("Name", current, (value) => {
      this.graph.beforeChange();
      this.inputs[j].label = value.trim() || undefined;
      this.graph.afterChange();
      fitSize(this);
    }, e);
  }
}

class CargoLoad extends CargoCarrier {
  static HAS_SOURCE = false;

  constructor(title) {
    super(title ?? LOAD_TITLE);
  }
}

class CargoTransfer extends CargoCarrier {
  static HAS_SOURCE = true;

  constructor(title) {
    super(title ?? TRANSFER_TITLE);
  }
}

// Outputs mirror the rows of the carrier upstream.
// properties.cargoIds runs parallel to the outputs and holds each output's row id.
class CargoUnload extends LiteGraph.LGraphNode {
  constructor(title) {
    super(title ?? UNLOAD_TITLE);
    this.isVirtualNode = true;
    this.properties ??= {};
    this.properties.cargoIds = [];
    this.addInput("cargo", CARGO);
  }

  ids() {
    const ids = (this.properties.cargoIds ??= []);
    while (ids.length < this.outputs.length) ids.push(null);
    ids.length = this.outputs.length;
    return ids;
  }

  findSource() {
    return findCarrier(this);
  }

  usesRow(id) {
    const i = this.ids().indexOf(id);
    return i !== -1 && (this.outputs[i].links?.length ?? 0) > 0;
  }

  // Without a carrier, keep the outputs as they are so that reconnecting does not
  // lose the links downstream. Outputs whose row is gone stay while connected.
  sync() {
    const source = this.findSource();
    if (!source) return;
    this.lastSource = source;
    const rows = source.rows();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ids = this.ids();

    // A different carrier (or a workflow saved before row ids): match by position.
    if (ids.length && !ids.some((id) => byId.has(id))) {
      rows.forEach((row, i) => { if (i < ids.length) ids[i] = row.id; });
    }
    for (let i = this.outputs.length - 1; i >= 0; i--) {
      if (byId.has(ids[i]) || (this.outputs[i].links?.length ?? 0) > 0) continue;
      this.ids().splice(i, 1);
      this.removeOutput(i);
    }
    for (const row of rows) {
      if (this.ids().includes(row.id)) continue;
      this.ids().push(row.id);
      this.addOutput("", "*");
    }
    this.ids().forEach((id, i) => {
      const row = byId.get(id);
      if (!row) return;
      const output = this.outputs[i];
      output.type = row.type;
      output.name = row.name;
      if (row.label) output.label = row.label;
      else delete output.label;
    });

    notifySlotLabels(this, LiteGraph.OUTPUT);
    fitSize(this);
  }

  // Any change here can free rows upstream (on the current carrier, or the one
  // the cargo link used to come from), so let it tidy; tidying re-syncs this node.
  onConnectionsChange() {
    if (app.configuringGraph) return;
    schedule(this, "syncPending", () => {
      this.sync();
      this.tidySources();
    });
  }

  onRemoved() {
    this.tidySources();
  }

  tidySources() {
    for (const source of new Set([this.lastSource, this.findSource()])) {
      if (source?.graph) source.scheduleTidy();
    }
  }

  onAfterGraphConfigured() {
    this.sync();
  }

  getExtraMenuOptions() {
    return this.findSource()?.removeRowMenu() ?? [];
  }

  // Called by graphToPrompt: send output N straight to whatever feeds that row.
  resolveVirtualOutput(slot) {
    const output = this.outputs[slot];
    const label = output?.label || output?.name || `#${slot + 1}`;
    const source = this.findSource();
    if (!source) {
      throw new Error(`${UNLOAD_TITLE}: "${label}" is not connected to a Cargo Load.`);
    }
    const row = source.rows().find((r) => r.id === this.ids()[slot]);
    if (!row) {
      throw new Error(`${UNLOAD_TITLE}: "${label}" is no longer in the cargo.`);
    }
    const target = row.resolve();
    if (!target) {
      throw new Error(`${UNLOAD_TITLE}: nothing is loaded into "${label}".`);
    }
    return target;
  }
}

const NODES = [
  [LOAD_TYPE, LOAD_TITLE, CargoLoad,
    "Loads any number of links into one cargo link. Connecting the last input adds a new row. Double-click a row to rename it; every Cargo Unload shows the same names."],
  [TRANSFER_TYPE, TRANSFER_TITLE, CargoTransfer,
    "Passes cargo on. Connect to a row to replace it, or to the last input to add a new row. Only nodes after this one see the changes."],
  [UNLOAD_TYPE, UNLOAD_TITLE, CargoUnload,
    "Unloads the cargo. Its outputs follow the rows, types and names of the Cargo Load or Transfer before it."],
];

app.registerExtension({
  name: "denjiro.Cargo",
  registerCustomNodes() {
    for (const [type, title, cls, description] of NODES) {
      LiteGraph.registerNodeType(type, Object.assign(cls, { title, description }));
      cls.category = "utils";
    }
  },
  // Frontend-only node defs use the type name as display_name; show the title instead.
  beforeRegisterVueAppNodeDefs(defs) {
    for (const def of defs) {
      const node = NODES.find(([type]) => type === def.name);
      if (node) def.display_name = node[1];
    }
  },
});
