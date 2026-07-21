const generatehospitalcode = (city) => {
    const citycode = city.slice(0, 3)
    const randomnumber = Math.floor(Math.random() * 1000)
    const hospitalcode = citycode + randomnumber
    return hospitalcode
}

module.exports = generatehospitalcode