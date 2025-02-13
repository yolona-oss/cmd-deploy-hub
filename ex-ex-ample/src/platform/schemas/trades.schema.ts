import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { TradeSideType, ITradeTxType, ITradeTxResult } from '../types';

export type PlatformTradeDocument = PlatformTradeEntity & Document;

@Schema({
    toJSON: { virtuals: true }
})
export class PlatformTradeEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'PlatformTraider', required: true })
    initiator_id: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'PlatformTarget', required: true })
    target_id: mongoose.Schema.Types.ObjectId;

    @Prop({ type:
        {
            quantity: {
                type: Number, required: true
            },
            price: {
                type: Number, required: true
            }
        },
        required: true })
    value: ITradeTxType;

    @Prop({type: String, required: true})
    side: TradeSideType;

    @Prop({type: {
        signature: {
            type: String,
            required: false
        },
        error: {
            type: String,
            required: false
        },
        results: {
            type: String,
            required: false
        },
        success: {
            type: Boolean,
            required: true
        }
    }, required: true})
    result: ITradeTxResult<any>

    @Prop({type: Number, required: true})
    time: number
}

export const PlatformTradeSchema = SchemaFactory.createForClass(PlatformTradeEntity);
