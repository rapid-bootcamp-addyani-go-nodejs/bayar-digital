module.exports = (sequelize, Sequelize) => {
    const Saldo = sequelize.define("saldo", {
        nominalSaldo: {
            type: Sequelize.FLOAT
        },
        iduser: {
            type: Sequelize.INTEGER
        }
    });

    return Saldo;
}