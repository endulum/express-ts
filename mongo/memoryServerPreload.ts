// import jsonwebtoken from 'jsonwebtoken'
import User from '../models/user'
import 'dotenv/config'

async function preload (): Promise<void> {
  const user = await User.create({
    username: 'demo-user',
    password: 'password'
  })

  console.log(`Demo user ${user.username} created.`)

  // toggle this and jwt import to print demo user token on run
  // const secret: string | undefined = process.env.SECRET
  // if (secret === undefined) throw new Error('JWT secret is not defined.')
  // const token = jsonwebtoken.sign(
  //   { username: user.username, id: user.id }, secret
  // )
  // console.log(`\nDemo user token is ${token}\n`)
}

export default preload
