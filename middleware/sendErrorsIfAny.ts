import asyncHandler from 'express-async-handler'
import { validationResult } from 'express-validator'

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

export default sendErrorsIfAny
