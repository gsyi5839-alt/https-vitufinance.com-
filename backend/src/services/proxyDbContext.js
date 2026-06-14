let dbQuery = null;

export function setDbQuery(queryFn) {
    dbQuery = queryFn;
    console.log('[ProxyRoutes] Database query function initialized');
}

export function getDbQuery() {
    if (!dbQuery) {
        throw new Error('[ProxyRoutes] Database query not set');
    }
    return dbQuery;
}
