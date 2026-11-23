import { app } from "../../scripts/app.js";

// RerouteBox: a frontend-only node that passes input N straight through to output N.
// Like the core Reroute it is virtual, so it never reaches the backend prompt.

const NODE_TYPE = "RerouteBox";
const NODE_TITLE = "🔀 RerouteBox";
const MIN_WIDTH = 140;

class RerouteBox extends LiteGraph.LGraphNode {
  constructor(title) {
    super(title ?? NODE_TITLE);
    this.isVirtualNode = true;
    this.addPair();
  }

  addPair() {
    this.addInput("", "*");
    this.addOutput("", "*");
  }

  removePair(i) {
    this.removeInput(i);
    this.removeOutput(i);
  }

  isPairUsed(i) {
    return this.inputs[i].link != null || (this.outputs[i].links?.length ?? 0) > 0;
  }

  onAdded() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  onConnectionsChange() {
    if (!app.configuringGraph) this.scheduleTidy();
  }

  // Link edits fire several callbacks mid-operation; restructure once they settle.
  scheduleTidy() {
    if (this.tidyPending) return;
    this.tidyPending = true;
    setTimeout(() => {
      this.tidyPending = false;
      if (this.graph) this.tidy();
    });
  }

  tidy() {
    for (let i = this.inputs.length - 2; i >= 0; i--) {
      if (!this.isPairUsed(i)) this.removePair(i);
    }
    if (this.inputs.length === 0 || this.isPairUsed(this.inputs.length - 1)) this.addPair();

    for (let i = 0; i < this.inputs.length; i++) {
      const link = this.getInputLink(i);
      if (link) {
        this.setPairType(i, link.type);
      } else if (!this.isPairUsed(i)) {
        this.setPairType(i, "*");
      }
    }
    this.fitSize();
  }

  setPairType(i, type) {
    const name = type === "*" ? "" : String(type);
    for (const slot of [this.inputs[i], this.outputs[i]]) {
      slot.type = type;
      slot.name = name;
    }
  }

  fitSize() {
    const [w, h] = this.computeSize();
    this.setSize([Math.max(w, this.size[0], MIN_WIDTH), h]);
    this.setDirtyCanvas(true, true);
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

  onOutputDblClick(i, e) {
    this.promptRename(i, e, app.canvas);
  }

  promptRename(i, e, canvas) {
    const current = this.inputs[i].label ?? this.inputs[i].name;
    canvas.prompt("Name", current, (value) => {
      const label = value.trim();
      this.graph.beforeChange();
      for (const slot of [this.inputs[i], this.outputs[i]]) {
        if (label) slot.label = label;
        else delete slot.label;
      }
      this.graph.afterChange();
      this.fitSize();
    }, e);
  }
}

app.registerExtension({
  name: "denjiro.RerouteBox",
  registerCustomNodes() {
    LiteGraph.registerNodeType(NODE_TYPE, Object.assign(RerouteBox, {
      title: NODE_TITLE,
      description: "Passes any number of links straight through one box. Connecting the last input adds a new slot. Double-click a slot to rename it.",
    }));
    RerouteBox.category = "utils";
  },
});
