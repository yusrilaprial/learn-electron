import pino from 'pino'

const log = pino({}, pino.destination('./app.log'))

export default log
