const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: String,
  userName: String,
  fullName: String,
  email: String,
  userLevel: String,
  userState: String,
  password: String,
  dateCreate: Date,
  dateExpire: Date,
})

const deviceTagSchema = new Schema({
  name: String,
  value: String,
  record: Boolean,
  sync: Boolean,
  api: Boolean,
  script: String,
  interval: { type: String, default: 'none' }, // ⭐ Default: 'none', values: '1m', '5m', '10m', '1h', 'none'
  lastScriptRun: Date, // ⭐ Track last execution for auto-run
  history: [{ // ⭐ เก็บประวัติค่าและเวลา
    value: Schema.Types.Mixed,
    timestamp: Date,
  }],
}, { _id: false })

const deviceSchema = new Schema({
  _id: String,
  deviceName: String,
  siteId: String,
  model: String,
  apiCode: String,
  lineId: String,
  note: String,
  tags: [deviceTagSchema],
  dateCreate: Date,
  dateUpdate: Date,
})

const logSchema = new Schema({
  _id: String,
  collectionName: String,
  operation: String,
  documentId: String,
  data: Schema.Types.Mixed,
  userId: String,
  timestamp: Date,
})

module.exports = {
  mongoose: mongoose,
  userSchema: userSchema,
  deviceSchema: deviceSchema,
  logSchema: logSchema,
}
