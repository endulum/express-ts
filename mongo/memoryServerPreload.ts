import jsonwebtoken from 'jsonwebtoken'
import User from '../models/user'

async function preload (): Promise<void> {
  const user = await User.create({
    username: 'demo-user',
    password: 'password'
  })

  const token = jsonwebtoken.sign(
    { username: user.username, id: user.id }, 'secret'
  )

  console.log(`\nDemo user token is ${token}\n`)
}

export default preload
