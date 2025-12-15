import { mockDB } from "./mock-db-store";

class MockQueryBuilder {
    tableName: string;
    filters: ((item: any) => boolean)[] = [];
    sorts: ((a: any, b: any) => number)[] = [];
    _limit: number | null = null;
    _single: boolean = false;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    select(columns: string = '*') {
        // In this mock, we always return all columns effectively, 
        // unless we wanted to actually filter keys.
        // For simplicity, we ignore the columns argument and return full objects.
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push((item) => item[column] == value); // loose equality for string/number mix
        return this;
    }

    neq(column: string, value: any) {
        this.filters.push((item) => item[column] != value);
        return this;
    }

    in(column: string, values: any[]) {
        this.filters.push((item) => values.includes(item[column]));
        return this;
    }

    ilike(column: string, value: string) {
        // Simple case-insensitive match implementation
        const regex = new RegExp(value.replace(/%/g, '.*'), 'i');
        this.filters.push((item) => regex.test(item[column]));
        return this;
    }

    order(column: string, { ascending = true } = {}) {
        this.sorts.push((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
        });
        return this;
    }

    limit(count: number) {
        this._limit = count;
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    async then(resolve: (data: { data: any, error: any }) => void, reject?: (reason: any) => void) {
        // Execute query
        let data = mockDB.getTable(this.tableName);

        // Apply filters
        for (const filter of this.filters) {
            data = data.filter(filter);
        }

        // Apply sorts
        for (const sort of this.sorts) {
            data.sort(sort);
        }

        // Apply limit
        if (this._limit !== null) {
            data = data.slice(0, this._limit);
        }

        // Handle single
        if (this._single) {
            if (data.length === 0) {
                resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
            } else {
                resolve({ data: data[0], error: null });
            }
        } else {
            // Just resolve the array
            resolve({ data, error: null });
        }
    }

    // Action methods return a Promise-like result
    async insert(data: any) {
        try {
            const newItem = mockDB.insert(this.tableName, data);
            return { data: newItem, error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    async update(updates: any) {
        // This is tricky because usually update comes AFTER filters.
        // In Supabase js: .update(payload).eq('id', 1)

        // We need to defer execution until 'then' is called or handle it differently.
        // But typically simpler mocks suffice.
        // Let's change the pattern: we return a special UpdateBuilder or chain logic.
        // For simplicity, we'll store the updates and apply them at the end (when 'then' is called ideally, 
        // but in JS, .update() returns a builder that IS awaitable).

        // Actually, update() returns the builder.
        // So we need to store 'pendingUpdate' in this builder.
        this._pendingUpdate = updates;
        return this;
    }

    _pendingUpdate: any = null;
    _pendingDelete: boolean = false;

    delete() {
        this._pendingDelete = true;
        return this;
    }
}

// Monkey-patching `then` for Update/Delete scenarios
// The standard `then` above was for SELECTs. 
// We need to make sure `then` handles update/delete/select logic appropriately.
// Let's redefine `then` to be smarter.

MockQueryBuilder.prototype.then = async function (resolve: (result: { data: any, error: any }) => void) {
    await new Promise(r => setTimeout(r, 50)); // Tiny delay to simulate async

    let data = mockDB.getTable(this.tableName);
    let originalData = data; // Reference to array to find indices

    // Filter logic to find TARGETS
    // We must find the EXACT objects in the store to mutate them.
    let targets = data.filter(item => {
        return this.filters.every(f => f(item));
    });

    if (this._pendingDelete) {
        // DELETE
        targets.forEach(t => {
            mockDB.delete(this.tableName, t.id);
        });
        resolve({ data: null, error: null });
        return;
    }

    if (this._pendingUpdate) {
        // UPDATE
        targets.forEach(t => {
            mockDB.update(this.tableName, t.id, this._pendingUpdate);
        });
        resolve({ data: null, error: null }); // In real SB update can return data if .select() is chained but usually void
        return;
    }

    // SELECT (default)
    // Re-apply filters on fresh data just in case
    let result = data.filter(item => {
        return this.filters.every(f => f(item));
    });

    // Sort
    for (const sort of this.sorts) {
        result.sort(sort);
    }

    // Single
    if (this._single) {
        if (result.length === 0) {
            resolve({ data: null, error: { message: "Row not found", code: "PGRST116" } });
        } else {
            resolve({ data: result[0], error: null });
        }
    } else {
        resolve({ data: result, error: null });
    }
};


export const createMockClient = () => {
    return {
        from: (table: string) => new MockQueryBuilder(table),
        channel: (name: string) => ({
            on: (event: string, config: any, callback: Function) => ({
                subscribe: () => {
                    console.log(`Subscribed to channel ${name}`);
                    return {
                        unsubscribe: () => console.log(`Unsubscribed from ${name}`)
                    };
                }
            }),
            subscribe: () => { }
        }),
        removeChannel: (channel: any) => {
            if (channel && channel.unsubscribe) channel.unsubscribe();
        }
    };
};
