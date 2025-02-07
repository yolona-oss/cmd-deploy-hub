import mongoose, { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export interface PlatformTraider {
    walletData: string;
    balance: number;
}

export type PlatformTraiderDocument = PlatformTraiderEntity & Document;

@Schema({
    toJSON: {
        virtuals: true
    }
})
export class PlatformTraiderEntity {
    @Prop({type: {
        publicKey: {
            type: String, required: true, unique: true
        },
        secretKey: {
            type: String, required: true, unique: true
        }
    }, required: true, unique: true})
    walletData: {
        publicKey: string,
        secretKey: string
    };

    @Prop({type: Number, required: true})
    balance: number;
}

export const PlatformTraiderSchema = SchemaFactory.createForClass(PlatformTraiderEntity);
