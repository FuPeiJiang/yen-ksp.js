# yen-ksp

K shortest simple paths for directed, unweighted graphs.

This package provides a small, allocation-conscious implementation of Yen-style K shortest path enumeration. It uses CSR-style graph storage internally and exposes both a convenient wrapper and lower-level functions for reusing state across calls.

## Installation

```sh
npm install yen-ksp
```

## Basic usage

```js
import {
    breadth_first_search,
    yen_ksp_wrapper,
} from "yen-ksp";

const adjacency = [
    [1, 2],
    [3],
    [3],
    [],
];

const paths = [...yen_ksp_wrapper(
    0,
    3,
    breadth_first_search,
    adjacency,
)];

console.log(paths);
```

Output:

```js
[
    {
        nodes: [0, 1, 3],
        edges: [0, 0],
    },
    {
        nodes: [0, 2, 3],
        edges: [1, 0],
    },
]
```

## Graph format

Graphs are represented as adjacency lists:

```js
const adjacency = [
    [1, 2], // node 0 has edges to nodes 1 and 2
    [3],    // node 1 has an edge to node 3
    [3],    // node 2 has an edge to node 3
    [],     // node 3 has no outgoing edges
];
```

Each node is identified by its numeric index.

The graph is directed. If you want an undirected graph, add edges in both directions.

## Path format

Each yielded path has this shape:

```ts
{
    nodes: number[];
    edges: number[];
}
```

For example:

```js
{
    nodes: [0, 2, 3],
    edges: [1, 0],
}
```

The `nodes` array stores the path’s node sequence.

The `edges` array stores local outgoing edge indices. So in this graph:

```js
const adjacency = [
    [1, 2],
    [3],
    [3],
    [],
];
```

The path `0 -> 2 -> 3` has edge indices `[1, 0]`, because:

```js
adjacency[0][1] === 2;
adjacency[2][0] === 3;
```

## Taking only the first K paths

`yen_ksp` and `yen_ksp_wrapper` return generators. The generator is lazy, so paths are only computed as they are requested.

In modern runtimes with iterator helpers, you can use `take()`:

```js id="f4tlz3"
import {
    breadth_first_search,
    yen_ksp_wrapper,
} from "yen-ksp";

const adjacency = [
    [1, 2, 3],
    [4],
    [4],
    [4],
    [],
];

const first_two = yen_ksp_wrapper(
    0,
    4,
    breadth_first_search,
    adjacency,
).take(2).toArray();

console.log(first_two);
```

For older runtimes, or if you prefer not to rely on iterator helpers, stop the generator manually:

```js id="rmct52"
const first_two = [];

for (const path of yen_ksp_wrapper(0, 4, breadth_first_search, adjacency)) {
    first_two.push(path);

    if (first_two.length === 2) {
        break;
    }
}
```

Both versions stop iteration after two paths, so the remaining paths are not computed.

## Lower-level usage

For repeated searches, you can build the CSR graph and reusable state manually.

```js
import {
    breadth_first_search,
    make_csr,
    yen_ksp,
    yen_ksp_initialize_state,
} from "yen-ksp";

const adjacency = [
    [1, 2],
    [3],
    [3],
    [],
];

const edges = make_csr(adjacency);
const state = yen_ksp_initialize_state(adjacency.length);

const paths = [...yen_ksp(
    0,
    3,
    breadth_first_search,
    edges,
    state,
)];
```

This avoids rebuilding the internal graph representation and temporary arrays yourself.

## Choosing the nearest endpoint first

For advanced use cases, you can start with multiple possible end nodes, let the first shortest-path search choose the nearest reachable endpoint, and then continue Yen's algorithm using only that chosen endpoint.

This is useful when you have several acceptable terminal nodes, but once the nearest one is found, you want the remaining paths to target that same endpoint.

```js id="ooi4sr"
import {
    breadth_first_search,
    make_csr,
    yen_ksp,
    yen_ksp_initialize_state,
} from "yen-ksp";

const adjacency = [
    [1, 2],
    [3],
    [4],
    [],
    [],
];

const start = 0;
const endpoints = [3, 4];

const edges = make_csr(adjacency);
const state = yen_ksp_initialize_state(adjacency.length);

// Mark all candidate endpoints as terminal nodes for the first BFS.
for (const endpoint of endpoints) {
    state.visited[endpoint] = -1;
}

// Pass undefined as the end node because the terminal nodes
// have already been marked in state.visited.
const iterator = yen_ksp(
    start,
    undefined,
    breadth_first_search,
    edges,
    state,
);

const first_result = iterator.next();

if (!first_result.done) {
    const first_path = first_result.value;
    const chosen_endpoint = first_path.nodes[first_path.nodes.length - 1];

    // Clear the temporary multi-endpoint markers.
    for (const endpoint of endpoints) {
        state.visited[endpoint] = 0;
    }

    // Continue the generator with only the chosen endpoint marked.
    state.visited[chosen_endpoint] = -1;

    const paths = [
        first_path,
        ...iterator,
    ];

    console.log(paths);
}
```

This relies on the internal convention used by `breadth_first_search`: `state.visited[index] === -1` marks a terminal node.

The first search may stop at any candidate endpoint. After that, the remaining paths are generated only for the endpoint reached by the first path.

This does **not** enumerate the K shortest paths to any endpoint. It enumerates:

1. the shortest path from `start` to the nearest marked endpoint, then
2. the remaining simple paths from `start` to that same chosen endpoint.


## API

### `yen_ksp_wrapper(start, end, shortest_path, adjacency)`

Convenience wrapper that builds CSR storage and state automatically.

```ts
function yen_ksp_wrapper(
    start_node_index: number,
    end_node_index: number,
    shortest_path: shortest_path_t,
    adjacency: readonly (readonly number[])[],
): Generator<{
    nodes: number[];
    edges: number[];
}, void, unknown>;
```

Example:

```js
const paths = [...yen_ksp_wrapper(
    0,
    3,
    breadth_first_search,
    adjacency,
)];
```

### `yen_ksp(start, end, shortest_path, edges, state)`

Lower-level generator.

```ts
function yen_ksp(
    start_node_index: number,
    end_node_index: number | undefined,
    shortest_path: shortest_path_t,
    edges: Int32Array,
    state: ReturnType<typeof yen_ksp_initialize_state>,
): Generator<{
    nodes: number[];
    edges: number[];
}, void, unknown>;
```

Use this when you want to reuse CSR storage and temporary arrays.

### `make_csr(adjacency)`

Converts an adjacency list into the internal CSR-style `Int32Array` representation.

```ts
function make_csr(
    adjacency: readonly (readonly number[])[],
): Int32Array;
```

### `yen_ksp_initialize_state(nodes_length)`

Creates reusable temporary arrays.

```ts
function yen_ksp_initialize_state(nodes_length: number): {
    parent: Int32Array;
    edge_indices: Int32Array;
    visited: Int32Array;
    excluded_edges: Uint8Array;
    search_stack: Int32Array;
};
```

### `breadth_first_search(...)`

Default shortest path function for unweighted graphs.

```ts
function breadth_first_search(
    start_node_index: number,
    edges: Int32Array,
    excluded_edges: Uint8Array,
    edge_indices: Int32Array,
    search_stack: Int32Array,
    parent: Int32Array,
    visited: Int32Array,
    visited_id: number,
): number;
```

Most users should pass this to `yen_ksp` or `yen_ksp_wrapper`.

```js
const paths = [...yen_ksp_wrapper(
    start,
    end,
    breadth_first_search,
    adjacency,
)];
```

### `MinHeap`

A small static binary min-heap helper used internally by the path generator.

```ts
class MinHeap {
    static push<T>(
        arr: T[],
        x: T,
        less: (a: T, b: T) => boolean,
    ): void;

    static pop<T>(
        arr: T[],
        less: (a: T, b: T) => boolean,
    ): T | undefined;
}
```

`MinHeap` operates directly on a normal JavaScript array. The `less` callback defines the heap ordering.

```js
import { MinHeap } from "yen-ksp";

const heap = [];

const less = (a, b) => a.cost < b.cost;

MinHeap.push(heap, { cost: 3, value: "c" }, less);
MinHeap.push(heap, { cost: 1, value: "a" }, less);
MinHeap.push(heap, { cost: 2, value: "b" }, less);

console.log(MinHeap.pop(heap, less));
// { cost: 1, value: "a" }

console.log(MinHeap.pop(heap, less));
// { cost: 2, value: "b" }
```

For TypeScript:

```ts
import { MinHeap } from "yen-ksp";

type Item = {
    cost: number;
    value: string;
};

const heap: Item[] = [];

const less = (a: Item, b: Item): boolean => a.cost < b.cost;

MinHeap.push(heap, { cost: 3, value: "c" }, less);
MinHeap.push(heap, { cost: 1, value: "a" }, less);

const first = MinHeap.pop(heap, less);
```


## TypeScript

The package includes TypeScript declarations.

```ts
import {
    breadth_first_search,
    yen_ksp_wrapper,
} from "yen-ksp";

const adjacency: readonly (readonly number[])[] = [
    [1, 2],
    [3],
    [3],
    [],
];

const paths = [...yen_ksp_wrapper(
    0,
    3,
    breadth_first_search,
    adjacency,
)];
```

## Notes

* Graphs are directed.
* Nodes are numeric indices.
* The default `breadth_first_search` is for unweighted graphs.
* Paths are simple: a yielded path does not repeat nodes.
* Path cost is the number of edges when using `breadth_first_search`.
* Results are yielded in nondecreasing path length order.
* Iteration is lazy, so you can stop after the first `K` paths.

## License

MIT
