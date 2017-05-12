const log4js = require('log4js');

log4js.configure({
    appenders: [
        {
            type: 'stdout',
            category: 'console'
        }, {
            "type": "smtp",
            "recipients": "logfilerecipient@logging.com",
            "sendInterval": 5,
            "transport": "SMTP",
            "SMTP": {
                "host": "smtp.gmail.com",
                "secureConnection": true,
                "port": 465,
                "auth": {
                    "user": "someone@gmail",
                    "pass": "********************"
                },
                "debug": true
            },
            "category": "mailer"
        }
    ],
    categories: {
        default: {
            appenders: [
                'out', 'mailer'
            ],
            level: 'debug'
        }
    }
});

module.exports = log4js