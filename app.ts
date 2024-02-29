// To successfully import a module: https://stackoverflow.com/questions/41292559/could-not-find-a-declaration-file-for-module-module-name-path-to-module-nam

import express, {
  type Express,
  type Request as Req,
  type Response as Res
} from 'express'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'

const app: Express = express()
const port: string | undefined = process.env.PORT

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', (req: Req, res: Res) => {
  res.send('Express + TypeScript Server')
})

if (port !== undefined) {
  app.listen(port, () => {
    console.log(`⚡️ server is running at http://localhost:${port}`)
  })
}
