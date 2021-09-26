const sqlite3 = require('sqlite3').verbose();

/**
 * Promisify database calls.
 * - any provided callback will be discarded.
 * - statements, parallelize and serialize mode are not supported (or needed? :) )
 * - db.each will only return the first record, use db.get or db.all instead
 *
 * const db = require('./dist/db').db('./storage/database.db');
 * const result = await db.run(sql, params);
 *
 * @return {Proxy<sqlite3.Database>}
 * @param {string} file
 * @param {string=} mode
 * @param {callback=} cb
 */
export function db (file, mode, cb) {

    const db = new sqlite3.Database(file, mode, cb);

    return new Proxy(db, {

        get: function (target, key) {

            if (typeof target[key] == 'function') {

                return function (...args) {

                    return new Promise(function (resolve, reject) {

                        if (['configure', 'close'].includes(key)) {

                            resolve(target[key].apply(target, args));
                            return;
                        }

                        // remove any callback
                        if (typeof args[args.length - 1] == 'function') {

                            args.pop()
                        }

                        args.push(function (error, result) {

                            if (error) {

                                reject(error)
                            }

                            else {

                                resolve(result);
                            }
                        })

                        target[key].apply(target, args);
                    });
                }
            }

            return target[key];
        }
    })
}