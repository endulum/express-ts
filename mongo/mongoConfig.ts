import mongoose from 'mongoose'
import 'dotenv/config'

const mongoUri: string | undefined = process.env.CONNECTION

async function init (): Promise<void> {
  if (mongoUri === undefined) throw new Error('MongoDB URI is not defined.')

  mongoose.connect(mongoUri).catch(err => { console.error(err) })

  const db = mongoose.connection
  db.on('open', console.log.bind(console, 'mongo server connected'))
  db.on('error', console.error.bind(console, 'mongo connection error'))
}

export default init
