import { browser } from '$app/environment';
import { dev } from '$app/environment';

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
	import('winston').then((winston) => {
		const { format, transports } = winston;
		const { combine, timestamp, label, printf } = format;

		const myFormat = printf(({ level, message, label, timestamp }) => {
			return `\x1b[90m${timestamp}\x1b[0m [${label}] ${level}: ${message}`;
		});

		const shortTimestamp = timestamp({
			format: 'MMM DD, YY hh:mm:ss A'
		});

		const level = dev ? 'debug' : 'info';

		serverLogger = winston.createLogger({
			level: level,
			format: combine(label({ label: 'lilium' }), shortTimestamp, myFormat),
			transports: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			]
		});
	});
}

// Export the appropriate logger based on environment
export const logger = browser ? browserLogger : serverLogger;
