# yen-ksp

K shortest simple paths for directed, unweighted graphs.

This package provides a small, allocation-conscious implementation of Yen-style K shortest path enumeration. Graphs are stored in CSR form, and a reusable path finder keeps the temporary search state for repeated queries against the same graph.

## Installation

```sh
npm install yen-ksp
```

## Basic Usage

```js
import {
    make_csr_graph_unweighted,
    yen_ksp_unweighted,
} from "yen-ksp";

const adjacency = [
    [1, 2],
    [3],
    [3],
    [],
];

const graph = make_csr_graph_unweighted(adjacency);
const find_paths = yen_ksp_unweighted(graph);

const paths = [...find_paths(0, [3])];

console.log(paths);
```

Output:

```js
[
    {
        nodes: [0, 1, 3],
        edges: [0, 2],
    },
    {
        nodes: [0, 2, 3],
        edges: [1, 3],
    },
]
```

## Graph Format

Build a graph from an adjacency list with `make_csr_graph_unweighted`.

```js
const adjacency = [
    [1, 2], // node 0 has edges to nodes 1 and 2
    [3],    // node 1 has an edge to node 3
    [3],    // node 2 has an edge to node 3
    [],     // node 3 has no outgoing edges
];

const graph = make_csr_graph_unweighted(adjacency);

console.log([...graph.offsets]);
// [0, 2, 3, 4, 4]

console.log([...graph.edges]);
// [1, 2, 3, 3]
```

Each node is identified by its numeric index. The graph is directed. For an undirected graph, add edges in both directions.

If you already know the number of edges, you can pass it as the second argument:

```js
const graph = make_csr_graph_unweighted(adjacency, 4);
```

The function throws if the supplied `edge_count` does not match the adjacency list.

## Path Format

Each yielded path has this shape:

```ts
{
    nodes: number[];
    edges: number[];
}
```

The `nodes` array stores the path's node sequence.

The `edges` array stores absolute CSR edge indices into `graph.edges`. For example, in this graph:

```js
const adjacency = [
    [1, 2],
    [3],
    [3],
    [],
];

const graph = make_csr_graph_unweighted(adjacency);
// graph.edges is [1, 2, 3, 3]
```

The path `0 -> 2 -> 3` has edge indices `[1, 3]`, because:

```js
graph.edges[1] === 2;
graph.edges[3] === 3;
```

To check whether an edge index belongs to a node's outgoing range:

```js
const from = 0;
const edge_index = 1;

edge_index >= graph.offsets[from] &&
edge_index < graph.offsets[from + 1];
```

## Taking Only The First K Paths

`find_paths(start, endpoints)` returns a generator. Paths are computed lazily as the generator is consumed.

In runtimes with iterator helpers, you can use `take()`:

```js
const first_two = find_paths(0, [4]).take(2).toArray();
```

Or stop iteration manually:

```js
const first_two = [];

for (const path of find_paths(0, [4])) {
    first_two.push(path);

    if (first_two.length === 2) {
        break;
    }
}
```

Both versions stop after two paths, so the remaining paths are not computed.

## Reusing A Finder

Call `yen_ksp_unweighted(graph)` once per graph. The returned finder owns reusable temporary arrays, so repeated searches against the same graph do not need to rebuild search state.

```js
const graph = make_csr_graph_unweighted([
    [1, 2],
    [3],
    [3, 4],
    [],
    [3],
]);

const find_paths = yen_ksp_unweighted(graph);

const from_zero = [...find_paths(0, [3])];
const from_two = [...find_paths(2, [3])];
```

Do not consume multiple generators from the same finder at the same time. Finish one search before starting or advancing another one.

## Multiple Endpoints

Pass one or more endpoint node indices as the second argument.

```js
const adjacency = [
    [1, 2],
    [3],
    [4],
    [],
    [3],
];

const graph = make_csr_graph_unweighted(adjacency);
const find_paths = yen_ksp_unweighted(graph);

const paths = [...find_paths(0, [3, 4])];
```

The first shortest-path search may stop at any listed endpoint. After that, the remaining paths are generated for that same chosen endpoint.

This does not enumerate the K shortest paths to any endpoint. It enumerates:

1. the shortest path from `start` to the nearest reached endpoint, then
2. the remaining simple paths from `start` to that same endpoint.

If `start` is one of the endpoints, the finder yields the zero-length path:

```js
[...find_paths(0, [0])];
// [{ nodes: [0], edges: [] }]
```

## API

### `make_csr_graph_unweighted(adjacency, edge_count?)`

Converts an adjacency list into CSR graph storage.

```ts
function make_csr_graph_unweighted(
    adjacency: readonly (readonly number[])[],
    edge_count?: number,
): {
    offsets: Int32Array;
    edges: Int32Array;
};
```

`offsets[node]` and `offsets[node + 1]` define the half-open range of outgoing edge indices for `node`. `edges[edge_index]` stores the target node for that edge.

### `yen_ksp_unweighted(graph)`

Creates a reusable path finder for an unweighted CSR graph.

```ts
function yen_ksp_unweighted(graph: {
    offsets: Int32Array;
    edges: Int32Array;
}): (
    start_node_index: number,
    end_node_indices: number[],
) => Generator<{
    nodes: number[];
    edges: number[];
}, void, unknown>;
```

Example:

```js
const graph = make_csr_graph_unweighted(adjacency);
const find_paths = yen_ksp_unweighted(graph);

const paths = [...find_paths(start, [end])];
```

## TypeScript

The package includes TypeScript declarations.

```ts
import {
    make_csr_graph_unweighted,
    yen_ksp_unweighted,
} from "yen-ksp";

const adjacency: readonly (readonly number[])[] = [
    [1, 2],
    [3],
    [3],
    [],
];

const graph = make_csr_graph_unweighted(adjacency);
const find_paths = yen_ksp_unweighted(graph);
const paths = [...find_paths(0, [3])];
```

## Notes

* Graphs are directed.
* Nodes are numeric indices.
* Paths are simple: a yielded path does not repeat nodes.
* Path cost is the number of edges.
* Results are yielded in nondecreasing path length order.
* Iteration is lazy, so you can stop after the first `K` paths.

## License

MIT
