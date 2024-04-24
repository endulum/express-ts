import { type IUserDocument } from './models/user'

declare global {
  namespace Express {
    interface Request {
      authUser: IUserDocument // the authenticated user
      reqUser: IUserDocument // the user indicated by :user
      thisUser: IUserDocument // for validation chains involving a target user
    }
  }
}
