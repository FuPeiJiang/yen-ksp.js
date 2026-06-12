import assert from "node:assert/strict";
import test from "node:test";

import * as yenKsp from "yen-ksp";

test("package exports are usable", () => {
    assert.deepEqual(
        Object.keys(yenKsp).sort(),
        [
            "make_csr_graph_unweighted",
            "yen_ksp_unweighted",
        ],
    );

    assert.equal(typeof yenKsp.make_csr_graph_unweighted, "function");
    assert.equal(typeof yenKsp.yen_ksp_unweighted, "function");
});
