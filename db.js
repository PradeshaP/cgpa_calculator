const oracledb = require('oracledb');

const dbConfig = {
    user: "system",
    password: "Kpsr",
    connectString: "localhost/XEPDB1"
};
async function getConnection() {
    return await oracledb.getConnection(dbConfig);
}
module.exports = getConnection;
