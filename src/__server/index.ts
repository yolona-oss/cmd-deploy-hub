import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const port = 4010

    //app.setGlobalPrefix('')

    await app.listen(port,
                     () => {
                         console.log(`Server is running http://localhost:${port}`)
                     });
}

bootstrap();
