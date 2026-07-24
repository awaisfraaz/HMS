const crypto = require("crypto");

const generatehospitalcode = (city) => {
    const citycode = city.slice(0, 3).toUpperCase();
    const uniquePart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const hospitalcode = `${citycode}-${uniquePart}`;
    return hospitalcode;
}

module.exports = generatehospitalcode;