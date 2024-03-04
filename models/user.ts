import mongoose, { Schema, type Document, type Model, type CallbackError } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser {
  username: string
  password: string
}

export interface IUserDocument extends IUser, Document {
  setPassword: (password: string) => Promise<void>
  checkPassword: (password: string) => Promise<boolean>
}

interface IUserModel extends Model<IUserDocument> {
  findByNameOrId: (nameOrId: string) => Promise<IUserDocument>
}

const UserSchema = new Schema<IUserDocument>({
  username: { type: String, required: true, match: /^[a-z0-9-]+$/g },
  password: { type: String, required: true }
})

UserSchema.methods.checkPassword = async function (password: string) {
  const result = await bcrypt.compare(password, (this.password as string))
  return result
}

UserSchema.statics.findByNameOrId = function (nameOrId: string) {
  if (mongoose.isValidObjectId(nameOrId)) return this.findById(nameOrId)
  return this.findOne({ username: nameOrId })
}

// `findByNameOrId` SHOULD be a query helper but for whatever reason
// adding a query helper such as the below results in compilation fail:

// ts: Property 'whatever' does not exist on type '{}'
// UserSchema.query.whatever = function (name: string) {
//   return this.findOne({ username: name })
// }

// it took me hours to get this far until the linter went quiet
// so i might as well accept what i have...?

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) { next(); return }
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: unknown) {
    next((error as CallbackError))
  }
})

const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema)
export default User

// https://stackoverflow.com/a/73087568
