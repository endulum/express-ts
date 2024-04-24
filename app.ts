// To successfully import a module: https://stackoverflow.com/questions/41292559/could-not-find-a-declaration-file-for-module-module-name-path-to-module-nam

import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'
import { errorHandler } from './middleware/errorHandler'
import router from './routes'

// FOR MEMORY SERVER
import init from './mongo/mongoConfigTesting'
void init(true)
// // FOR PROD SERVER
// import init from './mongo/mongoConfig'
// void init()

const app = express()

const port: string | undefined = process.env.PORT
if (port === undefined) throw new Error('Port is not defined.')

const secret: string | undefined = process.env.SECRET
if (secret === undefined) throw new Error('JWT secret is not defined.')

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// toggle this to simulate latency
// app.use((req, res, next) => setTimeout(next, 750))

app.use(router)

app.use(function (req, res, next) {
  res.sendStatus(404)
})

app.use(errorHandler)

app.listen(port, () => {
  console.log(`⚡️ server is running at http://localhost:${port}`)
})
