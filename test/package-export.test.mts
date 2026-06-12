import assert from "node:assert/strict";
import test from "node:test";

import {
    breadth_first_search,
    make_csr,
    yen_ksp,
    yen_ksp_initialize_state,
    yen_ksp_wrapper,
} from "yen-ksp";

test("package exports are usable", () => {
    assert.equal(typeof breadth_first_search, "function");
    assert.equal(typeof make_csr, "function");
    assert.equal(typeof yen_ksp, "function");
    assert.equal(typeof yen_ksp_initialize_state, "function");
    assert.equal(typeof yen_ksp_wrapper, "function");
});