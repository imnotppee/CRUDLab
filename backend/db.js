const {
  readcfg,
  createPassword,
} = require('./common')
const cfg = readcfg();

const os = require('os');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(
  "proto/db.proto",
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);
const dbaseproject = grpc.loadPackageDefinition(packageDefinition).dbaseproject;

const sch = {
  mongoose,
  userSchema,
  deviceSchema,
  logSchema,
} = require('./libs/schema');

const db = {
  MainBase: null,
}

/* 
  Connection setup function
*/

function baseConnect (name,) {
  return new Promise(resolve => {

    let dbaseURL = 'mongodb://127.0.0.1:27017/'
    if (cfg.dbaseURL) dbaseURL = cfg.dbaseURL

    const conn = mongoose.createConnection(dbaseURL+name, );

    // Wait for the connection to open (optional, as Mongoose buffers operations)
    conn.on('connected', () => {
        console.log('\x1b[33m%s\x1b[0m', 'Connect to ->', dbaseURL+name);
        db.MainBase = conn
        resolve(conn);
    });

    conn.on('disconnected', function() {
      console.log('\x1b[31m%s\x1b[0m', 'Disconnect from ->', dbaseURL+name);
      db.MainBase = null
      resolve(null)
    });

    // Handle connection errors
    conn.on('error', (err) => {
      // console.log('\x1b[31m%s\x1b[0m', 'Connection error:', err);
      console.log('- Mongodb error -', );
      db.MainBase = null
    });

  });  
}

/* 
  Log function
*/

async function createLog(collection, operation, documentId, data, userId = 'system') {
  const base = db.MainBase
  if (base && base.models['Log']) {
    try {
      const LogModel = base.models['Log']
      const logData = {
        _id: new mongoose.Types.ObjectId() + '',
        collectionName: collection,
        operation: operation,
        documentId: documentId,
        data: data,
        userId: userId,
        timestamp: new Date(),
      }
      await LogModel.insertOne(logData)
      console.log('Log created:', operation, collection, documentId, 'by', userId)
    } catch (error) {
      console.error('Error creating log:', error)
    }
  }
}

async function createDocument (call, cb) {

  console.log('createDocument ->', call.request.collection, );

  const obj = {
    collection: call.request.collection,
    query: call.request.query,
    data: JSON.stringify({})
  }

  const base = db.MainBase
  if (base)  {    

    const Model = base.models[call.request.collection]
    const data = JSON.parse(call.request.data)
    
    if (!data._id)   data._id = new mongoose.Types.ObjectId()+''
    
    // const model = new Model(data);
    // await model.save();
    // obj.data = JSON.stringify({ _id: data._id})
    // cb(null, obj);

    Model.insertOne(data).then(function (resp) { 
      // console.log(resp)
      if (resp)  {
        obj.data = JSON.stringify([resp])
        // Log the create operation
        const userId = call.request.userId || 'system'
        createLog(call.request.collection, 'CREATE', data._id, data, userId)
      }
      cb(null, obj)
    });  
    
  }
  else  {
    cb(null, obj);
  }
}

async function readDocument (call, cb) {
  
  console.log('readDocument ->', call.request.collection, call.request.query);

  const obj = {
    collection: call.request.collection,
    query: call.request.query,
    data: JSON.stringify([])
  }
 
  const base = db.MainBase
  if (base)  {    

    const Model = base.models[call.request.collection]
    const query = JSON.parse(call.request.query)

    let populate = null
    if (call.request.populate && call.request.populate != '')  {
      populate = JSON.parse(call.request.populate)
      populate.model = base.models.Model
    }

    let select = null
    if (call.request.select && call.request.select != '')  select = JSON.parse(call.request.select)

    if (Object.keys(query).length)  {      
      Model.findOne(query).populate(populate).select(select).then(function (resp) { 
        // console.log(resp)
        if (resp) {
          // ⭐ Debug: log tags with intervals when retrieving
          if (call.request.collection === 'Device' && resp.tags) {
            console.log('📖 Retrieved Device with tags:', resp.tags.map(t => ({ name: t.name, interval: t.interval })))
          }
          obj.data = JSON.stringify([resp])
        }
        cb(null, obj)
      });  
    }
    else  {
      Model.find(query).populate(populate).select(select).then(function (resp) { 
        // console.log(resp)
        if (resp) {
          // ⭐ Debug: log tags with intervals for all devices
          if (call.request.collection === 'Device') {
            resp.forEach((device, idx) => {
              if (device.tags) {
                console.log(`📖 Device ${idx} (${device._id}) tags:`, device.tags.map(t => ({ name: t.name, interval: t.interval })))
              }
            })
          }
          obj.data = JSON.stringify(resp)
        }
        cb(null, obj)
      });  
    }

  }
  else  {
    cb(null, obj)  
  }
}

async function updateDocument (call, cb) {

  console.log('updateDocument ->', call.request.collection, call.request.query);

  const obj = {
    collection: call.request.collection,
    query: call.request.query,
    data: JSON.stringify({})
  }

  const base = db.MainBase
  if (base)  {    

    const Model = base.models[call.request.collection]
    const query = JSON.parse(call.request.query)
    let data = JSON.parse(call.request.data)

    if (call.request.collection === 'Device' && Array.isArray(data.tags)) {
      const validIntervals = ['none', '1m', '5m', '10m', '1h']
      data.tags = data.tags.map((tag) => {
        const interval = validIntervals.includes(tag.interval) ? tag.interval : 'none'
        return {
          ...tag,
          interval,
        }
      })
    }

    // ⭐ Debug: log tags with intervals
    if (call.request.collection === 'Device' && data.tags) {
      console.log('💾 Saving Device with tags:', data.tags.map(t => ({ name: t.name, interval: t.interval })))
    }

    Model.updateOne(query, { $set: data } ).then(function (resp) { 
      // console.log('updateDocument ->', resp,);
      if (resp)  {
        if (resp.nModified == 0 && resp.n == 0) {
          console.error('updateDocument -> error!');
        }
        obj.data = JSON.stringify(resp)
        // Log the update operation
        const userId = call.request.userId || 'system'
        createLog(call.request.collection, 'UPDATE', data._id, data, userId)
        cb(null, obj)
      }
      else  {
        cb(null, obj);
      }
    });

  }
  else  {
    cb(null, obj);
  }
}

async function deleteDocument (call, cb) {

  console.log('deleteDocument ->', call.request.collection, call.request.query,);

  const obj = {
    collection: call.request.collection,
    query: call.request.query,
    data: JSON.stringify({})
  }

  const base = db.MainBase
  if (base)  {    
    
    const Model = base.models[call.request.collection]
    const query = JSON.parse(call.request.query)

    Model.deleteOne(query).then(function (resp) { 
      // console.log(err, resp);
      if (resp)  {
        obj.data = JSON.stringify(resp)
        // Log the delete operation
        const userId = call.request.userId || 'system'
        createLog(call.request.collection, 'DELETE', query._id || 'unknown', query, userId)
      }
      cb(null, obj)
    });  

  }
  else  {
    cb(null, obj);
  }
}

async function dropDatabase (call, cb) {

  console.log('dropDatabase ->', call.request);

  if (db.MainBase)  {
    db.MainBase.dropDatabase(() => {
      db.MainBase.close(() => {
        cb(null, { status: true })
      });
    })
  }
  else  {
    cb(null, { status: false })
  }
}

async function dropCollection (call, cb) {

  console.log('dropCollection ->', call.request);

  if (db.MainBase)  {
    // console.log('dropCollection =>', call.request);
    db.MainBase.dropCollection(call.request.collection, (err, result) => {
      // console.log('dropCollection ->', err, result)
      cb(null, { status: true });
    });
  }  
  else  {
    cb(null, { status: false });
  }
}

async function dbIsReady(call, cb) {

  let state = false
  if (db.MainBase)  state = true

  console.log('dbIsReady ->', state);

  cb (null, { status: state })
}

function getServer() {
  var server = new grpc.Server({'grpc.max_send_message_length': 50*1024*1024, 'grpc.max_receive_message_length': 50*1024*1024});
  server.addService(dbaseproject.DbaseProject.service, {

    createDocument: createDocument,
    readDocument: readDocument,
    updateDocument: updateDocument,
    deleteDocument: deleteDocument,

    dropDatabase: dropDatabase,
    dropCollection: dropCollection,

    dbIsReady: dbIsReady,

  });
  return server;
}

async function main ()  {

  if (!db.MainBase)  {
    await baseConnect(cfg.baseName, );
  }
  
  if (db.MainBase)  {
    db.MainBase.model('User', sch.userSchema);
    db.MainBase.model('Device', sch.deviceSchema);
    db.MainBase.model('Log', sch.logSchema);
  }
  else  {
    main()
    return
  }

  const routeServer = getServer();  
  routeServer.bindAsync('0.0.0.0:'+cfg.dbasePort, grpc.ServerCredentials.createInsecure(), () => {
    // routeServer.start();
  });

  let dateTime = new Date();
  console.log("Dbase Server port ("+cfg.dbasePort+") start ->", dateTime.getDate()+'/'+(dateTime.getMonth()+1)+'/'+dateTime.getFullYear(), 
  dateTime.getHours()+':'+dateTime.getMinutes()+':'+dateTime.getSeconds());  

  let pwd = await createPassword('Default@1234');
  let user = null

  readDocument({ request:{
    collection: 'User',
    // query: JSON.stringify({ _id: 'admin'}),
    query: JSON.stringify({}),
  }}, (err, resp) => {

    if (resp)  {
      let temp = JSON.parse(resp.data)
      if (temp.length)  user = temp[0]
      console.log('Users ->', err, user)
    }

    if (!user)  {
      user = {
        _id: 'admin',
        userName: 'admin',
        fullName: 'admin',
        userLevel: 'admin',
        userState: 'enable',
        email: 'admin@gmail.com',
        password: pwd,
        dateCreate: new Date()+'',
        dateExpire: '',
      }
      createDocument({ request: {
        collection: 'User',
        data: JSON.stringify(user),
      }}, (err, resp) => {
        if (resp)  {
          const status = JSON.parse(resp.data)
          console.log('Create ->', status)
        }
      })
    }

  });          

/*     readDocument({ request:{
      collection: 'User',
      // query: JSON.stringify({ _id: 'admin'}),
      query: JSON.stringify({}),
    }}, (err, resp) => {

      if (resp)  {
        user = JSON.parse(resp.data)
        console.log('Users ->', err, user)
      }
     
      if (user)  {

        user.password = pwd

        updateDocument({ request: { 
          collection: 'User',
          query: JSON.stringify({ _id: 'admin' }),
          data: JSON.stringify(user),
        }}, (err, resp) => {

          if (resp)  {
            const status = JSON.parse(resp.data)
            console.log('Update ->', status)
          }

          deleteDocument({ request:{
            collection: 'User',
            query: JSON.stringify({ _id: 'admin' }),
          }}, (err, resp) => {

            if (resp)  {
              const status = JSON.parse(resp.data)
              console.log('Delete ->', status)
            }

            user = {
              _id: 'admin',
              userName: 'admin',
              fullName: 'admin',
              userLevel: 'admin',
              userState: 'enable',
              email: 'admin@gmail.com',
              password: pwd,
              dateCreate: new Date()+'',
              dateExpire: '',
            }
            createDocument({ request: {
              collection: 'User',
              data: JSON.stringify(user),
            }}, (err, resp) => {
              if (resp)  {
                const status = JSON.parse(resp.data)
                console.log('Create ->', status)
              }
            })

          });          

        })

      }     

    }); */

}

if (require.main === module) {
  main();
}

