import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import preload from './memoryServerPreload'

let mongoServer: MongoMemoryServer

async function init (doPreload?: boolean): Promise<void> {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  mongoose.connect(mongoUri).catch(err => { console.error(err) })

  const db = mongoose.connection
  db.on('open', () => {
    if (process.env.JEST_WORKER_ID === undefined) {
      console.log('mongo memory server connected')
    }
    if (doPreload === true) {
      preload()
        .then(() => { console.log('memory preload complete') })
        .catch((err) => { console.error(err) })
    }
  })
  db.on('error', (err) => {
    if (err.message.code === 'ETIMEOUT') {
      console.error(err)
      mongoose.connect(mongoUri).catch(e => { console.error(e) })
    } else console.error(err)
  })
}

if (process.env.JEST_WORKER_ID !== undefined) {
  beforeAll(async () => {
    await init()
  })

  afterAll(async () => {
    if (mongoose.connection !== null) {
      await mongoose.connection.close()
    }

    if (mongoServer !== null) {
      await mongoServer.stop()
    }
  })
}

export default init
