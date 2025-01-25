import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount extends Document {
    data: string
    comment: string
}

export const AccountSchema: Schema<IAccount> = new Schema(
  {
    data: { type: String, required: true },
    comment: { type: String, required: true },
  },
);
