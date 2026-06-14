const ipRequestTracker = new Map();
const blockedIPs = new Map();
const whitelistedIPs = new Set([
    '127.0.0.1',
    '::1',
    'localhost'
]);
const ipReputationScores = new Map();
const detectedPatterns = new Map();

let dbQuery = null;

function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

function getDbQuery() {
    return dbQuery;
}

export {
    ipRequestTracker,
    blockedIPs,
    whitelistedIPs,
    ipReputationScores,
    detectedPatterns,
    setDbQuery,
    getDbQuery
};
