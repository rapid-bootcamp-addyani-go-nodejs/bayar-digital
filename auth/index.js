const auth = function(req, res, next){

    if(req.session && req.session.islogin){
        // sudah login
        return next();
    }else{
        // belum login
        return res.render('halamanunauthorized', { title: '401 Unauthorized' });
    }
}

module.exports = auth;