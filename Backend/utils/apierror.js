class ApiError extends Error {
    constructor(
        message = "something went wrong",
        error = [],
        stack = "",
        statuscode
    ) {
        super(message);
        this.message = message;
        this.error = error;
        this.stack = stack;
        this.statuscode = statuscode;
        this.data = null;
        success = false
    }
}

module.exports = ApiError;