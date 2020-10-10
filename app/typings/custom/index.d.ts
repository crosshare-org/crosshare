declare module 'worker-loader?filename=static/[hash].worker.js!*' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
