export type WriteableKey<T extends { [x: string]: any }, K extends string> = {
    [P in K]: T[P];
}
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
