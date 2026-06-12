import test from "node:test"
import assert from "node:assert/strict"

// Adjust this import path to your project.
import {
    make_csr_graph_unweighted,
    yen_ksp_unweighted,
} from "../dist/yen-ksp.mjs"

type Path = {
    nodes: number[]
    edges: number[]
}

function snapshot(path: Path): Path {
    return {
        nodes: [...path.nodes],
        edges: [...path.edges],
    }
}

function collect(iter: Generator<Path, void, unknown>): Path[] {
    const out: Path[] = []

    for (const path of iter) {
        out.push(snapshot(path))
    }

    return out
}

test("two generators from the same finder can be interleaved", () => {
    const adjacency = [
        [1, 2, 3],      // 0
        [4, 5, 2],      // 1
        [4, 5, 3],      // 2
        [5],            // 3
        [6, 7],         // 4
        [6, 7],         // 5
        [8],            // 6
        [8],            // 7
        [],             // 8
        [1, 2, 10],     // 9
        [4, 5, 11],     // 10
        [7, 8],         // 11
    ]

    const graph = make_csr_graph_unweighted(adjacency)

    // Baselines use fresh solver state.
    const baselineA = collect(yen_ksp_unweighted(graph)(0, [8]))
    const baselineB = collect(yen_ksp_unweighted(graph)(9, [6]))

    assert.ok(baselineA.length > 1)
    assert.ok(baselineB.length > 1)

    const find = yen_ksp_unweighted(graph)

    const a = find(0, [8])
    const b = find(9, [6])

    const outA: Path[] = []

    // The exact pattern I claimed was risky:
    const firstA = a.next()
    assert.equal(firstA.done, false)
    outA.push(snapshot(firstA.value))

    const outB = collect(b)

    outA.push(...collect(a))

    assert.deepStrictEqual(outA, baselineA)
    assert.deepStrictEqual(outB, baselineB)
})

test("two generators from the same finder can be strictly alternated", () => {
    const adjacency = [
        [1, 2, 3],
        [4, 5, 2],
        [4, 5, 3],
        [5],
        [6, 7],
        [6, 7],
        [8],
        [8],
        [],
        [1, 2, 10],
        [4, 5, 11],
        [7, 8],
    ]

    const graph = make_csr_graph_unweighted(adjacency)

    const baselineA = collect(yen_ksp_unweighted(graph)(0, [8]))
    const baselineB = collect(yen_ksp_unweighted(graph)(9, [6]))

    const find = yen_ksp_unweighted(graph)

    const a = find(0, [8])
    const b = find(9, [6])

    const outA: Path[] = []
    const outB: Path[] = []

    let doneA = false
    let doneB = false

    while (!doneA || !doneB) {
        if (!doneA) {
            const result = a.next()
            doneA = result.done === true

            if (!result.done) {
                outA.push(snapshot(result.value))
            }
        }

        if (!doneB) {
            const result = b.next()
            doneB = result.done === true

            if (!result.done) {
                outB.push(snapshot(result.value))
            }
        }
    }

    assert.deepStrictEqual(outA, baselineA)
    assert.deepStrictEqual(outB, baselineB)
})