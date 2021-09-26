/**
 * run jobs
 */
process.chdir(__dirname);

const crypto = require('crypto');
const {spawn} = require('child_process');
const Convert = require('ansi-to-html');
const convert = new Convert();

const db = require('./dist/db').db('./tasks.db');

/**
 * create the database
 */
(async () => {

    await db.run(`CREATE TABLE IF NOT EXISTS commands(

      id VARCHAR NOT NULL PRIMARY KEY,
      state VARCHAR  not null check (state in ('PENDING', 'STARTED', 'FINISH')),
      status_code INTEGER,
      value VARCHAR NOT NULL,
      created VARCHAR NOT NULL,
      started VARCHAR NULL
) `);

    await db.run(`CREATE TABLE IF NOT EXISTS logs(

      id VARCHAR NOT NULL PRIMARY KEY,
      task VARCHAR NOT NULL,
      state INTEGER  not null check (state in (0, 1)),
      message VARCHAR NOT NULL,
      created VARCHAR NOT NULL
) `);
})();

/**
 * log job progress
 * @param {string} key
 * @param {string} task
 * @return {Promise<void>}
 */
async function log(key, task) {

    const md5sum = crypto.createHash('md5');

    md5sum.update(`${key}.${task}.${crypto
        .randomBytes(16).toString('hex')}`);

    await db.run(`INSERT INTO logs (

              id,
              task,
              state,
              message,
              created
        ) VALUES(?, ?, ?, ?, ?)`,
        md5sum.digest('hex'), key, 0, task, Date.now());
}

/**
 * cron
 */
setInterval(async function () {

    const row = await db.get("SELECT id, value FROM commands WHERE state = 'PENDING' LIMIT 1");

    if (!row) {

        return
    }

    const cmd = JSON.parse(row.value);

    await db.run(`UPDATE commands SET state = ?, started = ? WHERE id = ?`,
        'STARTED', Date.now(), row.id);

    console.log(`Job received [${row.id}]: ${cmd.exe} ${cmd.args.join(' ')}`)

    const childProcess = spawn(cmd.exe, cmd.args, {
        env: process.env,
        cwd: '..'
    });

    childProcess.stdout.on('data', (data) => {

        console.log(`[Out][${row.id}]: ${data.toString()}`)
        log(row.id, convert.toHtml(data.toString()).replace(/\n/g, '<br>'));
        console.log(data.toString())
    });

    childProcess.stderr.on('data', (data) => {

        console.log(`[Err][${row.id}]: ${data.toString()}`)
        log(row.id, convert.toHtml(data.toString()).replace(/\n/g, '<br>'));
    });

    childProcess.on('close', async (code) => {

        await db.run(`UPDATE commands SET state = ?, status_code = ? WHERE id = ?`,
            'FINISH', code, row.id);

        const { exec } = require('child_process');
        exec(`cd ../output/; [ -f 'archive.tar.gz' ] && rm archive.tar.gz; tar -czvf archive.tar.gz *.*`, (error, stdout, stderr) => {

            if (stdout) {

                console.log(`stdout: ${stdout}`);
            }

            if (stderr) {

                console.error(`stderr: ${stderr}`);
            }

            if (error) {
                console.error(`exec error: ${error}`);
            }

            console.log(`Job [${row.id}]: ended`);
        });
    });

}, 1500);