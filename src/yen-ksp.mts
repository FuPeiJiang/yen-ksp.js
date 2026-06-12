function breadth_first_search(
    start_node_index: number,
    end_node_index: number | undefined,
    offsets: Int32Array,
    edges: Int32Array,
    excluded_first_hops: number[],
    parent: Int32Array,
    edge_indices: Int32Array,
    search_stack: Int32Array,
    visited: Int32Array,
    visited_id: number
) {
    let search_stack_push_index = 0

    for (let i = 0; i < excluded_first_hops.length; ++i) {
        visited[excluded_first_hops[i]] = visited_id
    }

    for (let i = offsets[start_node_index], end = offsets[start_node_index + 1]; i < end; ++i) {
        const node_index = edges[i]
        const num = visited[node_index]
        if (num === visited_id) {
            continue
        }
        parent[node_index] = start_node_index
        edge_indices[node_index] = i
        if (num === -1) {
            return node_index
        }
        visited[node_index] = visited_id
        search_stack[search_stack_push_index] = node_index
        ++search_stack_push_index
    }

    for (let i = 0; i < excluded_first_hops.length; ++i) {
        visited[excluded_first_hops[i]] = 0
    }

    if (end_node_index !== undefined) {
        visited[end_node_index] = -1
    }

    visited[start_node_index] = visited_id
    for (let search_stack_curr_index = 0; search_stack_curr_index < search_stack_push_index; ++search_stack_curr_index) {
        const current_node_index = search_stack[search_stack_curr_index]
        for (let i = offsets[current_node_index], end = offsets[current_node_index + 1]; i < end; ++i) {
            const node_index = edges[i]
            const num = visited[node_index]
            if (num === visited_id) {
                continue
            }
            parent[node_index] = current_node_index
            edge_indices[node_index] = i
            if (num === -1) {
                return node_index
            }
            visited[node_index] = visited_id
            search_stack[search_stack_push_index] = node_index
            ++search_stack_push_index
        }
    }
    return -1;
}

type graph_t = {
    offsets: Int32Array,
    edges: Int32Array,
}

function get_parent_array(index: number, start_node_index: number, parent: Int32Array, edge_indices: Int32Array) {
    const parent_array = []
    const edges_array = []

    do {
        parent_array.push(index)
        edges_array.push(edge_indices[index])
    } while ((index = parent[index]) !== start_node_index)

    parent_array.push(start_node_index)

    return { parent_array, edges_array }
}

function inc_visited_id(visited_id: number, visited: Int32Array, end_node_index?: number) {
    if (visited_id < 0x3fffffff) {
        ++visited_id
        return visited_id
    }
    visited.fill(0)
    if (end_node_index !== undefined) {
        visited[end_node_index] = -1
    }
    // visited.forEach((x, i) => visited[i] &= x >> 31) // preserve -1, and negatives
    visited_id = 1
    return visited_id
}

class Bucket_Ascending_Only_Priority_Queue<T> {
    buckets: T[][] = []
    min_priority: number = 0
    min_priority_index: number = -1

    push(priority: number, x: T) {
        const buckets = this.buckets
        while (priority >= buckets.length) {
            buckets.push([])
        }
        if (buckets[priority] === undefined) {
            debugger
        }
        buckets[priority].push(x)
    }

    pop(): T | undefined {
        const buckets = this.buckets
        let {min_priority, min_priority_index} = this

        while (true) {
            if (min_priority >= buckets.length) {
                this.min_priority_index = min_priority_index
                return undefined
            }
            const bucket = buckets[min_priority]
            ++min_priority_index
            if (min_priority_index < bucket.length) {
                this.min_priority_index = min_priority_index
                return bucket[min_priority_index]
            }
            buckets[min_priority] = undefined!
            ++min_priority
            this.min_priority = min_priority
            min_priority_index = -1
        }

    }
}

type Path = {
    nodes: number[];
    edges: number[];
}

function* yen_ksp_unweighted_paths(
    offsets: Int32Array,
    edges: Int32Array,
    visited: Int32Array,
    parent: Int32Array,
    edge_indices: Int32Array,
    search_stack: Int32Array,
    state: {visited_id: number},
    start_node_index: number,
    end_node_indices: number[]
): Generator<Path, void, unknown> {

    let { visited_id } = state
    visited_id = inc_visited_id(visited_id, visited)

    for (let i = 0; i < end_node_indices.length; ++i) {
        visited[end_node_indices[i]] = -1
    }

    if (visited[start_node_index] === -1) {
        for (let i = 0; i < end_node_indices.length; ++i) {
            visited[end_node_indices[i]] = 0
        }
        state.visited_id = visited_id
        yield { nodes: [start_node_index], edges: [] }
        return
    }

    const tail_index = breadth_first_search(
        start_node_index,
        undefined,
        offsets,
        edges,
        [],
        parent,
        edge_indices,
        search_stack,
        visited,
        visited_id
    )

    if (tail_index === -1) {
        for (let i = 0; i < end_node_indices.length; ++i) {
            visited[end_node_indices[i]] = 0
        }
        state.visited_id = visited_id
        return
    }

    let { parent_array: curr_A, edges_array: curr_edges_array } = get_parent_array(tail_index, start_node_index, parent, edge_indices)

    curr_A.reverse()
    curr_edges_array.reverse()

    for (let i = 0; i < end_node_indices.length; ++i) {
        visited[end_node_indices[i]] = 0
    }
    state.visited_id = visited_id
    yield { nodes: curr_A, edges: curr_edges_array }
    visited_id = state.visited_id

    type bucket_entry_t = {
        curr_A: number[],
        curr_edges_array: number[],
        curr_B: number[],
        curr_B_edges_array: number[],
        i: number,
        excluded_first_hops: number[],
        new_curr_A: number[] | undefined,
        new_curr_edges_array: number[] | undefined,
    }

    const buckets_priority_queue = new Bucket_Ascending_Only_Priority_Queue<bucket_entry_t>()
    function materialize_bucket_entry(bucket_entry: bucket_entry_t) {
        const { curr_A: branched_A, curr_edges_array: branched_edges_array, curr_B, curr_B_edges_array, i } = bucket_entry
        const new_curr_A = branched_A.slice(0, i)
        new_curr_A.push(...curr_B.reverse())
        bucket_entry.new_curr_A = new_curr_A

        const new_curr_edges_array = branched_edges_array.slice(0, i)
        new_curr_edges_array.push(...curr_B_edges_array.reverse())
        bucket_entry.new_curr_edges_array = new_curr_edges_array
    }
    let curr_excluded_first_hops: number[] = []

    let startingI = 0
    let curr_min_length = curr_A.length

    while (true) {
        // curr_A always longer than length=1 since length=1 is checked at start, and length is only increasing
        visited[tail_index] = -1
        for (let i = startingI, excluded_first_hops = curr_excluded_first_hops, endI = curr_A.length - 1; i < endI; ++i) {
            excluded_first_hops.push(curr_A[i+1])

            visited_id = inc_visited_id(visited_id, visited, tail_index)

            for (let j = 0; j < i; ++j) {
                visited[curr_A[j]] = visited_id
            }

            const B_index = breadth_first_search(
                curr_A[i],
                tail_index,
                offsets,
                edges,
                excluded_first_hops,
                parent,
                edge_indices,
                search_stack,
                visited,
                visited_id
            )

            if (B_index !== -1) {
                const { parent_array: curr_B, edges_array: curr_B_edges_array } = get_parent_array(B_index, curr_A[i], parent, edge_indices)

                const len = curr_B.length + i

                const bucket_entry = {
                    curr_A,
                    curr_edges_array,
                    curr_B,
                    curr_B_edges_array,
                    i,
                    excluded_first_hops,
                    new_curr_A: undefined,
                    new_curr_edges_array: undefined
                }

                if (len === curr_min_length) {
                    materialize_bucket_entry(bucket_entry)
                    visited[tail_index] = 0
                    state.visited_id = visited_id
                    yield { nodes: bucket_entry.new_curr_A!, edges: bucket_entry.new_curr_edges_array! }
                    visited_id = state.visited_id
                }

                buckets_priority_queue.push(len, bucket_entry)

            }

            excluded_first_hops = []
        }

        {
            const bucket_entry = buckets_priority_queue.pop()

            if (!bucket_entry) {
                visited[tail_index] = 0
                state.visited_id = visited_id
                return
            }

            if (buckets_priority_queue.min_priority > curr_min_length) {
                curr_min_length = buckets_priority_queue.min_priority
                const bucket = buckets_priority_queue.buckets[curr_min_length]
                visited[tail_index] = 0
                state.visited_id = visited_id
                for (let j = 0; j < bucket.length; ++j) {
                    const bucket_entry = bucket[j]
                    materialize_bucket_entry(bucket_entry)
                    yield { nodes: bucket_entry.new_curr_A!, edges: bucket_entry.new_curr_edges_array! }
                }
                visited_id = state.visited_id
            }

            startingI = bucket_entry.i
            curr_A = bucket_entry.new_curr_A!
            curr_edges_array = bucket_entry.new_curr_edges_array!

            curr_excluded_first_hops = bucket_entry.excluded_first_hops
        }
    }

}

export function yen_ksp_unweighted({ offsets, edges }: graph_t) {
    const node_count = offsets.length - 1

    const visited = new Int32Array(node_count)
    const parent = new Int32Array(node_count)
    const edge_indices = new Int32Array(node_count)
    const search_stack = new Int32Array(node_count)

    const state = {
        visited_id: 0,
    }

    // function find_paths()
    return (start_node_index: number, end_node_indices: number[]) => yen_ksp_unweighted_paths(
        offsets,
        edges,
        visited,
        parent,
        edge_indices,
        search_stack,
        state,
        start_node_index,
        end_node_indices
    )
}

export function make_csr_graph_unweighted(
    adjacency: readonly (readonly number[])[],
    edge_count?: number,
): graph_t {
    const node_count = adjacency.length

    if (edge_count === undefined) {
        edge_count = 0

        for (let node_index = 0; node_index < node_count; ++node_index) {
            edge_count += adjacency[node_index].length
        }
    }

    const offsets = new Int32Array(node_count + 1)
    const edges = new Int32Array(edge_count)

    let curr_edge_index = 0

    for (let node_index = 0; node_index < node_count; ++node_index) {
        offsets[node_index] = curr_edge_index

        const neighbors = adjacency[node_index]

        for (let i = 0, n = neighbors.length; i < n; ++i) {
            edges[curr_edge_index] = neighbors[i]
            ++curr_edge_index
        }
    }

    offsets[node_count] = curr_edge_index

    if (curr_edge_index !== edge_count) {
        throw new Error(`edge_count mismatch: expected ${edge_count}, got ${curr_edge_index}`)
    }

    return { offsets, edges }
}