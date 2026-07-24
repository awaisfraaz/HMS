class ApiError extends Error {
    constructor(
        message = "something went wrong",
        statuscode = 500,
        error = [],
        stack = ""
    ) {
        super(message);
        this.message = message;
        this.statuscode = statuscode;
        this.error = error;
        this.data = null;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

module.exports = ApiError;