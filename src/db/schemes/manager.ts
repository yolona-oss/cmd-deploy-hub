import { DbModelsEnum } from 'db/models-enum';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IManager extends Document {
    userId: number; // telegram user id
    name: string,
    isAdmin?: boolean;
    online?: boolean;
    avatar: mongoose.Types.ObjectId;
    useGreeting?: boolean;
    account: mongoose.Types.ObjectId
}

export const ManagerSchema: Schema<IManager> = new Schema(
  {
        userId: { type: Number, required: true, unique: true },
        name: { type: String, required: true, unique: true },
        isAdmin: { type: Boolean, required: false, default: false },
        online: { type: Boolean, required: false, default: false },
        avatar: { type: mongoose.Schema.Types.ObjectId, ref: DbModelsEnum.Files },
        useGreeting: { type: Boolean, required: false, default: true },
        account: { type: mongoose.Schema.Types.ObjectId, ref: DbModelsEnum.Accounts }
  },
);
