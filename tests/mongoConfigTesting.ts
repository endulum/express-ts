import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer

async function init (): Promise<void> {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  mongoose.connect(mongoUri).catch(e => { console.log(e) })

  mongoose.connection.on('error', (e) => {
    if (e.message.code === 'ETIMEOUT') {
      console.log(e)
      mongoose.connect(mongoUri).catch(e => { console.log(e) })
    }
    console.log(e)
  })
}

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
