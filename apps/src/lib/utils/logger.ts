import winston from 'winston';
import { format, transports } from 'winston';
import { dev } from '$app/environment';

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
	return `\x1b[90m${timestamp}\x1b[0m [${label}] ${level}: ${message}`;
});

const shortTimestamp = timestamp({
	format: 'MMM DD, YY hh:mm:ss A'
});

const level = dev ? 'debug' : 'info';

export const logger = winston.createLogger({
	level: level,
	format: combine(label({ label: 'lilium' }), shortTimestamp, myFormat),
	transports: [
		new transports.Console({
			format: format.combine(format.colorize(), myFormat)
		})
	]
});
