import { NebulaTree, NebulaNode } from "../core/types.js";

export const DEFAULT_NEBULA_TREE: NebulaTree = {
  rootId: "root",
  version: 1,
  imports: [],
  exports: [],
  nodes: {
    root: {
      id: "root",
      type: "Box",
      props: {
        className: "p-8 flex flex-col gap-4",
      },
      bindings: [],
      actions: [],
      style: {
        padding: "p-8",
        gap: "gap-4",
        width: "w-full",
        height: "h-full",
        background: "bg-white",
      },
      layout: {
        mode: "flex",
        direction: "column",
        gap: "gap-4",
      },
      children: [],
    },
  },
};
