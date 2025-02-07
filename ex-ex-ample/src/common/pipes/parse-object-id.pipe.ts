import { PipeTransform, Injectable } from '@nestjs/common';
import { AppError, AppErrorTypeEnum } from './../app-error';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, string> {
    transform(value: any): string {
        const validObjectId = Types.ObjectId.isValid(value);

        if (!validObjectId) {
            throw new AppError(AppErrorTypeEnum.INVALID_OBJECT_ID)
        }

        //return Types.ObjectId.createFromHexString(value);
        return value
    }
}
