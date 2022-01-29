const express = require('express');
const {resolve} = require("path");
const router = express.Router();

/* GET home page. */
router.get('/', async function (req, res, next) {
    res.render('index', {title: 'Critical path generator'});
});

// create job
// jobs are run through ./jobs.js
router.post('/', async (req, res, next) => {

    const db = require('../dist/db').db('./tasks.db');
    const shellescape = require('shell-escape');
    const crypto = require('crypto');
    const md5sum = crypto.createHash('md5');
    const cmd = {
        exe: 'node',
        args: ['./bin/critical-cli.js'].
            concat(req.body.urls.map(url => shellescape([url]))).
            concat(!req.body.screenshot ? ['--screenshot=no'] : ['--screenshot']).
            concat(!req.body.secure ? ['--secure=no'] : ['--secure']).
            concat(!req.body.fonts ? ['--fonts=no'] : ['--fonts']).
        concat(!req.body.html ? ['--html=no'] : ['--html']).
            concat((req.body.dimensions || []).map(dimension => '--dimensions=' + shellescape([dimension])))
    };

    console.log(process.cwd());
    console.log(`${cmd.exe} ${cmd.args.join(' ')}`)
    md5sum.update(`${cmd.exe} ${cmd.args.join(' ')}_${Date.now()}`);

    const key = md5sum.digest('hex');

    res.writeHead(200, {
        'Content-Type': 'application/json'
    });

    await db.run(`INSERT INTO commands(
          id,
          state,
          value,
          created
        ) VALUES (?, ?, ?, ?)`,
        key, 'PENDING', JSON.stringify(cmd), Date.now()
    );

    res.write(JSON.stringify({key}));
    db.close();
    res.end();
});

// get jobs progress
router.post('/poll', async (req, res, next) => {

    const db = require('../dist/db').db('./tasks.db');

    const rows = [];
    const result = {message: []};
    const records = await db.all(`SELECT id, message FROM logs WHERE state = 0 and task = ?`, req.body.key);

    res.writeHead(200, {
        'Content-Type': 'application/json'
    });

    records.forEach(record => {

        result.message.push(record.message);
        rows.push(record.id);
    });

    if (rows.length > 0) {

        await db.all(`UPDATE logs SET state = 1 WHERE id IN (${rows.map(row => '?')})`, rows);
        res.write(JSON.stringify(result));
        db.close();

        res.end();
    } else {

        const record = await db.get(`SELECT state, status_code FROM commands WHERE id = ?`, req.body.key);

        res.write(JSON.stringify(record && record.state == 'FINISH' ? {
            complete: 1,
            code: record.status_code
        } : result));
        db.close();

        // create archive
        res.end();
    }
});

module.exports = router;