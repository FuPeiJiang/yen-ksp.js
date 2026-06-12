import assert from "node:assert/strict";
import test from "node:test";

import {
    assert_valid_path,
    make_path_finder,
    type Adjacency,
} from "./helpers.mts";

test("yen_ksp_unweighted builds a reusable finder for a CSR graph", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [3],
        [3],
        [],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [3])];

    for (const path of paths) {
        assert_valid_path(graph, path, 0, 3);
    }

    assert.deepEqual(
        paths.map(path => path.nodes),
        [
            [0, 1, 3],
            [0, 2, 3],
        ],
    );

    assert.deepEqual(
        paths.map(path => path.edges),
        [
            [0, 2],
            [1, 3],
        ],
    );
});

test("finder state can be reused across separate searches", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [3],
        [3, 4],
        [],
        [3],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);

    const first = [...find_paths(0, [3])];
    const second = [...find_paths(2, [3])];

    for (const path of first) {
        assert_valid_path(graph, path, 0, 3);
    }

    for (const path of second) {
        assert_valid_path(graph, path, 2, 3);
    }

    assert.deepEqual(
        first.map(path => path.nodes),
        [
            [0, 1, 3],
            [0, 2, 3],
            [0, 2, 4, 3],
        ],
    );
    assert.deepEqual(
        second.map(path => path.nodes),
        [
            [2, 3],
            [2, 4, 3],
        ],
    );
});
