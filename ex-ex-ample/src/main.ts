import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AllExeptionFilter } from './common/filters/all-exception.filter';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.getOrThrow('port');

    const config = new DocumentBuilder()
        .setTitle('111')
        .setDescription('222')
        .setVersion('1.0')
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);

    app.use(helmet())
    app.useGlobalFilters(new AllExeptionFilter())
    app.enableCors({
        origin: `http://127.0.0.1:${port}`,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    })

    await app.listen(port,
        () => {
            console.log(`Server is running http://localhost:${port}`)
        });
}

bootstrap();
