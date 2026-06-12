import assert from "node:assert/strict";
import test from "node:test";

import {
    breadth_first_search,
    yen_ksp_wrapper,
} from "../dist/yen-ksp.mjs";

import type { Adjacency } from "./helpers.mts";

test("yen_ksp_wrapper builds CSR and state automatically", () => {
    const adjacency: Adjacency = [
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
            [0, 0],
            [1, 0],
        ],
    );
});