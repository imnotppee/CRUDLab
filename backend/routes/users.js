const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');

const userInit = (dbase, privateKey) => {
    
  router.post('/login', (req, res) => {

    console.log('/login =>', req.body);

    const userName = req.body.userName;
    const password = req.body.password;

    dbase.readDocument({ 
      collection: 'User',
      query: JSON.stringify({ userName: userName, }),
    }, (err, resp) => {

      let user = { userName: '' }

      if (resp)  {
        let temp = JSON.parse(resp.data)
        if (temp.length)  user = temp[0]
      }
      else  {
        return res.json({
          text: 'Users database error!',
          token: null,
        })
      }
        
      if (user.userName == '')  {
        return res.json({
          text: 'Username not found!',
          token: null,
        })
      }

      console.log('User ->', userName, password, user);

      const isMatch = password === user.password

      if (isMatch) {

          const payload = {
            _id: user._id,
            userName: user.userName,
            userLevel: user.userLevel,
            userState: user.userState,
          }

          jwt.sign(payload, privateKey, {

            expiresIn: 60*60*24*1

          }, (err, token) => {
            (async () => {  

              if(err) {
                return res.json({
                  text: 'There is some error in token!',
                  token: null,
                })
              }
              else {

                let text = 'Login success!';
                if (user.userState == 'waiting')  text = 'Your account is not confirm!';
                return res.json({
                  text: text,
                  token: `Bearer ${token}`
                })  

              }
              
            })();   
          });
        }
      else {

        return res.json({
          text: 'Username or password incorrect!',
          token: null,
        })

      }
    })

  });

  router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {  
    
    console.log('/me ->', req.user.text);
    
    if (!req.user.text)  {
      return res.json({
        _id: req.user._id,
        displayName: req.user.userLevel,
        userName: req.user.userName,
        email: req.user.email,
        text: '',
      });
    }
    else  {
      return res.json({
        text: 'Token error!',
      });
    }

  });

}

module.exports = {
  userInit: userInit,
  router: router,
}
