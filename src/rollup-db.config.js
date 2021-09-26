import {terser} from "rollup-plugin-terser";

export default {
    input: 'lib/db.js',
    output: [{
        file: './dist/db.js',
        name: 'critical',
        format: 'umd',
    },
        {
            file: './dist/db.min.js',
            plugins: [terser()],
            name: 'critical',
            format: 'umd'
        }]
}