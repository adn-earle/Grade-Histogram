const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser')
const mysqlConnection = require('./database');
const multer = require('multer');
const csv = require('fast-csv');
const upload = multer({dest: 'files/csv/'})
const app = express();

const port = 8080;

app.use(session({
    secret: 'secretsession',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use("/styles", express.static(__dirname + '/views'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.redirect('login');
});

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', (req, res) => {
    var uname = req.body.username;
    var password = String(req.body.passwd);
    var hash = crypto.createHash('md5').update(password).digest('hex');
    if(uname && password) {
        let sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        mysqlConnection.query(sql, [uname, hash], function(err, result, fields) {
            if (result.length > 0) {
                req.session.loggedin = true;
                req.session.username = uname;
                res.status(200);
                res.redirect('upload');
            }
            else {
                res.status(400);
                res.send('Invalid username or password');
            }
            res.end();
        });
    }
    else {
        res.status(400);
        res.send("Please enter username and password");
        res.end();
    }
});

app.post('/logout', (req, res) => {
    req.session.loggedin = false;
    fs.unlinkSync(__dirname +'/files/json/students.json');
    fs.unlinkSync(__dirname +'/files/json/weights.json');
    res.redirect('login');
})

app.get('/upload', (req, res) => {
    if(req.session.loggedin) {
        res.render('upload');
    } else {
        res.redirect('login');
    }
});


app.post('/upload', upload.single('csvfile'), (req, res) => {
    var students = [];
    var weights = [];
    var valid = false;

    const csvPromise = new Promise( (resolve, reject) => {
        csv.parseFile(req.file.path, {headers: true})
        .on("data", (data) => {
            students.push(data);
        })
        .on("end", () => {
            fs.unlinkSync(req.file.path);
            resolve(students);
        });
    });
    csvPromise.then( () => {
        students.forEach((student, index) => {
            if(student.studentID == 'total') {
                weights = student;
                students.splice(index, 1);
                let total = Number(student.quiz) + Number(student.midterm) + Number(student.final);
                console.log(total);
                if(total == 100) {
                    console.log('CSV is valid')
                    valid = true;
                }
            }
        })
        if(valid) {
            let studjson = JSON.stringify(students);
            let weightjson = JSON.stringify(weights);
            fs.writeFileSync('files/json/students.json', studjson);
            fs.writeFileSync('files/json/weights.json', weightjson)
            res.status(200);
            res.redirect('histogram');
            res.end();
        } else {
            res.status(400);
            console.error("Please submit a valid csv");
            res.end();
        }
    });
});

app.get('/histogram', (req, res) => {
    if(req.session.loggedin) {
        res.render('hist');
    } else {
        res.redirect('login');
    }
})

app.get('/hist_data', (req, res) => {
    fs.readFile('files/json/students.json', 'UTF-8', function(err, data){res.json({data: data})})
})

app.get('/weight_data', (req, res) => {
    fs.readFile('files/json/weights.json', 'UTF-8', function(err, data){res.json({data: data})})
})

app.listen(port, () => console.log('Server listening on port: ' + port));

