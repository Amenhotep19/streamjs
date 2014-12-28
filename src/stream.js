(function (window) {
    "use strict";

    var eop = "END_OF_PIPE",
        ctx = {};

    var Operation = function (fn) {
        this.fn = fn;
        this.buffer = [];

        this.prev = null;
        this.next = null;

        this.advance = function () {
            if (this.buffer.length === 0 && this.prev == null) {
                return eop;
            }

            if (this.buffer.length === 0) {
                return this.prev.advance();
            }

            var obj = this.buffer.shift();
            if (this.next != null) {
                return this.next.pipe(obj);
            }
            return obj;
        };

        this.pipe = function (obj) {
            this.buffer = this.fn.call({}, obj);
            if (this.buffer.length === 0) {
                return this.advance();
            }

            obj = this.buffer.shift();
            if (this.next != null) {
                return this.next.pipe(obj);
            }
            return obj;
        };
    };

    var Pipeline = function (array) {
        var ops = [];

        this.add = function (op) {
            ops.push(op);

            if (ops.length > 1) {
                var prev = ops[ops.length - 2];
                op.prev = prev;
                prev.next = op;
            }
        };

        this.next = function () {
            return ops[ops.length - 1].advance();
        };

        // default op just iterates over original array
        this.add(new Operation(function (arg) {
            return [arg];
        }));
        ops[0].buffer = array.slice();



        //
        // intermediate operations
        //

        this.filter = function (fn) {
            this.add(new Operation(function (arg) {
                var filtered = fn.call(ctx, arg);
                if (filtered) {
                    return [arg];
                } else {
                    return [];
                }
            }));
            return this;
        };

        this.map = function (fn) {
            this.add(new Operation(function (arg) {
                var transformed = fn.call(ctx, arg);
                return [transformed];
            }));
            return this;
        };

        this.flatMap = function (fn) {
            this.add(new Operation(function (arg) {
                return fn.call(ctx, arg);
            }));
            return this;
        };


        //
        // terminal operations
        //

        this.toArray = function () {
            var current;
            var result = [];
            while ((current = this.next()) !== eop) {
                result.push(current);
            }
            return result;
        };

        this.findFirst = function () {
            // TODO test empty stream
            return this.next();
        };

        this.findLast = function () {
            // TODO test empty stream
            var current, last;
            while ((current = this.next()) !== eop) {
                last = current;
            }
            return last;
        };

        this.forEach = function (fn) {
            var current;
            while ((current = this.next()) !== eop) {
                fn.call(ctx, current);
            }
        };

        this.min = function () {
            var result = null;
            var current;
            while ((current = this.next()) !== eop) {
                if (result === null || current < result) {
                    result = current;
                }
            }
            return result;
        };

        this.max = function () {
            var result = null;
            var current;
            while ((current = this.next()) !== eop) {
                if (result === null || current > result) {
                    result = current;
                }
            }
            return result;
        };

        this.allMatch = function (fn) {
            var current;
            while ((current = this.next()) !== eop) {
                var match = fn.call(ctx, current);
                if (!match) {
                    return false;
                }
            }
            return true;
        };

        this.anyMatch = function (fn) {
            var current;
            while ((current = this.next()) !== eop) {
                var match = fn.call(ctx, current);
                if (match) {
                    return true;
                }
            }
            return false;
        };

        this.noneMatch = function (fn) {
            var current;
            while ((current = this.next()) !== eop) {
                var match = fn.call(ctx, current);
                if (match) {
                    return false;
                }
            }
            return true;
        };
    };

    window.Stream = function (array) {
        return new Pipeline(array);
    };

}(window));