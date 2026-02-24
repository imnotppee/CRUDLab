const express = require('express');
const router = express.Router();
const passport = require('passport');

function restInit(
    dbase, 
    readcfg, 
    createPassword,
)  {

  let cfg = readcfg(false)

  router.get('/getConfig', function(req, res) {    
    // console.log('/getConfig ->', req.body);
    cfg = readcfg(false)
    return res.json(cfg);
  });

  router.post('/createDocument', passport.authenticate('jwt', { session: false }), function(req, res) {
    (async () => {

      console.log('/createDocument ->', req.body);

      // Password hashing disabled to allow plain-text updates.

      const userId = req.user ? req.user._id : 'unknown';

      dbase.createDocument({
        collection: req.body.collection,
        data: JSON.stringify(req.body.data),
        userId: userId,
      }, (err, resp) => {

        console.log(err, resp)

        if (resp)  return res.json(JSON.parse(resp.data))
        else return res.json([])
        
      });  

    })()
  });

  router.post('/readDocument', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/readDocument ->', req.body);

    let populate = null
    if (req.body.populate) populate = JSON.stringify(req.body.populate)

    let select = null
    if (req.body.select) select = JSON.stringify(req.body.select)

    dbase.readDocument({
      collection: req.body.collection,
      query: JSON.stringify(req.body.query),
      populate: populate,
      select: select,
    }, (err, resp) => {      
      
      console.log(err, resp)

      if (resp)  return res.json(JSON.parse(resp.data))
      else return res.json([])

    });      

  });
    
  router.post('/updateDocument', passport.authenticate('jwt', { session: false }), function(req, res) {
      console.log('/updateDocument ->', req.body);

      const userId = req.user ? req.user._id : 'unknown';

      if (req.body.data && req.body.data.password === '') {
        delete req.body.data.password
      }

      dbase.updateDocument({
        collection: req.body.collection,
        query: JSON.stringify({ _id: req.body.data._id}),
        data: JSON.stringify(req.body.data),
        userId: userId,
      }, (err, resp) => {

      console.log(err, resp)

      if (resp)  return res.json(JSON.parse(resp.data))
      else return res.json([])

    });

  });

  router.post('/deleteDocument', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/deleteDocument ->', req.body);

    const userId = req.user ? req.user._id : 'unknown';

    dbase.deleteDocument({
      collection: req.body.collection,
      query: JSON.stringify(req.body.query),
      userId: userId,
    }, (err, resp) => {

      console.log(err, resp)

      if (resp)  return res.json(JSON.parse(resp.data))
      else return res.json([])

    });  

  });

  router.post('/dropDatabase', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/dropDatabase ->', req.body, );
    // await dropDatabase(req.body);
    dbase.dropDatabase(req.body, (err, resp) => {
      return res.json({ status: true });
    })
  });

  router.post('/dropCollection', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/dropCollection ->', req.body, );
    dbase.dropCollection(req.body, (err, resp) => {  // { baseName: temp[0].siteID, collection: 'devices' }
      return res.json({ status: true });
    });   
  });

}

module.exports = {
  restInit: restInit,
  router: router,
};
