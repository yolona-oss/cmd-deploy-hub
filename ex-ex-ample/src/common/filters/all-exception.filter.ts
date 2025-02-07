import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AppError } from './../app-error'

@Catch(/*HttpException*/)
export class AllExeptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost): any {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        if (exception instanceof AppError) {
            return response.status(exception.httpStatus).json({
                errorCode: exception.errorCode,
                errorMsg: exception.errorMessage,
                usrMsg: exception.userMessage,
                httpCode: exception.httpStatus,
            });
        } else if (exception instanceof UnauthorizedException) {
            // TODO create render to login
            return response.status(HttpStatus.UNAUTHORIZED).json(exception.message);
        } else if (exception.status === 403) {
            return response.status(HttpStatus.FORBIDDEN).json(exception.message);
        } else {
            console.error(exception.message);
            console.error(exception.stack);
            return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
        }
    }
}
