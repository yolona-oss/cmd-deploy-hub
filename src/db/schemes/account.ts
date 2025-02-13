import mongoose, { Schema, Document, Model } from 'mongoose';
import { assignToCustomPath, extractValueFromObject } from 'utils/object';

export interface IModuledData {
    module: string
    comment: string
    data: any
}

export interface IAccount extends Document {
    modules: Array<IModuledData>
}

interface IAccountMethods {
    setModuleData(module_name: string, path: string, payload: any, comment?: string): Promise<IAccount>
    unsetModuleData(module_name: string, path?: string): Promise<IAccount>
    getModuleData<T>(module_name: string, path: string): Promise<T|null>
}

export type AccountModelType = Model<IAccount, {}, IAccountMethods>

const ModuleSchema: Schema<IModuledData> = new Schema({
    module: { type: String, required: true },
    comment: { type: String, required: true, default: '' },
    data: { type: Object, required: true },
});

export const AccountSchema: Schema<IAccount, {}, IAccountMethods> = new Schema(
    {
        modules: { type: [ModuleSchema], required: true, default: [] },
    },
    {
        methods: {
            async setModuleData(module_name: string, path: string, payload: any, comment = '') {
                if (comment === '') {
                    comment = module_name
                }
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment,
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }

                assignToCustomPath(desireModule.data, path, payload)
                await this.save()
                return this
            },
            async unsetModuleData(module_name: string, path: string) {
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment: module_name,
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }

                assignToCustomPath(desireModule, path, null)
                await this.save()
                return this
            },
            async getModuleData(module_name: string, path: string = ""): Promise<any|null> {
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment: '',
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }
                const data = extractValueFromObject(desireModule.data, path)
                return data === null ? null : { ...data }
            }
        }
    }
);

//AccountSchema.set('toJSON', {
//    virtuals: true,
//    transform: (doc, ret, options) => {
//        const { _id, modules } = { ...ret };
//        return { id: _id, modules };
//    }
//});
