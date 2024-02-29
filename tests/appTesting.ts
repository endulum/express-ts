import express, { type Express } from 'express'
import router from '../routes'

const app: Express = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// app.get('/', (req: Req, res: Res) => {
//   res.send('Express + TypeScript Server')
// })

app.use(router)

export default app
