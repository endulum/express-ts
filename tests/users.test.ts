import request, { type Response } from 'supertest'
import app from './appTesting'
import './mongoConfigTesting'
import User, { type IUserDocument } from '../models/user'

const assertDefined = <T>(obj: T | null | undefined): T => {
  expect(obj).toBeDefined()
  return obj as T
}

const reqShort = async (
  url: string,
  method?: string | null,
  token?: string | null,
  form?: Record<string, string> | null
): Promise<Response> => {
  switch (method) {
    case 'post': return await request(app)
      .post(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
      .type('form').send(form ?? {})
    case 'put': return await request(app)
      .put(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
      .type('form').send(form ?? {})
    case 'delete': return await request(app)
      .delete(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
    default: return await request(app)
      .get(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
  }
}

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
    // const user = await User.findByNameOrId('demo-user-1')
    // console.log(user)
  })

  // test('does not explode', () => {
  //   expect(2).toBe(2)
  // })

  describe('auth', () => {
    const correctDetails = { username: 'demo-user-2', password: 'password' }

    describe('sign up for an account', () => {
      test('POST /signup - 422 if input error (username)', async () => {
        await Promise.all(usernameErrors.map(async usernameError => {
          const response = await reqShort('/signup', 'post', null, {
            ...correctDetails, username: usernameError.value
          })
          expect(response.status).toBe(422)
          expect(response.body.errors).toEqual([{ ...usernameError, path: 'username' }])
        }))
      })

      test('POST /signup - 422 if input error (password)', async () => {
        await Promise.all([
          { value: '', msg: 'Please enter a password.' },
          { value: 'a', msg: 'Password must be at least 8 characters long.' }
        ].map(async passwordError => {
          const response = await reqShort('/signup', 'post', null, {
            ...correctDetails, password: passwordError.value
          })
          expect(response.status).toBe(422)
          expect(response.body.errors).toEqual([{ ...passwordError, path: 'password' }])
        }))
      })

      test('POST /signup - 200 and new account created', async () => {
        const response = await reqShort('/signup', 'post', null, correctDetails)
        expect(response.status).toBe(200)
        const user = await User.findByNameOrId('demo-user-2')
        expect(user).toBeDefined()
      })
    })

    describe('log into an account', () => {
      test('POST /login - 422 if input error (username)', async () => {
        const response = await reqShort('/login', 'post', null, {
          ...correctDetails, username: ''
        })
        expect(response.status).toBe(422)
        expect(response.body.errors).toEqual([{
          path: 'username', value: '', msg: 'Please enter a username.'
        }])
      })

      test('POST /login - 422 if input error (password)', async () => {
        await Promise.all([
          { value: '', msg: 'Please enter a password.' },
          { value: 'blah', msg: 'Incorrect username or password.' }
        ].map(async passwordError => {
          const response = await reqShort('/login', 'post', null, {
            ...correctDetails, password: passwordError.value
          })
          expect(response.status).toBe(422)
          expect(response.body.errors).toEqual([{ ...passwordError, path: 'password' }])
        }))
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
      username: 'cool-username', newPassword: 'coolNewPassword', confirmPassword: 'password'
    }

    test('POST /user/:id - 404 if target user does not exist', async () => {
      const response = await reqShort('/user/demo-user-0', 'put', token, {})
      expect(response.status).toBe(404)
    })

    test('POST /user/:id - 403 if target user != authenticated user', async () => {
      const response = await reqShort('/user/demo-user-1', 'put', token, {})
      expect(response.status).toBe(403)
    })

    test('POST /user/:id - 422 if input error (username)', async () => {
      await Promise.all(usernameErrors.map(async usernameError => {
        const response = await reqShort('/user/demo-user-2', 'put', token, {
          username: usernameError.value
        })
        expect(response.status).toBe(422)
        expect(response.body.errors).toEqual([{ ...usernameError, path: 'username' }])
      }))
    })

    test('POST /user/:id - 422 if input error (new password)', async () => {
      const response = await reqShort('/user/demo-user-2', 'put', token, {
        ...correctDetails, newPassword: 'a'
      })
      expect(response.status).toBe(422)
      expect(response.body.errors).toEqual([{
        path: 'newPassword', value: 'a', msg: 'New password must be 8 or more characters long.'
      }])
    })

    test('POST /user/:id - 422 if input error (confirm password)', async () => {
      await Promise.all([
        { value: '', msg: 'Please confirm your current password.' },
        { value: 'blah', msg: 'Incorrect password.' }
      ].map(async passwordError => {
        const response = await reqShort('/user/demo-user-2', 'put', token, {
          ...correctDetails, confirmPassword: passwordError.value
        })
        expect(response.status).toBe(422)
        expect(response.body.errors).toEqual([{ ...passwordError, path: 'confirmPassword' }])
      }))
    })

    test('POST /user/:id - 200 and safely changes account details', async () => {
      const response = await reqShort('/user/demo-user-2', 'put', token, correctDetails)
      expect(response.status).toBe(200)
      let user = await User.findByNameOrId('cool-username')
      user = assertDefined<IUserDocument>(user)
      const match = await user.checkPassword(correctDetails.newPassword)
      expect(match).toBe(true)
    })
  })
})
