export { MongoConnect } from 'db/mongoose'
export { type IManager, type IFile, type IAccount } from 'db/schemes'

import mongoose, { Schema } from 'mongoose'
import { AccountSchema, FileSchema, IAccount, IFile, IManager, ManagerSchema } from 'db/schemes'
import { DbModelsEnum } from 'db/models-enum'

export const Manager = mongoose.model<IManager>(DbModelsEnum.Managers, ManagerSchema)
export const File = mongoose.model<IFile>(DbModelsEnum.Files, FileSchema)
export const Account = mongoose.model<IAccount>(DbModelsEnum.Accounts, AccountSchema)
export { FilesWrapper } from 'db/file-schema-wrapper'
