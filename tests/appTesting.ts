import express, { type Express, type ErrorRequestHandler } from 'express'
import router from '../routes'

const app: Express = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(router)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(err)
  next(err)
}

app.use(errorHandler)

export default app
