let dbQuery = null;

export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

export function getDbQuery() {
    if (!dbQuery) {
        throw new Error('[RobotRoutes] dbQuery has not been configured');
    }
    return dbQuery;
}

export function isValidWalletAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
}

export function normalizeWalletAddress(address) {
    return address.toLowerCase();
}

export function formatDateTime(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
