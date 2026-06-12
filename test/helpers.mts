import assert from "node:assert/strict";

import {
    make_csr_graph_unweighted,
    yen_ksp_unweighted,
} from "../dist/yen-ksp.mjs";

export type Path = {
    nodes: number[];
    edges: number[];
};

export type Adjacency = readonly (readonly number[])[];
export type CsrGraph = ReturnType<typeof make_csr_graph_unweighted>;

export function make_path_finder(adjacency: Adjacency): {
    graph: CsrGraph;
    find_paths: ReturnType<typeof yen_ksp_unweighted>;
} {
    const graph = make_csr_graph_unweighted(adjacency);

    return {
        graph,
        find_paths: yen_ksp_unweighted(graph),
    };
}

export function assert_valid_path(
    graph: CsrGraph,
    path: Path,
    start: number,
    end: number,
): void {
    assert.ok(path.nodes.length > 0, "path must contain at least one node");

    assert.equal(path.nodes[0], start);
    assert.equal(path.nodes[path.nodes.length - 1], end);

    assert.equal(path.edges.length, path.nodes.length - 1);

    const node_count = graph.offsets.length - 1;
    const seen = new Set<number>();

    for (const node of path.nodes) {
        assert.ok(node >= 0 && node < node_count, `node ${node} is out of range`);
        assert.equal(seen.has(node), false, "path must be simple");
        seen.add(node);
    }

    for (let i = 0; i < path.edges.length; ++i) {
        const from = path.nodes[i];
        const to = path.nodes[i + 1];
        const edge_index = path.edges[i];
        const offset = graph.offsets[from];
        const next_offset = graph.offsets[from + 1];

        assert.ok(
            edge_index >= offset && edge_index < next_offset,
            `edge index ${edge_index} is not outgoing from node ${from}`,
        );
        assert.equal(
            graph.edges[edge_index],
            to,
            `bad edge index at path position ${i}`,
        );
    }
}

export function brute_force_simple_paths(
    adjacency: Adjacency,
    start: number,
    end: number,
): Path[] {
    const out: Path[] = [];
    const visited = new Uint8Array(adjacency.length);
    const nodes: number[] = [];
    const edge_indices: number[] = [];

    function dfs(node: number): void {
        visited[node] = 1;
        nodes.push(node);

        if (node === end) {
            out.push({
                nodes: nodes.slice(),
                edges: edge_indices.slice(),
            });
        } else {
            const neighbors = adjacency[node];

            for (let edge_index = 0; edge_index < neighbors.length; ++edge_index) {
                const next = neighbors[edge_index];

                if (visited[next]) continue;

                edge_indices.push(edge_index);
                dfs(next);
                edge_indices.pop();
            }
        }

        nodes.pop();
        visited[node] = 0;
    }

    dfs(start);

    out.sort((a, b) => {
        const cost_diff = a.edges.length - b.edges.length;
        if (cost_diff !== 0) return cost_diff;

        return a.nodes.join(",").localeCompare(b.nodes.join(","));
    });

    return out;
}

export function path_key(path: Path): string {
    return path.nodes.join(",");
}
