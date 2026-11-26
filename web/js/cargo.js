import { app } from "../../scripts/app.js";

// Cargo: frontend-only "pipe" nodes.
// Cargo Load gathers any number of links into one CARGO link. Cargo Unload follows
// that link back to its Cargo Load, mirrors the Load's rows (type and name) as its
// outputs, and at run time each output is rewired straight to the Load's input on
// the same row. Both nodes are virtual, so neither reaches the backend prompt.

const LOAD_TYPE = "CargoLoad";
const LOAD_TITLE = "🔰 Cargo Load 🚛";
const UNLOAD_TYPE = "CargoUnload";
const UNLOAD_TITLE = "🔰 Cargo Unload 🚛";
const CARGO = "CARGO";
const MIN_WIDTH = 160;
const MAX_HOPS = 64;

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

class CargoLoad extends LiteGraph.LGraphNode {
  constructor(title) {
    super(title ?? LOAD_TITLE);
    this.isVirtualNode = true;
    this.addOutput("cargo", CARGO);
    this.addRow();
  }

  addRow() {
    this.linkLabel(this.addInput("", "*"));
  }

  // The trailing empty input is not a row.
  rowCount() {
    return Math.max(this.inputs.length - 1, 0);
  }

  onConfigure() {
    for (const input of this.inputs) this.linkLabel(input);
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
        if (!app.configuringGraph) this.notifyUnloads();
      },
    });
  }

  unloads() {
    return (this.graph?._nodes ?? []).filter(
      (n) => n.type === UNLOAD_TYPE && n.findSource?.() === this,
    );
  }

  notifyUnloads() {
    for (const unload of this.unloads()) unload.syncFromSource();
    this.setDirtyCanvas(true, true);
  }

  // A row stays while its input is connected or any Unload uses its output.
  isRowUsed(i, unloads) {
    if (this.inputs[i].link != null) return true;
    return unloads.some((u) => (u.outputs[i]?.links?.length ?? 0) > 0);
  }

  onAdded() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  onConnectionsChange() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  scheduleTidy() {
    schedule(this, "tidyPending", () => this.tidy());
  }

  tidy() {
    const unloads = this.unloads();
    for (let i = this.inputs.length - 2; i >= 0; i--) {
      if (this.isRowUsed(i, unloads)) continue;
      this.removeInput(i);
      for (const unload of unloads) {
        if (unload.outputs[i]) unload.removeOutput(i);
      }
    }
    const last = this.inputs.length - 1;
    if (last < 0 || this.isRowUsed(last, unloads)) this.addRow();

    for (let i = 0; i < this.inputs.length; i++) {
      const link = this.getInputLink(i);
      if (link) this.setRowType(i, link.type);
      else if (!this.isRowUsed(i, unloads)) this.setRowType(i, "*");
    }
    fitSize(this);
    this.notifyUnloads();
  }

  setRowType(i, type) {
    const input = this.inputs[i];
    input.type = type;
    input.name = type === "*" ? "" : String(type);
  }

  rowAt(y) {
    const half = LiteGraph.NODE_SLOT_HEIGHT / 2;
    for (let i = 0; i < this.inputs.length; i++) {
      if (Math.abs(this.getInputPos(i)[1] - this.pos[1] - y) <= half) return i;
    }
    return -1;
  }

  onDblClick(e, pos, canvas) {
    const i = this.rowAt(pos[1]);
    if (i !== -1) this.promptRename(i, e, canvas);
  }

  onInputDblClick(i, e) {
    this.promptRename(i, e, app.canvas);
  }

  promptRename(i, e, canvas) {
    const current = this.inputs[i].label ?? this.inputs[i].name;
    canvas.prompt("Name", current, (value) => {
      this.graph.beforeChange();
      this.inputs[i].label = value.trim() || undefined;
      this.graph.afterChange();
      fitSize(this);
    }, e);
  }
}

class CargoUnload extends LiteGraph.LGraphNode {
  constructor(title) {
    super(title ?? UNLOAD_TITLE);
    this.isVirtualNode = true;
    this.addInput("cargo", CARGO);
  }

  // Follow the cargo link upstream, through Reroutes and RerouteBoxes, to its Load.
  findSource() {
    if (!this.graph) return null;
    let link = this.getInputLink(0);
    for (let hop = 0; link && hop < MAX_HOPS; hop++) {
      const node = this.graph.getNodeById(link.origin_id);
      if (!node) return null;
      if (node.type === LOAD_TYPE) return node;
      if (!node.isVirtualNode || node.isSubgraphNode?.()) return null;
      link = node.getInputLink?.(link.origin_slot);
    }
    return null;
  }

  // Mirror the Load's rows. Without a Load, keep the outputs as they are so that
  // reconnecting does not lose the links downstream.
  syncFromSource() {
    const source = this.findSource();
    if (source) this.lastSource = source;
    if (!source) return;
    const rows = source.rowCount();
    for (let i = 0; i < rows; i++) {
      const input = source.inputs[i];
      const output = this.outputs[i] ?? this.addOutput("", "*");
      output.type = input.type;
      output.name = input.name;
      if (input.label) output.label = input.label;
      else delete output.label;
    }
    for (let i = this.outputs.length - 1; i >= rows; i--) {
      if ((this.outputs[i].links?.length ?? 0) > 0) break;
      this.removeOutput(i);
    }
    // Nodes 2.0 re-reads slot names on this event.
    this.graph.trigger?.("node:slot-label:changed", { nodeId: this.id, slotType: LiteGraph.OUTPUT });
    fitSize(this);
  }

  // Any change here can free rows in the Load (the current one, or the one the
  // cargo link used to come from), so let it tidy; tidying re-syncs this node.
  onConnectionsChange() {
    if (app.configuringGraph) return;
    schedule(this, "syncPending", () => {
      this.syncFromSource();
      this.tidySources();
    });
  }

  onRemoved() {
    this.tidySources();
  }

  tidySources() {
    for (const load of new Set([this.lastSource, this.findSource()])) {
      if (load?.graph) load.scheduleTidy();
    }
  }

  onAfterGraphConfigured() {
    this.syncFromSource();
  }

  // Called by graphToPrompt: send output N straight to whatever feeds row N of the Load.
  resolveVirtualOutput(slot) {
    const source = this.findSource();
    const label = this.outputs[slot]?.label ?? this.outputs[slot]?.name ?? `#${slot + 1}`;
    if (!source) {
      throw new Error(`${UNLOAD_TITLE}: "${label}" is not connected to a ${LOAD_TITLE}.`);
    }
    if (slot >= source.rowCount()) {
      throw new Error(`${UNLOAD_TITLE}: "${label}" has no matching row in ${LOAD_TITLE}.`);
    }
    const link = source.getInputLink(slot);
    if (!link) {
      throw new Error(`${UNLOAD_TITLE}: nothing is loaded into "${label}" in ${LOAD_TITLE}.`);
    }
    const origin = this.graph.getNodeById(link.origin_id);
    // Inside a subgraph the row may come from the subgraph's input; let the Load resolve it.
    return origin ? { node: origin, slot: link.origin_slot } : { node: source, slot };
  }
}

app.registerExtension({
  name: "denjiro.Cargo",
  registerCustomNodes() {
    LiteGraph.registerNodeType(LOAD_TYPE, Object.assign(CargoLoad, {
      title: LOAD_TITLE,
      description: "Loads any number of links into one cargo link. Connecting the last input adds a new row. Double-click a row to rename it; Cargo Unload shows the same names.",
    }));
    CargoLoad.category = "utils";
    LiteGraph.registerNodeType(UNLOAD_TYPE, Object.assign(CargoUnload, {
      title: UNLOAD_TITLE,
      description: "Unloads the cargo from a Cargo Load. Its outputs follow the Load's rows, types and names.",
    }));
    CargoUnload.category = "utils";
  },
  // Frontend-only node defs use the type name as display_name; show the title instead.
  beforeRegisterVueAppNodeDefs(defs) {
    const titles = { [LOAD_TYPE]: LOAD_TITLE, [UNLOAD_TYPE]: UNLOAD_TITLE };
    for (const def of defs) {
      if (titles[def.name]) def.display_name = titles[def.name];
    }
  },
});
