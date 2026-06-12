import assert from "node:assert/strict";
import test from "node:test";

import {
    make_csr_graph_unweighted,
    yen_ksp_unweighted,
} from "../dist/yen-ksp.mjs";

import {
    assert_valid_path,
    make_path_finder,
    type Adjacency,
} from "./helpers.mts";

test("make_csr_graph_unweighted builds offsets and flattened edges", () => {
    const graph = make_csr_graph_unweighted([
        [1, 2],
        [],
        [0, 3],
        [1],
    ]);

    assert.deepEqual([...graph.offsets], [0, 2, 2, 4, 5]);
    assert.deepEqual([...graph.edges], [1, 2, 0, 3, 1]);
});

test("make_csr_graph_unweighted honors explicit edge_count", () => {
    const graph = make_csr_graph_unweighted([
        [1],
        [2],
        [],
    ], 2);

    assert.deepEqual([...graph.offsets], [0, 1, 2, 2]);
    assert.deepEqual([...graph.edges], [1, 2]);
});

test("make_csr_graph_unweighted throws when edge_count is too small", () => {
    assert.throws(
        () => make_csr_graph_unweighted([
            [1],
            [2],
            [],
        ], 1),
        /edge_count mismatch/,
    );
});

test("make_csr_graph_unweighted throws when edge_count is too large", () => {
    assert.throws(
        () => make_csr_graph_unweighted([
            [1],
            [],
        ], 2),
        /edge_count mismatch/,
    );
});

test("paths expose absolute CSR edge indices", () => {
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

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [3])];

    assert.deepEqual(paths[0]?.nodes, [0, 1, 3]);
    assert.deepEqual(paths[0]?.edges, [1, 3]);
    assert_valid_path(graph, paths[0], 0, 3);
});

test("multi-endpoint search chooses the nearest reached endpoint", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [3],
        [4],
        [],
        [3],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [3, 4])];

    assert.deepEqual(
        paths.map(path => path.nodes),
        [
            [0, 1, 3],
            [0, 2, 4, 3],
        ],
    );

    for (const path of paths) {
        assert_valid_path(graph, path, 0, 3);
    }
});

test("finder can be created directly from a CSR graph", () => {
    const graph = make_csr_graph_unweighted([
        [1],
        [2],
        [3],
        [],
    ]);
    const find_paths = yen_ksp_unweighted(graph);

    assert.deepEqual(
        [...find_paths(0, [3])].map(path => path.nodes),
        [
            [0, 1, 2, 3],
        ],
    );
});
