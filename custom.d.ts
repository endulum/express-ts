import { type IUserDocument } from './models/user'

declare global {
  namespace Express {
    interface Request {
      requestedUser: IUserDocument // for urls where id is in the request params
      loggingInUser: IUserDocument // for logging in
      authenticatedUser: IUserDocument // for protected routes
    }
  }
}
