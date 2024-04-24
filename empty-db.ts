import mongoose from 'mongoose'
import User from './models/user'
import 'dotenv/config'

// empties prod database

const uri: string | undefined = process.env.CONNECTION

async function main (): Promise<void> {
  if (uri !== undefined) {
    console.log(`Connecting with URL "${uri}"`)
    const conn = await mongoose.connect(uri)
    console.log(`Connected to database "${conn.connection.name}"`)

    await User.deleteMany({})
    console.log('Deleted all users.')

    console.log('Nothing left to do, closing connection.')
    void mongoose.connection.close()
  }
}

main().catch((e) => console.error.bind(console, e))
