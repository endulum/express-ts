import User from '../models/user'

async function preload (): Promise<void> {
  await User.create({
    username: 'demo-user-1',
    password: 'password'
  })
}

export default preload
