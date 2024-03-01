import request from 'supertest'
import app from './appTesting'
import './mongoConfigTesting'
import User, { type IUserDocument } from '../models/user'

const assertDefined = <T>(obj: T | null | undefined): T => {
  expect(obj).toBeDefined()
  return obj as T
}

// possibly redundant...
describe.skip('user schema ops', () => {
  let user: IUserDocument | null

  beforeAll(async () => {
    await User.create({ username: 'First User', password: 'Cool Password' })
  })

  afterAll(async () => {
    await User.deleteMany({})
  })

  test('user can be found by username', async () => {
    user = await User.findByNameOrId('First User')
    user = assertDefined(user)
  })

  test('user password is hashed and can be matched', async () => {
    user = assertDefined<IUserDocument>(user)
    const match = await user.checkPassword('Cool Password')
    expect(match).toBe(true)
  })

  test('can safely change user password', async () => {
    user = assertDefined<IUserDocument>(user)
    const newPassword = 'Even Cooler Password'
    user.password = newPassword
    await user.save()
    const match = await user.checkPassword(newPassword)
    expect(match).toBe(true)
  })
})

describe('user client ops', () => {
  let token: string

  describe('view a user profile', () => {
    let user: IUserDocument

    beforeAll(async () => {
      user = await User.create({ username: 'Some Guy', password: 'Some Password' })
    })

    afterAll(async () => {
      await User.deleteMany({})
    })

    test('GET /user/:id - 200 if user exists', async () => {
      const response = await request(app)
        .get(`/user/${user.username}`)
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ username: user.username })
    })

    test('GET /user/:id - 404 if user does not exist', async () => {
      const response = await request(app)
        .get('/user/Nonexistent Guy')
      expect(response.status).toBe(404)
    })
  })

  describe('create a user account', () => {
    beforeAll(async () => {
      await User.create({ username: 'Some Guy', password: 'Some Password' })
    })

    afterAll(async () => {
      await User.deleteMany({})
    })

    test('POST /signup - 422 if input errors (username taken)', async () => {
      const response = await request(app)
        .post('/signup')
        .type('form')
        .send({ username: 'Some Guy', password: 'Cool Password' })
      expect(response.status).toBe(422)
      expect(response.body.errors).toEqual([
        { path: 'username', value: 'Some Guy', msg: 'A user already exists with this username.' }
      ])
    })

    test('POST /signup - 200 if no input errors, and creates an account', async () => {
      const response = await request(app)
        .post('/signup')
        .type('form')
        .send({ username: 'New Guy', password: 'Cool Password' })
      expect(response.status).toBe(200)

      const users = await User.find({})
      expect(users.length).toBe(2)
    })
  })

  describe('log into a user account', () => {
    beforeAll(async () => {
      await User.create({ username: 'Some Guy', password: 'Some Password' })
    })

    test('POST /login - 422 if input errors (wrong password)', async () => {
      const response = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'Some Guy', password: 'Wrong Password' })
      expect(response.status).toBe(422)
      expect(response.body.errors).toEqual([
        { path: 'password', value: 'Wrong Password', msg: 'Incorrect username or password.' }
      ])
    })

    test('POST /login - 200 if no input errors, and sends a token', async () => {
      const response = await request(app)
        .post('/login')
        .type('form')
        .send({ username: 'Some Guy', password: 'Some Password' })
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      token = response.body.token
    })

    test('GET /login - 200 if valid token provided', async () => {
      const response = await request(app)
        .get('/login')
        .set({ Authorization: `Bearer ${token}` })
      expect(response.status).toBe(200)
    })
  })

  describe('change own user account details', () => {
    beforeAll(async () => {
      await User.create({ username: 'Some Other Guy', password: 'Some Password' })
    })

    afterAll(async () => {
      await User.deleteMany({})
    })

    test('POST /user/:id - 422 if input errors (new username taken)', async () => {
      const response = await request(app)
        .put('/user/Some Guy')
        .set({ Authorization: `Bearer ${token}` })
        .type('form')
        .send({ username: 'Some Other Guy' })
      expect(response.status).toBe(422)

      expect(response.body.errors).toEqual([
        { path: 'username', value: 'Some Other Guy', msg: 'A user already exists with this username.' }
      ])
    })

    test('POST /user/:id - 422 if input errors (new password provided, but wrong conf password)', async () => {
      const response = await request(app)
        .put('/user/Some Guy')
        .set({ Authorization: `Bearer ${token}` })
        .type('form')
        .send({ username: 'Some Guy', newPassword: 'Better Password' })
      expect(response.status).toBe(422)
      expect(response.body.errors).toEqual([
        { path: 'confirmPassword', value: '', msg: 'Please confirm your current password.' }
      ])
    })

    test('POST /user/:id - 200 and changes username', async () => {
      const response = await request(app)
        .put('/user/Some Guy')
        .set({ Authorization: `Bearer ${token}` })
        .type('form')
        .send({ username: 'Cool Guy' })
      expect(response.status).toBe(200)
      expect(response.body).not.toHaveProperty('errors')
      const thisUser = await User.findByNameOrId('Cool Guy')
      expect(thisUser).not.toBe(null)
    })

    test('POST /user/:id - 200 and changes password', async () => {
      const response = await request(app)
        .put('/user/Cool Guy')
        .set({ Authorization: `Bearer ${token}` })
        .type('form')
        .send({
          username: 'Cool Guy',
          newPassword: 'Cool Password',
          confirmPassword: 'Some Password'
        })
      expect(response.status).toBe(200)
      expect(response.body).not.toHaveProperty('errors')
      const thisUser = await User.findByNameOrId('Cool Guy')
      expect(thisUser).not.toBe(null)
      expect(await thisUser.checkPassword('Cool Password')).toBe(true)
    })
  })
})
