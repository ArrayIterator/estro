"use strict";
/*!
 * Benchmark Middleware
 */
const {attach, dispatch} = require("../src/events-manager");

module.exports = function (bootstrap) {
    if (!bootstrap.is_debug() || !bootstrap.is_benchmark()) {
        return;
    }

    // @attach(on.before.server.listen)
    attach('json.response.result', (
        result,
        formatted
    ) => {
        try {
            if (typeof formatted['benchmark'] !== "undefined") {
                return result;
            }
        } catch (err) {
            console.error(err);
            return result;
        }

        let memory = process.memoryUsage(),
            hrTime = process.hrtime.bigint(),
            time = new Date().getTime();

        formatted.benchmark = {
            server: {
                start_time: bootstrap.server_start_time()?.getTime(),
                current_time: time,
                elapsed : {
                    timespan: Math.round(
                        (time - bootstrap.server_start_time()?.getTime())/1000/3600*10000
                    )/10000,
                    unit: 'hour'
                }
            },
            timing: {
                start_time: bootstrap.request_time().getTime(),
                end_time: time,
                processing: {
                    timespan: Number(hrTime - bootstrap.request_hrtime())/1000000,
                    unit: 'millisecond'
                },
            },
            memory: {
                unit: 'MB',
                usage: {
                    rss: Math.round(memory.rss / 1024 / 1024 * 1000) / 1000,
                    heap: Math.round(memory.heapTotal / 1024 / 1024 * 1000) / 1000,
                    used: Math.round(memory.heapUsed / 1024 / 1024 * 1000) / 1000,
                    external: Math.round(memory.external / 1024 / 1024 * 1000) / 1000,
                }
            },
        };

        // @dispatch(json.response.result.benchmark);
        formatted.benchmark = dispatch('json.response.result.benchmark', formatted.benchmark);
        // delete express
        return JSON.stringify(formatted, null, 4);
    });
}
