import { type IUserDocument } from './models/user'

declare global {
  namespace Express {
    interface Request {
      requestedUser: IUserDocument
    }
  }
}
