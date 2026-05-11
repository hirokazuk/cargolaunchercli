//process.env.BINARY_NAMEが設定されていない場合はエラーを投げる
if (!process.env.BINARY_NAME) {
  throw new Error("BINARY_NAME is not set. Please set the BINARY_NAME in the .env file.");
}
const BINARY_NAME = process.env.BINARY_NAME;

export { BINARY_NAME };