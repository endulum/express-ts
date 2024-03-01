import express from 'express'
import asyncHandler from 'express-async-handler'
import userController from '../controllers/userController'

const router = express.Router()

router.route('/user/:id')
  .get(userController.getUser)
  .put(
    userController.authenticate,
    userController.doesUserExist,
    userController.areYouThisUser,
    userController.editUser
  )

router.route('/signup')
  .post(userController.signUp)

router.route('/login')
  .get(userController.authenticate, asyncHandler(async (req, res, next) => {
    res.status(200).json({
      username: req.authenticatedUser.username,
      id: req.authenticatedUser.id
    })
  }))
  .post(userController.logIn)

export default router
