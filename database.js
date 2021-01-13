const mysql = require('mysql');

    var mysqlConnection = mysql.createConnection({
        user: 'root',
        password: '',
        database: 'test',
        host: 'localhost'
    });

    mysqlConnection.connect((err) => {
        if (!err) {
            console.log('DB connection succeeded. ');
        } else {
            console.log('DB connection failed');
        }
    });

    module.exports = mysqlConnection;