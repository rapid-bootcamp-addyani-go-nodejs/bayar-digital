module.exports = (sequelize, Sequelize) => {
    const Transaksi = sequelize.define("transaksi", {
        idUser: {
            type: Sequelize.INTEGER,
        },
        idTarget: {
            type: Sequelize.INTEGER
        },
        nominalSaldo: {
            type: Sequelize.FLOAT
        },
        tanggal: {
            type: Sequelize.DATE
        },
        status: {
            type: Sequelize.STRING
        }
    });

    return Transaksi;
}