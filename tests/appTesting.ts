import express from 'express'
import router from '../routes'
import { errorHandlerTesting } from '../middleware/errorHandler'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(router)
app.use(errorHandlerTesting)

export default app
