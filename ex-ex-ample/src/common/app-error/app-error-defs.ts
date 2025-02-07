import { HttpStatus } from '@nestjs/common';
import { AppErrorTypeEnum } from './enums/app-error-type.enum';
import { IErrorMessage } from './interfaces/ierror-message.interface';

export const ErrorsDefenition: Record<AppErrorTypeEnum, IErrorMessage> = {
    [AppErrorTypeEnum.BAD_REQUEST]: {
        type: AppErrorTypeEnum.BAD_REQUEST,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Bad Request',
        userMessage: 'Bad Request'
    },
    [AppErrorTypeEnum.DB_ENTITY_EXISTS]: {
        type: AppErrorTypeEnum.DB_ENTITY_EXISTS,
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        errorMessage: 'Entity exists',
        userMessage: 'Entity exists'
    },
    [AppErrorTypeEnum.DB_CANNOT_READ]: {
        type: AppErrorTypeEnum.DB_CANNOT_READ,
        httpStatus: HttpStatus.NOT_FOUND,
        errorMessage: 'Cannot read entity.',
        userMessage: 'Cannot read entity.'
    },
    [AppErrorTypeEnum.DB_ENTITY_NOT_FOUND]: {
        type: AppErrorTypeEnum.DB_ENTITY_NOT_FOUND,
        httpStatus: HttpStatus.NOT_FOUND,
        errorMessage: 'Entity not found',
        userMessage: 'Unable to find the entity with the provided information.'
    },
    [AppErrorTypeEnum.DB_CANNOT_UPDATE]: {
        type: AppErrorTypeEnum.DB_CANNOT_UPDATE,
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        errorMessage: 'Cannot update selected entity.',
        userMessage: 'Cannot update selected entity.'
    },
    [AppErrorTypeEnum.DB_NOTHING_TO_UPDATE]: {
        type: AppErrorTypeEnum.DB_NOTHING_TO_UPDATE,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Nothing to update.',
        userMessage: 'Nothing to update, enter different data.'
    },
    [AppErrorTypeEnum.DB_CANNOT_CREATE]: {
        type: AppErrorTypeEnum.DB_CANNOT_CREATE,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Entity cannot to be created.',
        userMessage: 'Entity cannot to be created.'
    },
    [AppErrorTypeEnum.INVALID_CREDENTIALS_EXCEPTION]: {
        type: AppErrorTypeEnum.INVALID_CREDENTIALS_EXCEPTION,
        httpStatus: HttpStatus.NOT_ACCEPTABLE,
        errorMessage: 'Invalid credentials.',
        userMessage: 'Invalid credentials.'
    },
    [AppErrorTypeEnum.INVALID_OBJECT_ID]: {
        type: AppErrorTypeEnum.INVALID_OBJECT_ID,
        httpStatus: HttpStatus.NOT_ACCEPTABLE,
        errorMessage: 'Invalid ObjectId passed.',
        userMessage: 'Invalid ObjectId passed.'
    },
    [AppErrorTypeEnum.CANNOT_UPLOAD_IMAGE]: {
        type: AppErrorTypeEnum.CANNOT_UPLOAD_IMAGE,
        httpStatus: HttpStatus.BAD_REQUEST, // TODO change
        errorMessage: 'Cannot upload image.',
        userMessage: 'Cannot upload image.'
    },
    [AppErrorTypeEnum.INVALID_RANGE]: {
        type: AppErrorTypeEnum.INVALID_RANGE,
        httpStatus: HttpStatus.BAD_REQUEST, // TODO change
        errorMessage: 'Not in ranger.',
        userMessage: 'Selected range is invalid.'
    },
    [AppErrorTypeEnum.DB_INCORRECT_MODEL]: {
        type: AppErrorTypeEnum.DB_INCORRECT_MODEL,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Incorrenct db model passed.',
        userMessage: 'Cannot interact with database.'
    },
    [AppErrorTypeEnum.IMAGE_NOT_UPLOADED]: {
        type: AppErrorTypeEnum.IMAGE_NOT_UPLOADED,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Image not uploaded. Cannot proceed.',
        userMessage: 'Image not uploaded. Cannot proceed.'
    },
    [AppErrorTypeEnum.DB_CANNOT_DELETE]: {
        type: AppErrorTypeEnum.DB_CANNOT_DELETE,
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        errorMessage: 'Cannot delete selected entity.',
        userMessage: 'Cannot delete selected entity.'
    },
    [AppErrorTypeEnum.DUPLICATE_KEY]: {
        type: AppErrorTypeEnum.DUPLICATE_KEY,
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        errorMessage: 'Duplicate key.',
        userMessage: 'Duplicate key.'
    },
    [AppErrorTypeEnum.VALIDATION_ERROR]: {
        type: AppErrorTypeEnum.VALIDATION_ERROR,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Validation error.',
        userMessage: 'Validation error.'
    },
    [AppErrorTypeEnum.ROLE_ALREADY_PROVIDED]: {
        type: AppErrorTypeEnum.ROLE_ALREADY_PROVIDED,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Role already provided.',
        userMessage: 'Role already provided.'
    },
    [AppErrorTypeEnum.INSUFFICIENT_USER_PASSWORD_LENGTH]: {
        type: AppErrorTypeEnum.INSUFFICIENT_USER_PASSWORD_LENGTH,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Insufficient user password length.',
        userMessage: 'Insufficient user password length.'
    },
    [AppErrorTypeEnum.ROLE_NOT_PROVIDED]: {
        type: AppErrorTypeEnum.ROLE_NOT_PROVIDED,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Role not provided.',
        userMessage: 'Role not provided.'
    },
    [AppErrorTypeEnum.CLOUDINARY_ERROR]: {
        type: AppErrorTypeEnum.CLOUDINARY_ERROR,
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        errorMessage: 'Cloudinary error.',
        userMessage: 'Cloudinary error.'
    },
    [AppErrorTypeEnum.NO_PAYLOAD_PROVIDED]: {
        type: AppErrorTypeEnum.NO_PAYLOAD_PROVIDED,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'No payload provided.',
        userMessage: 'No payload provided.'
    },
    [AppErrorTypeEnum.INSUFFICIENT_USER_PASSWORD_ENTROPY]: {
        type: AppErrorTypeEnum.INSUFFICIENT_USER_PASSWORD_ENTROPY,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Insufficient user password entropy.',
        userMessage: 'Insufficient user password entropy.'
    },
    [AppErrorTypeEnum.INVALID_ORDER_STATUS]: {
        type: AppErrorTypeEnum.INVALID_ORDER_STATUS,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Invalid order status.',
        userMessage: 'Invalid order status.'
    },
    [AppErrorTypeEnum.INVALID_DATA]: {
        type: AppErrorTypeEnum.INVALID_DATA,
        httpStatus: HttpStatus.BAD_REQUEST,
        errorMessage: 'Invalid data.',
        userMessage: 'Invalid data.'
    }
}
