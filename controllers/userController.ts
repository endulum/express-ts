import { type RequestHandler } from 'express'
import jsonwebtoken from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import { type ValidationChain, body, validationResult } from 'express-validator'
import 'dotenv/config'
import User from '../models/user'

interface IJwtPayload extends jsonwebtoken.JwtPayload {
  id: string
}

const secret: string | undefined = process.env.SECRET

const sendErrorsIfAny = asyncHandler(async (req, res, next) => {
  const errorsArray = validationResult(req).array()
  if (errorsArray.length > 0) {
    res.status(422).json({
      errors: errorsArray.map((err) => {
        if (err.type === 'field') {
          return {
            path: err.path,
            value: err.value,
            msg: err.msg
          }
        } else return { msg: err.msg }
      })
    })
  } else next()
})

const userController: Record<string, RequestHandler | Array<RequestHandler | ValidationChain>> = {}

userController.authenticate = asyncHandler(async (req, res, next) => {
  const bearerHeader = req.headers.authorization
  const bearerToken = bearerHeader?.split(' ')[1]
  if (bearerToken === undefined) res.status(401).send('Please log in.')
  else {
    let decoded
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      decoded = jsonwebtoken.verify(bearerToken, secret!) as IJwtPayload
      const user = await User.findByNameOrId(decoded.id)
      if (user === null) res.status(404).send('The user this token belongs to could not be found.')
      else {
        req.authenticatedUser = user
        next()
      }
    } catch (err) {
      res.status(403).send('Token could not be verified.')
    }
  }
})

userController.doesUserExist = asyncHandler(async (req, res, next) => {
  const user = await User.findByNameOrId(req.params.id)
  if (user === null) res.status(404).send('User not found.')
  else {
    req.requestedUser = user
    next()
  }
})

userController.areYouThisUser = asyncHandler(async (req, res, next) => {
  if (req.requestedUser.id !== req.authenticatedUser.id) {
    res.status(403).send('You are not this user.')
  } else next()
})

userController.getUser = [
  userController.doesUserExist,
  asyncHandler(async (req, res) => {
    res.status(200).json({
      username: req.requestedUser.username,
      id: req.requestedUser.id
    })
  })
]

const usernameValidation = body('username')
  .trim()
  .isLength({ min: 1 }).withMessage('Please enter a username.').bail()
  .isLength({ min: 2, max: 32 }).withMessage('Username must be between 2 and 32 characters long.').bail()
  .matches(/^[a-z0-9-]+$/g).withMessage('Username must only consist of letters, numbers, and hyphens.').bail()
  .custom(async (value: string, { req }) => {
    const existingUser = await User.findByNameOrId(value)
    if (existingUser !== null) {
      if (
        req.authenticatedUser !== null &&
        req.authenticatedUser.id === existingUser.id
      ) { // only when logged in and choosing a new username
        return true
      } return await Promise.reject(new Error())
    } return true
  }).withMessage('A user already exists with this username.').bail()
  .escape()

userController.signUp = [
  usernameValidation,

  body('password')
    .trim()
    .isLength({ min: 1 }).withMessage('Please enter a password.').bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .escape(),

  sendErrorsIfAny,

  body('confirmPassword')
    .trim()
    .isLength({ min: 1 }).withMessage('Please confirm your password.').bail()
    .custom(async (value, { req }) => {
      return value === req.body.password ? true : await Promise.reject(new Error())
    }).withMessage('Both passwords do not match.')
    .escape(),

  sendErrorsIfAny,

  asyncHandler(async (req, res) => {
    await User.create({
      username: req.body.username,
      password: req.body.password
    })
    res.sendStatus(200)
  })
]

userController.logIn = [
  body('username')
    .isLength({ min: 1 }).withMessage('Please enter a username.').bail()
    .escape(),

  sendErrorsIfAny,

  body('password')
    .isLength({ min: 1 }).withMessage('Please enter a password.').bail()
    .custom(async (value: string, { req }) => {
      const existingUser = await User.findByNameOrId(req.body.username as string)
      if (existingUser === null) return await Promise.reject(new Error())
      req.loggingInUser = existingUser
      const match: boolean = await req.loggingInUser.checkPassword(value)
      return match ? true : await Promise.reject(new Error())
    }).withMessage('Incorrect username or password.')
    .escape(),

  sendErrorsIfAny,

  asyncHandler(async (req, res) => {
    const token = jsonwebtoken.sign(
      { username: req.loggingInUser.username, id: req.loggingInUser.id },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      secret!
    )
    res.status(200).json({ token })
  })
]

userController.editUser = [
  usernameValidation,

  body('newPassword')
    .trim()
    .custom(async value => {
      if (value.length > 0 && value.length < 8) return await Promise.reject(new Error())
      return true
    }).withMessage('New password must be 8 or more characters long.')
    .escape(),

  sendErrorsIfAny,

  body('confirmNewPassword')
    .trim()
    .custom(async (value, { req }) => {
      return (req.body.newPassword !== '' && value.length === 0) ? await Promise.reject(new Error()) : true
    }).withMessage('Please confirm your new password.').bail()
    .custom(async (value, { req }) => {
      return value === req.body.newPassword ? true : await Promise.reject(new Error())
    }).withMessage('Both passwords do not match.')
    .escape(),

  body('currentPassword')
    .trim()
    .custom(async (value, { req }) => {
      return (req.body.newPassword !== '' && value.length === 0) ? await Promise.reject(new Error()) : true
    }).withMessage('Please input your current password in order to use your new password.').bail()
    .custom(async (value, { req }) => {
      if (req.body.newPassword !== '') {
        const match: boolean = await req.authenticatedUser.checkPassword(value)
        return match ? true : await Promise.reject(new Error())
      }
    }).withMessage('Incorrect password.')
    .escape(),

  sendErrorsIfAny,

  asyncHandler(async (req, res) => {
    req.authenticatedUser.username = req.body.username
    if (req.body.newPassword !== '') req.authenticatedUser.password = req.body.newPassword
    await req.authenticatedUser.save()
    res.sendStatus(200)
  })
]

export default userController
