import assert from "node:assert/strict";
import test from "node:test";

import {
    assert_valid_path,
    brute_force_simple_paths,
    make_path_finder,
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

test("graph with cycles returns simple paths", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [2, 3],
        [1, 3],
        [],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [3])];

    for (const path of paths) {
        assert_valid_path(graph, path, 0, 3);
    }

    const actual = new Set(paths.map(path_key));
    const expected = new Set(
        brute_force_simple_paths(adjacency, 0, 3).map(path_key),
    );

    assert.deepEqual(actual, expected);
});

test("self-loop does not repeat the same path forever", () => {
    const adjacency: Adjacency = [
        [0, 1],
        [2],
        [],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = find_paths(0, [2]).take(10).toArray();

    for (const path of paths) {
        assert_valid_path(graph, path, 0, 2);
    }

    assert.equal(new Set(paths.map(path_key)).size, paths.length);
    assert.deepEqual(
        paths.map(path => path.nodes),
        [
            [0, 1, 2],
        ],
    );
});

test("no path yields no paths", () => {
    const adjacency: Adjacency = [
        [1],
        [],
        [3],
        [],
    ];

    const { find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [3])];

    assert.deepEqual(paths, []);
});

test("start endpoint yields the zero-length path", () => {
    const adjacency: Adjacency = [
        [1],
        [],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const paths = [...find_paths(0, [0])];

    assert.deepEqual(paths, [
        {
            nodes: [0],
            edges: [],
        },
    ]);
    assert_valid_path(graph, paths[0], 0, 0);
});

test("K can be taken by breaking iteration", () => {
    const adjacency: Adjacency = [
        [1, 2, 3],
        [4],
        [4],
        [4],
        [],
    ];

    const { graph, find_paths } = make_path_finder(adjacency);
    const first_two: Path[] = [];

    for (const path of find_paths(0, [4])) {
        first_two.push(path);
        if (first_two.length === 2) break;
    }

    assert.equal(first_two.length, 2);

    for (const path of first_two) {
        assert_valid_path(graph, path, 0, 4);
    }
});
