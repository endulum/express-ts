import './mongoConfigTesting'
import { assertDefined, reqShort, ValidationLoopWrapper } from './helpers'
import User, { type IUserDocument } from '../models/user'

describe('user client ops', () => {
  let token: string

  const usernameErrors = [
    { value: '', msg: 'Please enter a username.' },
    { value: 'a', msg: 'Username must be between 2 and 32 characters long.' },
    { value: '&&&&', msg: 'Username must only consist of letters, numbers, and hyphens.' },
    { value: 'demo-user-1', msg: 'A user already exists with this username.' }
  ]

  beforeAll(async () => {
    await User.create({ username: 'demo-user-1', password: 'password' })
  })

  describe('auth', () => {
    const correctDetails = {
      username: 'demo-user-2',
      password: 'password',
      confirmPassword: 'password'
    }

    describe('sign up for an account', () => {
      let signupLoop: ValidationLoopWrapper
      beforeAll(() => {
        signupLoop = new ValidationLoopWrapper(correctDetails, '/signup', 'post', null)
      })

      test('POST /signup - 422 if input error (username)', async () => {
        await signupLoop.call('username', usernameErrors)
      })

      test('POST /signup - 422 if input error (password)', async () => {
        await signupLoop.call(
          'password',
          [
            { value: '', msg: 'Please enter a password.' },
            { value: 'a', msg: 'Password must be at least 8 characters long.' }
          ]
        )
      })

      test('POST /signup - 422 if input error (confirm password)', async () => {
        await signupLoop.call(
          'confirmPassword',
          [
            { value: '', msg: 'Please confirm your password.' },
            { value: 'a', msg: 'Both passwords do not match.' }
          ]
        )
      })

      test('POST /signup - 200 and new account created', async () => {
        const response = await reqShort('/signup', 'post', null, correctDetails)
        expect(response.status).toBe(200)
        const user = await User.findByNameOrId('demo-user-2')
        expect(user).toBeDefined()
      })
    })

    describe('log into an account', () => {
      let loginLoop: ValidationLoopWrapper
      beforeAll(() => {
        loginLoop = new ValidationLoopWrapper(correctDetails, '/login', 'post', null)
      })

      test('POST /login - 422 if input error (username)', async () => {
        await loginLoop.call(
          'username',
          [{ value: '', msg: 'Please enter a username.' }]
        )
      })

      test('POST /login - 422 if input error (password)', async () => {
        await loginLoop.call(
          'password',
          [
            { value: '', msg: 'Please enter a password.' },
            { value: 'blah', msg: 'Incorrect username or password.' }
          ]
        )
      })

      test('POST /login - 200 and token given', async () => {
        const response = await reqShort('/login', 'post', null, correctDetails)
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('token')
        token = response.body.token
      })
    })

    describe('access a protected endpoint', () => {
      test('GET /login - 401 if no token provided', async () => {
        const response = await reqShort('/login', 'get', null, {})
        expect(response.status).toBe(401)
      })

      test('GET /login - 403 if malformed token', async () => {
        const response = await reqShort('/login', 'get', 'blah', {})
        expect(response.status).toBe(403)
      })

      test('GET /login - 200 and returns user identification details', async () => {
        const response = await reqShort('/login', 'get', token, {})
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('username')
        expect(response.body).toHaveProperty('id')
      })
    })
  })

  describe('view a user profile', () => {
    test('GET /user/:id - 404 if user does not exist', async () => {
      const response = await reqShort('/user/demo-user-0', 'get')
      expect(response.status).toBe(404)
    })

    test('GET /user/:id - 200 and returns user details', async () => {
      const response = await reqShort('/user/demo-user-2', 'get')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('username')
    })
  })

  describe('change own user account details', () => {
    const correctDetails = {
      username: 'cool-username',
      newPassword: 'coolNewPassword',
      confirmNewPassword: 'coolNewPassword',
      currentPassword: 'password'
    }

    let editUserLoop: ValidationLoopWrapper
    beforeAll(() => {
      editUserLoop = new ValidationLoopWrapper(correctDetails, '/user/demo-user-2', 'put', token)
    })

    test('POST /user/:id - 404 if target user does not exist', async () => {
      const response = await reqShort('/user/demo-user-0', 'put', token, {})
      expect(response.status).toBe(404)
    })

    test('POST /user/:id - 403 if target user != authenticated user', async () => {
      const response = await reqShort('/user/demo-user-1', 'put', token, {})
      expect(response.status).toBe(403)
    })

    test('POST /user/:id - 422 if input error (username)', async () => {
      await editUserLoop.call('username', usernameErrors)
    })

    test('POST /user/:id - 422 if input error (new password)', async () => {
      await editUserLoop.call(
        'newPassword',
        [{ value: 'a', msg: 'New password must be 8 or more characters long.' }]
      )
    })

    test('POST /user/:id - 422 if input error (confirm new password)', async () => {
      await editUserLoop.call(
        'confirmNewPassword',
        [
          { value: '', msg: 'Please confirm your new password.' },
          { value: 'a', msg: 'Both passwords do not match.' }
        ]
      )
    })

    test('POST /user/:id - 422 if input error (current password)', async () => {
      await editUserLoop.call(
        'currentPassword',
        [
          { value: '', msg: 'Please input your current password in order to use your new password.' },
          { value: 'blah', msg: 'Incorrect password.' }
        ]
      )
    })

    test('POST /user/:id - 200 and changes username', async () => {
      const response = await reqShort('/user/demo-user-2', 'put', token, {
        username: 'cool-username'
      })
      expect(response.status).toBe(200)
      const user = await User.findByNameOrId('cool-username')
      expect(user).toBeDefined()
    })

    test('POST /user/:id - 200 and safely changes password', async () => {
      const response = await reqShort('/user/cool-username', 'put', token, correctDetails)
      expect(response.status).toBe(200)
      let user = await User.findByNameOrId('cool-username')
      user = assertDefined<IUserDocument>(user)
      const match = await user.checkPassword(correctDetails.newPassword)
      expect(match).toBe(true)
    })
  })
})
