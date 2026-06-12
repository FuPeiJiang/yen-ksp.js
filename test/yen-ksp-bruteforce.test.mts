import assert from "node:assert/strict";
import test from "node:test";

import {
    assert_valid_path,
    brute_force_simple_paths,
    make_path_finder,
    path_key,
} from "./helpers.mts";

import type {
    Adjacency,
    Path,
} from "./helpers.mts";

function make_rng(seed: number): () => number {
    let x = seed >>> 0;

    return function rng(): number {
        x = Math.imul(x, 1664525) + 1013904223;
        return (x >>> 0) / 0x100000000;
    };
}

function random_graph(
    seed: number,
    node_count: number,
    edge_probability: number,
): Adjacency {
    const rng = make_rng(seed);
    const adjacency: number[][] = Array.from(
        { length: node_count },
        (): number[] => [],
    );

    for (let from = 0; from < node_count; ++from) {
        for (let to = 0; to < node_count; ++to) {
            if (from === to) continue;

            if (rng() < edge_probability) {
                adjacency[from].push(to);
            }
        }
    }

    return adjacency;
}

function cost(path: Path): number {
    return path.edges.length;
}

function assert_nondecreasing_cost(paths: readonly Path[]): void {
    for (let i = 1; i < paths.length; ++i) {
        assert.ok(
            cost(paths[i - 1]) <= cost(paths[i]),
            `paths not yielded in nondecreasing cost order at index ${i}`,
        );
    }
}

test("fixed cyclic graph matches brute force", () => {
    const adjacency: Adjacency = [
        [1, 2],
        [2, 3],
        [1, 3],
        [],
    ];

    const start = 0;
    const end = 3;
    const expected = brute_force_simple_paths(adjacency, start, end);
    const { graph, find_paths } = make_path_finder(adjacency);
    const actual = [...find_paths(start, [end])];

    for (const path of actual) {
        assert_valid_path(graph, path, start, end);
    }

    assert_nondecreasing_cost(actual);

    assert.deepEqual(
        new Set(actual.map(path_key)),
        new Set(expected.map(path_key)),
    );
});

test("random small graphs match brute force", () => {
    for (let seed = 1; seed <= 1000; ++seed) {
        const node_count = 2 + (seed % 6); // 2..7 nodes
        const adjacency = random_graph(seed, node_count, 0.3);

        const start = 0;
        const end = node_count - 1;

        const expected = brute_force_simple_paths(adjacency, start, end);

        // Dense small cyclic graphs can have many simple paths.
        // This keeps the test fast and readable.
        if (expected.length > 300) {
            continue;
        }

        const { graph, find_paths } = make_path_finder(adjacency);
        const actual = [...find_paths(start, [end])];

        for (const path of actual) {
            assert_valid_path(graph, path, start, end);
        }

        assert_nondecreasing_cost(actual);

        assert.deepEqual(
            new Set(actual.map(path_key)),
            new Set(expected.map(path_key)),
            `seed ${seed} produced different paths`,
        );
    }
});
