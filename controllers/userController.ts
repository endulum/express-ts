import { type RequestHandler } from 'express'
import jsonwebtoken, { type JwtPayload } from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import { type ValidationChain, body, validationResult } from 'express-validator'
import User from '../models/user'

interface IJwtPayload extends jsonwebtoken.JwtPayload {
  id: string
}

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
      decoded = jsonwebtoken.verify(bearerToken, 'secret') as IJwtPayload
      const user = await User.findByNameOrId(decoded.id)
      if (user === null) res.status(404).send('The user this token belongs to could not be found.')
      req.authenticatedUser = user
      next()
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

userController.getUser = [
  userController.doesUserExist,
  asyncHandler(async (req, res) => {
    res.status(200).json({ username: req.requestedUser.username })
  })
]

userController.signUp = [
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
    .isLength({ min: 1 }).withMessage('Please input a username.').bail()
    .escape(),

  sendErrorsIfAny,

  body('password')
    .isLength({ min: 1 }).withMessage('Please input a password.')
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
      'secret' // MAKE THIS ACTUALLY SECRET
    )
    res.status(200).json({ token })
  })
]

// changing user detail
// usernames: same validation as signing up (usernames)
// new passwords: same validation as signing up (passwords)
// confirm passwords: same validation as logging in (passwords)
// - ONLY if new password is provided

export default userController
