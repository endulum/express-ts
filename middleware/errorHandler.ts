import { type ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (
  err: Error, req, res, next
) => {
  console.error(err.stack)
  if (
    'statusCode' in err &&
    typeof err.statusCode === 'number'
  ) {
    res.status(err.statusCode).send(err.message)
  } else {
    res.sendStatus(500)
  }
}

export const errorHandlerTesting: ErrorRequestHandler = (
  err: Error, req, res, next
) => {
  console.log(err)
  next(err)
}
