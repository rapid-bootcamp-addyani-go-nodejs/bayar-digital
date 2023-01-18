var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs')

const auth = require('../auth')
const db = require('../models');
const { FLOAT } = require('sequelize');
const User = db.users;
const Transaksi = db.transaksis;
const Saldo = db.saldos;
const Op = db.Sequelize.Op;

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('loginform', { title: "Bayar Digital"});
})

router.get('/valid/:id', auth, function (req, res, next) {

  var id = parseInt(req.params.id);
  Saldo.findOne({
    include: [User],
    where: { iduser: id }
  })
    .then(data => {
      let user = data.user;
      res.render('index', {
        title: 'Selamat Datang ' + user.name,
        saldo: data
      })
    })
    .catch(err => {
      res.send(err)
    });
});

// REGISTER
// Create a user
// GET
router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Register' });
});

// POST
router.post('/register', function (req, res, next) {
  var hash = bcrypt.hashSync(req.body.password, 8);

  var user = {
    name: req.body.name,
    email: req.body.email,
    username: req.body.username,
    password: hash,
  }

  // Create user dan juga saldo dengan nominal 0
  Saldo.create({
    nominalSaldo: 0,
    user
  }, {
    include: [User]
  })
    .then(
      res.redirect('/login')
    )
    .catch(err => {
      res.redirect('/login')
    });
});

// API Register
// POST
router.post('/api/register', function (req, res, next) {
  var hash = bcrypt.hashSync(req.body.password, 8);

  var user = {
    name: req.body.name,
    email: req.body.email,
    username: req.body.username,
    password: hash,
  }
  // user cannot be same
  User.findOne({
    where: {
      [Op.or]: [
        { username: user.username },
      ]
    }
  })
    .then(data => {
      if (data) {
        res.json({
          info: "Username or Email already exist"
        })
      } else {
// Create user dan juga saldo dengan nominal 0
        Saldo.create({
          nominalSaldo: 0,
          user
        }, {
          include: [User]
        })
          .then(data => {
            res.json({
              info: "User Berhasil Ditambahkan"
            })
          })
          .catch(err => {
            res.json({
              info: "User Gagal Ditambahkan"
            })
          })
      }
    })
    .catch(err => {
      res.send(err)
    })
});

// API Get Saldo
// GET
router.get('/api/getsaldo/:username', function (req, res, next) {

  var username = req.params.username;
  User.findOne({
    where: { username: username },
    include: [Saldo]
  })
    .then(data => {
      res.json({
        nominal: data.saldo.nominalSaldo
      })
    })
    .catch(err => {
      res.send(err)
    });
});

// API Payment
router.post('/api/payment', function (req, res, next) {

  var userPengirim = req.body.userMe;
  var userPenerima = req.body.userTarget;
  var nominalTransfer = parseFloat(req.body.nominal);
  var tanggal = req.body.date;
 
  User.findOne({
    where: { username: userPengirim }
  })
    .then(pengirim => {
      var id = pengirim.id;
      User.findOne({
        where: { username: userPenerima }
      })
        .then(penerima => {
          var target = penerima.id;
          // Saldo.findAll({where: {userId: idUser}})
          Saldo.findByPk(id)
            .then(saldoLama => {
              var sisaSaldo = parseFloat(saldoLama.nominalSaldo - nominalTransfer);

              if (sisaSaldo >= 0) {
                var nominalSaldo = {
                  nominalSaldo: sisaSaldo
                }

                //Sudah Mengurangi Saldo Lama 
                Saldo.update(nominalSaldo, {
                  // where: {userId: idUser}
                  where: { id: id }
                })
                  .then(saldoBaru => {
                    var transaksi = {
                      idUser: id,
                      idTarget: target,
                      nominalSaldo: nominalTransfer,
                      tanggal: tanggal,
                      status: `transfer sukses : Berhasil Mengirim Dari ${pengirim.name} menuju ${penerima.name}`
                    }
                    //Membuat History Transaksi
                    Transaksi.create(transaksi)
                      .then(num => {

                        // NAMBAH SALDO TARGET
                        // Saldo.findAll({where: {userId: idUser}})
                        Saldo.findByPk(target)
                          .then(saldoLama => {
                            var sisaSaldo = parseFloat(saldoLama.nominalSaldo + nominalTransfer);
                            var nominalSaldo = {
                              nominalSaldo: sisaSaldo
                            }

                            //Sudah Mengurangi Saldo Lama 
                            Saldo.update(nominalSaldo, {
                              // where: {userId: idUser}
                              where: { id: target }
                            })
                              .then(saldoBaru => {
                                // res.json({
                                //   saldoSekarang: sisaSaldo,
                                //   // saldoSekarang: nominalSaldo,
                                //   status: num.status
                                // })
                                  // Untuk REST API
                                  res.json({
                                    info: "Transaksi Sukses",
                                  });
                                
                              })
                              .catch(err => {
                                res.send(err);
                              });

                          })
                          .catch(err => {
                            res.send(err);
                          });

                      })
                      .catch(err => {
                        res.send(err);
                      });

                  })
                  .catch(err => {
                    res.send(err);
                  });
              } else {
                res.json({
                  info: "Saldo Tidak Mencukupi",
                });
              }
            })
            .catch(err => {
              res.send(err);
            });
        })
        .catch(err => {
          res.send(err)
        });
    });
})

// Login
// GET
router.get('/login', function (req, res, next) {
  res.render('loginform', { title: 'Login' });
});

// POST
router.post('/login', function (req, res, next) {
  User.findOne({ where: { username: req.body.username } })
    .then(data => {
      if (data) {
        var loginValid = bcrypt.compareSync(req.body.password, data.password);
        if (loginValid) {
          // simpan session
          req.session.username = req.body.username;
          req.session.islogin = true;

          res.redirect('/valid/' + data.id);
        } else {
          res.redirect('/login')
        }
      } else {
        res.redirect('/login')
      }
    })
    .catch(err => {
      res.json({
        info: "Error",
        message: err.message
      });
    });

});

// Logout
router.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect('/login');
});

//Untuk Mendapatkan Form Top Up
router.get('/topup/:id', auth, function (req, res, next) {
  var id = parseInt(req.params.id);
  User.findOne({
    include: [Saldo],
    where: { id: id }
  })
    .then(topup => {
      if (topup) {
        //res.send(topup);
        res.render('topUp', {
          title: 'Silahkan Top Up',
          topup: topup,
          saldo: topup.saldo
        });
      } else {
        res.json({
          info: "Data Tidak Ditemukan"
        })
      }
    })
    .catch(err => {
      res.json({
        info: "Data Id Tidak Ada"
      })
    });
});

//Untuk Update Jumlah Saldo
router.post('/topup/:id', auth, function (req, res, next) {
  var id = parseInt(req.params.id);
  var topup = parseFloat(req.body.saldo);

  Saldo.findByPk(id)
    .then(saldoLama => {
      var topupSaldo = parseFloat(saldoLama.nominalSaldo + topup);
      var topUpInput = {
        nominalSaldo: topupSaldo
      }

      //Sudah Menambahkan Saldo Lama dan Jumlah TopUp
      Saldo.update(topUpInput, {
        where: { id: id }
      })
        .then(saldoBaru => {
          var transaksi = {
            idUser: id,
            idTarget: null,
            nominalSaldo: topup,
            tanggal: Date(),
            status: "Top Up"
          }
          //Membuat History Transaksi
          Transaksi.create(transaksi)
            .then(num => {
              res.redirect('/valid/' + num.idUser);
              //res.send(transaksi)
            })
            .catch(err => {
              res.send(err);
            });
        })
        .catch(err => {
          res.send(err);
        });
    })
    .catch(err => {
      res.send(err);
    });
});

// Get history transaksi
router.get('/history/:id', auth, function (req, res, next) {

  var id = req.params.id;

  Transaksi.findAll({
    where: {
      [Op.or]: [{ idUser: id }, { idTarget: id }]
    },
    include: [
      {
        // include array user pengirim, Foreign Key: idUser
        model: User,
        as: 'pengirim',
      },
      {
        // include array user penerima, Foreign Key: idTarget
        model: User,
        as: 'target'
      }
    ],
  })
    .then(transaksi => {
      res.render('historytransaksi', {
        title: 'History Transaksi',
        transaksis: transaksi,
        id: id,
      });
    })
    .catch(err => {
      res.json({
        info: "Error",
        message: err.message,
        transaksis: []
      });
    });
});

router.get('/transfer/:id', auth, function (req, res, next) {
  var id = parseInt(req.params.id);
  User.findOne({
    include: [Saldo],
    where: { id: id }
  })
    .then(transfer => {
      if (transfer) {
        res.render('transferSaldo', {
          title: 'Silahkan Transfer',
          transfer: transfer,
          saldo: transfer.saldo
        });
      } else {
        res.json({
          info: "Data Tidak Ditemukan"
        })
      }
    })
    .catch(err => {
      res.json({
        info: "Data Id Tidak Ada"
      })
    });
});

// Transfer
router.post('/transfer', auth, function (req, res, next) {
  // var id = parseInt(req.params.id);
  // var target = parseInt(req.params.target);
  var userPengirim = req.body.userMe;
  var userPenerima = req.body.userTarget;
  var nominalTransfer = parseFloat(req.body.nominal);

  if (!req.body.date) {
    var tanggal = Date();
  }
  else {
    // Untuk REST API
    var tanggal = req.body.date;
  }
 
  User.findOne({
    where: { username: userPengirim }
  })
    .then(pengirim => {
      var id = pengirim.id;
      User.findOne({
        where: { username: userPenerima }
      })
        .then(penerima => {
          var target = penerima.id;
          // Saldo.findAll({where: {userId: idUser}})
          Saldo.findByPk(id)
            .then(saldoLama => {
              var sisaSaldo = parseFloat(saldoLama.nominalSaldo - nominalTransfer);

              if (sisaSaldo >= 0) {
                var nominalSaldo = {
                  nominalSaldo: sisaSaldo
                }

                //Sudah Mengurangi Saldo Lama 
                Saldo.update(nominalSaldo, {
                  // where: {userId: idUser}
                  where: { id: id }
                })
                  .then(saldoBaru => {
                    var transaksi = {
                      idUser: id,
                      idTarget: target,
                      nominalSaldo: nominalTransfer,
                      tanggal: tanggal,
                      status: `transfer sukses : Berhasil Mengirim Dari ${pengirim.name} menuju ${penerima.name}`
                    }
                    //Membuat History Transaksi
                    Transaksi.create(transaksi)
                      .then(num => {

                        // NAMBAH SALDO TARGET
                        // Saldo.findAll({where: {userId: idUser}})
                        Saldo.findByPk(target)
                          .then(saldoLama => {
                            var sisaSaldo = parseFloat(saldoLama.nominalSaldo + nominalTransfer);
                            var nominalSaldo = {
                              nominalSaldo: sisaSaldo
                            }

                            //Sudah Mengurangi Saldo Lama 
                            Saldo.update(nominalSaldo, {
                              // where: {userId: idUser}
                              where: { id: target }
                            })
                              .then(saldoBaru => {
                                // res.json({
                                //   saldoSekarang: sisaSaldo,
                                //   // saldoSekarang: nominalSaldo,
                                //   status: num.status
                                // })
                                if (!req.body.date) {
                                  res.redirect('/valid/' + pengirim.id);
                                }
                                else {
                                  // Untuk REST API
                                  res.json({
                                    info: "Transaksi Sukses",
                                  });
                                }
                                
                              })
                              .catch(err => {
                                res.send(err);
                              });

                          })
                          .catch(err => {
                            res.send(err);
                          });

                      })
                      .catch(err => {
                        res.send(err);
                      });

                  })
                  .catch(err => {
                    res.send(err);
                  });
              } else {
                res.redirect('/valid/' + pengirim.id);
              }
            })
            .catch(err => {
              res.send(err);
            });
        })
        .catch(err => {
          res.send(err)
        });
    });
})

module.exports = router;