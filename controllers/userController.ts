import { type RequestHandler } from 'express'
import asyncHandler from 'express-async-handler'
import { type ValidationChain, body, validationResult } from 'express-validator'
import User from '../models/user'

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

userController.doesUserExist = asyncHandler(async (req, res, next) => {
  const user = await User.findByNameOrId(req.params.id)
  if (user === null) res.status(404).send('User not found.')
  else {
    req.requestedUser = user
    next()
  }
})

userController.getUser = [
  userController.doesUserExist,
  asyncHandler(async (req, res) => {
    res.status(200).json({ username: req.requestedUser.username })
  })
]

const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 1 }).withMessage('Please input a username.').bail()
    .custom(async (value: string, { req }) => {
      const existingUser = await User.findByNameOrId(value)
      return existingUser !== null ? await Promise.reject(new Error()) : true
    }).withMessage('A user already exists with this username.').bail()
    // .isLength({ min: 2, max: 32 }).withMessage('Usernames must be between 2 and 32 characters long.').bail()
    // .matches(/^[a-z0-9-]$/).withMessage('Usernames must only have letters, numbers, and hyphens.')
    .escape(),

  body('password')
    .trim()
    .isLength({ min: 1 }).withMessage('Please input a password.').bail()
    .isLength({ min: 8 }).withMessage('Passwords must be at least 8 characters long.')
    .escape()
]

const loginValidation = [
  body('username')
    .isLength({ min: 1 }).withMessage('Please input a username.').bail()
    .escape(),

  sendErrorsIfAny,

  body('password')
    .isLength({ min: 1 }).withMessage('Please input a password.')
    .custom(async (value: string, { req }) => {
      const existingUser = await User.findByNameOrId(req.body.username as string)
      if (existingUser === null) return await Promise.reject(new Error())
      const match = await existingUser.checkPassword(value)
      return match ? true : await Promise.reject(new Error())
    }).withMessage('Incorrect username or password.')
    .escape()
]

userController.signUp = [
  ...signupValidation,
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
  ...loginValidation,
  sendErrorsIfAny,
  asyncHandler(async (req, res) => {
    res.sendStatus(200)
  })
]

// changing user detail
// usernames: same validation as signing up (usernames)
// new passwords: same validation as signing up (passwords)
// confirm passwords: same validation as logging in (passwords)
// - ONLY if new password is provided

export default userController
