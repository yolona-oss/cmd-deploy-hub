import { AppErrorTypeEnum } from './enums/app-error-type.enum';
import { IErrorMessage } from './interfaces/ierror-message.interface';
import { ErrorsDefenition } from './app-error-defs';

interface AppErrorModificationOptions extends Pick<IErrorMessage, 'errorMessage' | 'userMessage'> {
    errorMessage: string
    userMessage: string
}

/***
 * @constructor Create AppError with passed error code otherwise create "Bad Request"
 */
export class AppError extends Error {
    public errorCode: AppErrorTypeEnum;
    public httpStatus: number;
    public errorMessage: string;
    public userMessage: string;

    constructor(
        errorCode: AppErrorTypeEnum = AppErrorTypeEnum.BAD_REQUEST,
        options?: Partial<AppErrorModificationOptions>
    ) {
        super();
        const error: IErrorMessage = ErrorsDefenition[errorCode];
        if (options) {
            // @ts-ignore // TODO
            Object.keys(options).forEach(key => error[key] = options[key])
        }
        if (!error) throw new Error('Unable to find message code error.');
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.httpStatus = error.httpStatus;
        this.errorCode = errorCode;
        this.errorMessage = error.errorMessage;
        this.userMessage = error.userMessage;
    }
}
