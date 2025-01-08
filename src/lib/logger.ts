const logger = {
    log: (...args: any[]) => {
        if (__DEV__) {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        if (__DEV__) {
            console.error(...args);
        }
    },
    warn: (...args: any[]) => {
        if (__DEV__) {
            console.warn(...args);
        }
    }
};

export default logger;
