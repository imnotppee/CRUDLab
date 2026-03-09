const express = require('express');
const router = express.Router();
const passport = require('passport');

// ⭐ รัน script แล้วคืนค่าผลลัพธ์
function runTagScript(script, value) {
  try {
    const fn = new Function('value', script)
    const result = fn(value)
    return result !== undefined ? result : value
  } catch (err) {
    console.error('Script error:', err.message)
    return value
  }
}

function restInit(dbase, readcfg, createPassword) {

  let cfg = readcfg(false)

  router.get('/getConfig', function(req, res) {
    cfg = readcfg(false)
    return res.json(cfg);
  });

  router.post('/createDocument', passport.authenticate('jwt', { session: false }), function(req, res) {
    (async () => {
      console.log('/createDocument ->', req.body);
      const userId = req.user ? req.user._id : 'unknown';
      dbase.createDocument({
        collection: req.body.collection,
        data: JSON.stringify(req.body.data),
        userId: userId,
      }, (err, resp) => {
        console.log(err, resp)
        if (err) {
          const message = resp && resp.data ? JSON.parse(resp.data).message : err.message
          return res.status(400).json({ error: true, message })
        }
        if (resp) return res.json(JSON.parse(resp.data))
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
      if (err) {
        const message = resp && resp.data ? JSON.parse(resp.data).message : err.message
        return res.status(400).json({ error: true, message })
      }
      if (resp) return res.json(JSON.parse(resp.data))
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
      query: JSON.stringify({ _id: req.body.data._id }),
      data: JSON.stringify(req.body.data),
      userId: userId,
    }, (err, resp) => {
      console.log(err, resp)
      if (err) {
        const message = resp && resp.data ? JSON.parse(resp.data).message : err.message
        return res.status(400).json({ error: true, message })
      }
      if (resp) return res.json(JSON.parse(resp.data))
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
      if (err) {
        const message = resp && resp.data ? JSON.parse(resp.data).message : err.message
        return res.status(400).json({ error: true, message })
      }
      if (resp) return res.json(JSON.parse(resp.data))
      else return res.json([])
    });
  });

  router.post('/dropDatabase', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/dropDatabase ->', req.body);
    dbase.dropDatabase(req.body, (err, resp) => {
      return res.json({ status: true });
    })
  });

  router.post('/dropCollection', passport.authenticate('jwt', { session: false }), function(req, res) {
    console.log('/dropCollection ->', req.body);
    dbase.dropCollection(req.body, (err, resp) => {
      return res.json({ status: true });
    });
  });


  // ====================================================
  // ⭐ AUTO SCRIPT ENGINE WITH INTERVAL (รันทุก 30 วินาที)
  // รันเฉพาะ tag ที่มี interval และถึงเวลาแล้ว
  // ====================================================

  function getIntervalMs(interval) {
    const intervals = { '1m': 60000, '5m': 300000, '10m': 600000, '1h': 3600000 }
    return intervals[interval] || 0
  }

  setInterval(() => {

    dbase.readDocument({
      collection: 'Device',
      query: JSON.stringify({}),
    }, (err, resp) => {

      if (!resp) return;
      let devices = JSON.parse(resp.data);
      if (!Array.isArray(devices)) return;

      devices.forEach(device => {
        if (!device.tags || device.tags.length === 0) return

        const now = new Date().getTime()
        let hasUpdates = false

        // ⭐ รันเฉพาะ tag ที่มี interval และถึงเวลา
        const updatedTags = device.tags.map(tag => {
          // ถ้าไม่มี script หรือไม่มี interval ให้คืนเดิม
          if (!tag.script || !tag.interval || tag.interval === 'none') {
            return tag
          }

          const intervalMs = getIntervalMs(tag.interval)
          if (intervalMs === 0) return tag

          const lastRun = tag.lastScriptRun ? new Date(tag.lastScriptRun).getTime() : 0
          const timeSinceLastRun = now - lastRun

          // ถ้าถึงเวลาแล้วให้รันสคริป
          if (timeSinceLastRun >= intervalMs) {
            const newValue = runTagScript(tag.script, tag.value)
            hasUpdates = true
            
            // ⭐ บันทึก history
            const history = tag.history || []
            history.push({
              value: newValue,
              timestamp: new Date(),
            })
            // เก็บแค่ 100 records ล่าสุด
            if (history.length > 100) {
              history.shift()
            }
            
            return {
              ...tag,
              value: newValue,
              lastScriptRun: new Date().toISOString(),
              history: history,
            }
          }

          return tag
        })

        // เฉพาะอัพเดตถ้ามี tag ที่รัน script
        if (hasUpdates) {
          const dataToUpdate = {
            ...device,
            tags: updatedTags,
            dateUpdate: new Date().toISOString(),
          }

          dbase.updateDocument({
            collection: 'Device',
            query: JSON.stringify({ _id: device._id }),
            data: JSON.stringify(dataToUpdate),
            userId: 'system-auto-script',
          }, (err2) => {
            if (err2) console.error('Auto script update error:', err2);
          });
        }

      });

    });

  }, 30000); // รันทุก 30 วินาที

}

module.exports = {
  restInit: restInit,
  router: router,
};
