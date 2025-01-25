export interface IFactory<Product> {
    produce(): Product
}

export interface IAyncFactory<Product> {
    produce(): Promise<Product>
}
