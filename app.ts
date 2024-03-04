// To successfully import a module: https://stackoverflow.com/questions/41292559/could-not-find-a-declaration-file-for-module-module-name-path-to-module-nam

import express, { type Express } from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'

import router from './routes'

const app: Express = express()
const port: string | undefined = process.env.PORT
const uri: string | undefined = process.env.CONNECTION

if (uri !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mongoose.connect(uri)
  const db = mongoose.connection
  db.on('open', console.log.bind(console, 'mongo server connected'))
  db.on('error', console.error.bind(console, 'mongo connection error'))
}

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(router)

if (port !== undefined) {
  app.listen(port, () => {
    console.log(`⚡️ server is running at http://localhost:${port}`)
  })
}
