import { Injectable } from '@nestjs/common';
import { Document, FilterQuery, Model } from 'mongoose';
import { AppError, AppErrorTypeEnum } from './../app-error';
import { DeepPartial } from './../types/deep-partial.type';

@Injectable()
export abstract class CRUDService<T extends Document> {
    private readonly modelName: string;

    constructor(
        private readonly model: Model<T>
    ) {
        for (const modelName of Object.keys(model.collection.conn.models)) {
            if (model.collection.conn.models[modelName] === this.model) {
                this.modelName = modelName;
                break;
            }
        }
    }

    async findOne(
        conditions: Partial<Record<keyof T, unknown>>,
        projection: string | Record<string, unknown> = {},
            options: Record<string, unknown> = {}
    ): Promise<T|null>
    {
        try {
            return await this.model.findOne(
                conditions as FilterQuery<T>,
                projection,
                options,
            );
        } catch (e) {
            console.log(e)
            throw new AppError(AppErrorTypeEnum.DB_CANNOT_READ)
        }
    }

    async getAllDocuments(): Promise<T[]> {
        try {
            return await this.model.find().exec()
        } catch (error: any) {
            console.log(error)
            throw new AppError(AppErrorTypeEnum.DB_CANNOT_READ, {
                errorMessage: error
            })
        }
    }

    async getDocumentsCount(): Promise<number> {
        try {
            return await this.model.countDocuments()
        } catch (error: any) {
            console.log(error)
            throw new AppError(AppErrorTypeEnum.DB_CANNOT_READ, {
                errorMessage: error
            })
        }
    }

    async getDocumentById(id: string): Promise<T> {
        try {
            const entity = await this.model.findById(id)
            if (!entity) {
                throw new AppError(AppErrorTypeEnum.DB_ENTITY_NOT_FOUND)
            }
            return entity
        } catch (error: any) {
            if (error?.name === 'CastError') {
                throw new AppError(AppErrorTypeEnum.INVALID_OBJECT_ID, {
                    errorMessage: error
                })
            } else if (error?.code === 11000) {
                throw new AppError(AppErrorTypeEnum.DUPLICATE_KEY, {
                    errorMessage: error
                })
            }
            throw error
        }
    }

    async createDocument(data: Omit<T, keyof Document>): Promise<T> {
        try {
            return await this.model.create(data)
        } catch (error: any) {
            if (error?.name === 'ValidationError') {
                throw new AppError(AppErrorTypeEnum.DB_CANNOT_CREATE, {
                    errorMessage: JSON.stringify(error.errors, null, 4)
                })
            }
            throw error
        }
    }

    async removeDocumentById(id: string): Promise<any> {
        try {
            return await this.model.findByIdAndDelete(id)
        } catch (error: any) {
            if (error?.name === 'ValidationError') {
                throw new AppError(AppErrorTypeEnum.DB_CANNOT_DELETE, {
                    errorMessage: Object.values(error.errors).join(' ')
                })
            }
            throw error
        }
    }

    async updateDocumentById(id: string, newData: DeepPartial<T>): Promise<T> {
        try {
            await this.model.findByIdAndUpdate(id, newData)
            return this.getDocumentById(id)
        } catch (error: any) {
            if (error?.name === 'ValidationError') {
                throw new AppError(AppErrorTypeEnum.DB_CANNOT_UPDATE, {
                    errorMessage: Object.values(error.errors).join(' ')
                })
            }
            throw error
        }
    }
}
