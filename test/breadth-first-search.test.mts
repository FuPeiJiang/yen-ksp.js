import assert from "node:assert/strict";
import test from "node:test";

import {
    make_csr_graph_unweighted,
} from "../dist/yen-ksp.mjs";

type Adjacency = number[][];

type State = ReturnType<typeof yen_ksp_initialize_state>;
type CsrEdges = ReturnType<typeof yen_ksp_initialize_state>;

type ExcludedEdgesSetup = (context: {
    excluded_edges: State["excluded_edges"];
    edges: CsrEdges;
    adjacency: Adjacency;
}) => void;

function run_bfs(
    adjacency: Adjacency,
    start: number,
    end: number,
    excluded_edges_setup?: ExcludedEdgesSetup,
) {
    const edges = make_csr(adjacency);
    const state = yen_ksp_initialize_state(adjacency.length);

    const {
        parent,
        edge_indices,
        visited,
        excluded_edges,
        search_stack,
    } = state;

    const visited_id = 1;

    // breadth_first_search uses visited[end] === -1 as the target marker.
    visited[end] = -1;

    // Useful when reconstructing the path.
    parent[start] = -1;

    if (excluded_edges_setup !== undefined) {
        excluded_edges_setup({
            excluded_edges,
            edges,
            adjacency,
        });
    }

    const tail = breadth_first_search(
        start,
        edges,
        excluded_edges,
        edge_indices,
        search_stack,
        parent,
        visited,
        visited_id,
    );

    return {
        tail,
        parent,
        edge_indices,
        visited,
        edges,
        state,
    };
}

function reconstruct_nodes(parent: State["parent"], tail: number): number[] {
    if (tail === -1) return [];

    const nodes: number[] = [];

    for (let node = tail; node !== -1; node = parent[node]) {
        nodes.push(node);
    }

    nodes.reverse();
    return nodes;
}

function reconstruct_edge_indices(
    parent: State["parent"],
    edge_indices: State["edge_indices"],
    tail: number,
): number[] {
    if (tail === -1) return [];

    const out: number[] = [];

    for (let node = tail; parent[node] !== -1; node = parent[node]) {
        out.push(edge_indices[node]);
    }

    out.reverse();
    return out;
}

test("finds direct edge", () => {
    const adjacency: Adjacency = [
        [1],
        [],
    ];

    const result = run_bfs(adjacency, 0, 1);

    assert.equal(result.tail, 1);
    assert.deepEqual(
        reconstruct_nodes(result.parent, result.tail),
        [0, 1],
    );
    assert.deepEqual(
        reconstruct_edge_indices(result.parent, result.edge_indices, result.tail),
        [0],
    );
});

test("finds shortest path in unweighted graph", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [3],
        [4],
        [5],
        [5],
        [],
    ];

    const result = run_bfs(adjacency, 0, 5);

    assert.equal(result.tail, 5);

    const nodes = reconstruct_nodes(result.parent, result.tail);

    // Either [0, 1, 3, 5] or [0, 2, 4, 5] would be length 3,
    // but because adjacency[0] is [1, 2], BFS should discover 1 first.
    assert.deepEqual(nodes, [0, 1, 3, 5]);

    assert.equal(nodes.length - 1, 3);
});

test("returns -1 when no path exists", () => {
    const adjacency: Adjacency = [
        [1],
        [],
        [3],
        [],
    ];

    const result = run_bfs(adjacency, 0, 3);

    assert.equal(result.tail, -1);
    assert.deepEqual(reconstruct_nodes(result.parent, result.tail), []);
});

test("start can reach target through a cycle without looping forever", () => {
    const adjacency: Adjacency = [
        [1],
        [2],
        [1, 3],
        [],
    ];

    const result = run_bfs(adjacency, 0, 3);

    assert.equal(result.tail, 3);
    assert.deepEqual(
        reconstruct_nodes(result.parent, result.tail),
        [0, 1, 2, 3],
    );
});

test("does not revisit already visited nodes", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [2],
        [3],
        [],
    ];

    const result = run_bfs(adjacency, 0, 3);

    assert.equal(result.tail, 3);

    const nodes = reconstruct_nodes(result.parent, result.tail);

    // Shortest path should be 0 -> 2 -> 3, not 0 -> 1 -> 2 -> 3.
    assert.deepEqual(nodes, [0, 2, 3]);
});

test("records local outgoing edge indices", () => {
    const adjacency: Adjacency = [
        [10, 1, 2],
        [3],
        [3],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
    ];

    const result = run_bfs(adjacency, 0, 3);

    assert.equal(result.tail, 3);

    assert.deepEqual(
        reconstruct_nodes(result.parent, result.tail),
        [0, 1, 3],
    );

    // From node 0, edge 0->1 is local outgoing index 1 because adjacency[0] is [10, 1, 2].
    // From node 1, edge 1->3 is local outgoing index 0.
    assert.deepEqual(
        reconstruct_edge_indices(result.parent, result.edge_indices, result.tail),
        [1, 0],
    );
});

test("can reuse arrays with a different visited_id", () => {
    const adjacency: Adjacency = [
        [1],
        [2],
        [3],
        [],
    ];

    const edges = make_csr(adjacency);
    const state = yen_ksp_initialize_state(adjacency.length);

    state.parent[0] = -1;
    state.visited[3] = -1;

    const first_tail = breadth_first_search(
        0,
        edges,
        state.excluded_edges,
        state.edge_indices,
        state.search_stack,
        state.parent,
        state.visited,
        1,
    );

    assert.equal(first_tail, 3);
    assert.deepEqual(
        reconstruct_nodes(state.parent, first_tail),
        [0, 1, 2, 3],
    );

    // Re-mark target, because the first search overwrites visited nodes.
    state.visited[3] = -1;
    state.parent[0] = -1;

    const second_tail = breadth_first_search(
        0,
        edges,
        state.excluded_edges,
        state.edge_indices,
        state.search_stack,
        state.parent,
        state.visited,
        2,
    );

    assert.equal(second_tail, 3);
    assert.deepEqual(
        reconstruct_nodes(state.parent, second_tail),
        [0, 1, 2, 3],
    );
});

test("empty outgoing list returns -1 unless start is specially handled by caller", () => {
    const adjacency: Adjacency = [
        [],
    ];

    const result = run_bfs(adjacency, 0, 0);

    // breadth_first_search does not appear to special-case start === end.
    // If yen_ksp wants start === end to produce [start], it should handle that outside BFS.
    assert.equal(result.tail, -1);
});