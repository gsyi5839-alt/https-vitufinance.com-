let dbQuery = null;

function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

function getDbQuery() {
    return dbQuery;
}

function getBeijingDateString(date = new Date()) {
    const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const beijingMs = utcMs + (8 * 60 * 60 * 1000);
    return new Date(beijingMs).toISOString().slice(0, 10);
}

export {
    setDbQuery,
    getDbQuery,
    getBeijingDateString
};
