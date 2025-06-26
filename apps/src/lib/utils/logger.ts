import { browser, dev } from '$app/environment';

// Browser-safe logger
const browserLogger = {
	debug: (...args: any[]) => {
		if (dev) console.debug(...args);
	},
	info: (...args: any[]) => {
		if (dev) console.info(...args);
	},
	warn: (...args: any[]) => {
		console.warn(...args);
	},
	error: (...args: any[]) => {
		console.error(...args);
	}
};

// Server-side logger using Winston
let serverLogger = browserLogger; // Initialize with browser logger as fallback

if (!browser) {
	try {
		// Synchronous import for better reliability
		const winston = require('winston');
		const { format, transports } = winston;
		const { combine, timestamp, label, printf, errors } = format;

		const myFormat = printf(({ level, message, label, timestamp, stack }: any) => {
			// Include stack trace for errors
			const stackTrace = stack ? `\n${stack}` : '';
			return `\x1b[90m${timestamp}\x1b[0m [${label}] ${level}: ${message}${stackTrace}`;
		});

		const shortTimestamp = timestamp({
			format: 'MMM DD, YY hh:mm:ss A'
		});

		const level = dev ? 'debug' : 'info';

		serverLogger = winston.createLogger({
			level: level,
			format: combine(
				errors({ stack: true }), // Include stack traces
				label({ label: 'lilium' }),
				shortTimestamp,
				myFormat
			),
			transports: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			],
			// Handle uncaught exceptions
			exceptionHandlers: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			],
			// Handle unhandled promise rejections
			rejectionHandlers: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			]
		});
	} catch (error) {
		// Fallback to console if Winston fails to load
		console.error('Failed to initialize Winston logger:', error);
		serverLogger = {
			debug: console.debug,
			info: console.info,
			warn: console.warn,
			error: console.error
		};
	}
}

// Export the appropriate logger based on environment
export const logger = browser ? browserLogger : serverLogger;
