import express from 'express'
import userController from '../controllers/userController'

const router = express.Router()

router.route('/user/:id')
  .get(userController.getUser)

router.route('/signup')
  .post(userController.signUp)

router.route('/login')
  .post(userController.logIn)

export default router
