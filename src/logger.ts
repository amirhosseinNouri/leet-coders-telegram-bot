import logger, { LoggerOptions } from 'pino';

const options: LoggerOptions = Boolean(process.env.PINO_PRETTY_ENABLED)
  ? { transport: { target: 'pino-pretty' } }
  : {};

export default logger(options);
