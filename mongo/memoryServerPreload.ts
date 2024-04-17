import User from '../models/user'

async function preload (): Promise<void> {
  await User.create({
    username: 'demo-user',
    password: 'password'
  })
}

export default preload
