import assert from "node:assert/strict";
import test from "node:test";

import {
    breadth_first_search,
    yen_ksp,
    yen_ksp_initialize_state,
    make_csr,
} from "../dist/yen-ksp.mjs";

import {
    assert_valid_path,
    brute_force_simple_paths,
    path_key,
    type Adjacency,
    type Path,
} from "./helpers.mts";

test("diamond graph", () => {
    const adjacency: Adjacency = [
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

    for (const path of paths) {
        assert_valid_path(adjacency, path, 0, 3);
    }

    assert.deepEqual(
        paths.map(path => path.nodes),
        [
            [0, 1, 3],
            [0, 2, 3],
        ],
    );
});

test("graph with cycles returns simple paths", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [2, 3],
        [1, 3],
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

    for (const path of paths) {
        assert_valid_path(adjacency, path, 0, 3);
    }

    const actual = new Set(paths.map(path_key));
    const expected = new Set(
        brute_force_simple_paths(adjacency, 0, 3).map(path_key),
    );

    assert.deepEqual(actual, expected);
});

test("no path yields no paths", () => {
    const adjacency: Adjacency = [
        [1],
        [],
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

    assert.deepEqual(paths, []);
});

test("K can be taken by breaking iteration", () => {
    const adjacency: Adjacency = [
        [1, 2, 3],
        [4],
        [4],
        [4],
        [],
    ];

    const edges = make_csr(adjacency);
    const state = yen_ksp_initialize_state(adjacency.length);

    const first_two: Path[] = [];

    for (const path of yen_ksp(0, 4, breadth_first_search, edges, state)) {
        first_two.push(path);
        if (first_two.length === 2) break;
    }

    assert.equal(first_two.length, 2);

    for (const path of first_two) {
        assert_valid_path(adjacency, path, 0, 4);
    }
});