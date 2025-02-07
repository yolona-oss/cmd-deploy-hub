import mongoose, { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export interface ITarget {
    market_id: string;
    mint: string;
    symbol: string;
}

export interface PlatformTarget extends ITarget {
    supply: number;
    circulating: number;
}

export type PlatformTargetDocument = PlatformTargetEntity & Document;

@Schema({
    toJSON: {
        virtuals: true
    }
})
export class PlatformTargetEntity {
    @Prop({ type: String, required: true, unique: true })
    market_id: string;

    @Prop({ type: String, required: true, unique: true })
    symbol: string;

    @Prop({ type: String, required: true, unique: true })
    mint: string;

    @Prop({ type: Number, required: true })
    supply: number;

    @Prop({ type: Number, required: true })
    circulating: number;
}

export const PlatformTargetSchema = SchemaFactory.createForClass(PlatformTargetEntity);
